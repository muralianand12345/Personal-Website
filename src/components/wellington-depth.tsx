'use client';

import { useEffect, useRef } from 'react';

import { mountScene } from '@/lib/three-scene';

/**
 * Turns the Wellington lookout photo into a 2.5D scene: each pixel is shifted
 * by its depth, so the person and the landscape behind move against each other
 * as the mouse moves, as the banner scrolls, and — with no mouse — on a slow
 * idle drift.
 *
 * The depth map comes from scripts/make-depth.swift. This canvas sits on top
 * of the ordinary <Image>, fades in only once both textures have loaded, and
 * never mounts under prefers-reduced-motion — so without WebGL, before load,
 * or with motion reduced, the reader simply sees the photo.
 */

const IMAGE_SRC = '/images/profile/wellington-lookout.jpg';
const DEPTH_SRC = '/images/profile/wellington-lookout-depth.png';
const IMAGE_ASPECT = 1799 / 771;

/**
 * The depth that stays still. Nearer than this (you, the railing) moves one
 * way; further (the harbour, hills and sky) moves the other.
 */
const FOCUS = 0.3;

/**
 * Peak offsets, in fractions of the image. Displacement at the frame edge
 * pulls in pixels from outside the photo, so these are bounded by the margin
 * the banner's 1.06 zoom hides: 0.03 / 1.06 per side, divided by the largest
 * |depth - FOCUS| of 0.7, allows about 0.04 in total.
 */
const MAX_X = 0.03;
const MAX_Y = 0.018;
const SCROLL_Y = 0.016;

const vertexShader = /* glsl */ `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        // A full-screen quad: the camera is irrelevant to a flat photo.
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`;

const fragmentShader = /* glsl */ `
    uniform sampler2D uImage;
    uniform sampler2D uDepth;
    uniform vec2 uOffset;
    uniform vec2 uCover;
    uniform float uFocus;
    varying vec2 vUv;

    // Enough that one step moves under two pixels at the peak offset.
    const int STEPS = 20;

    void main() {
        // object-fit: cover, matching the <Image> underneath exactly.
        vec2 uv = (vUv - 0.5) * uCover + 0.5;

        // Parallax occlusion: march from the nearest possible depth toward the
        // farthest and stop at the first layer the photo's surface reaches. Where
        // the silhouette slides over the background both could land on this
        // pixel; taking the first hit means the nearer one wins, which is what
        // stops the edge from ghosting.
        float prevLayer = 1.0;
        float prevGap = -1.0; // a guaranteed miss, so an immediate hit needs no refinement
        float layer = 1.0;
        float gap = 0.0;

        for (int i = 0; i <= STEPS; i++) {
            layer = 1.0 - float(i) / float(STEPS);
            // Explicit LOD: implicit derivatives are undefined inside a loop that exits early.
            gap = textureLod(uDepth, uv + uOffset * (layer - uFocus), 0.0).r - layer;
            if (gap >= 0.0) break;
            prevLayer = layer;
            prevGap = gap;
        }

        // Place the hit between the last miss and the first hit.
        float hit = layer + (prevLayer - layer) * gap / (gap - prevGap);

        // Gradients from the undisplaced coordinate: the displaced one jumps at
        // the silhouette, which would pick a blurrier mip there and draw a seam.
        vec2 source = uv + uOffset * (hit - uFocus);
        gl_FragColor = vec4(textureGrad(uImage, source, dFdx(uv), dFdy(uv)).rgb, 1.0);
    }
`;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const WellingtonDepth = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // A static 2.5D frame is just the photo, so there is nothing to mount.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        return mountScene(
            container,
            ({ THREE, scene, cursor, size }) => {
                const uniforms = {
                    uImage: { value: null as import('three').Texture | null },
                    uDepth: { value: null as import('three').Texture | null },
                    uOffset: { value: new THREE.Vector2() },
                    uCover: { value: new THREE.Vector2(1, 1) },
                    uFocus: { value: FOCUS },
                };

                const material = new THREE.ShaderMaterial({
                    uniforms,
                    vertexShader,
                    fragmentShader,
                    depthTest: false,
                    depthWrite: false,
                });
                const geometry = new THREE.PlaneGeometry(2, 2);
                const photo = new THREE.Mesh(geometry, material);
                photo.frustumCulled = false;

                const fitCover = (width: number, height: number) => {
                    const aspect = width / height;
                    if (aspect > IMAGE_ASPECT) uniforms.uCover.value.set(1, IMAGE_ASPECT / aspect);
                    else uniforms.uCover.value.set(aspect / IMAGE_ASPECT, 1);
                };
                fitCover(size.width, size.height);

                // Textures stay in their stored colour space and the shader writes
                // them straight out, so the pixels match the <Image> exactly and
                // the crossfade between the two is invisible.
                const textures: import('three').Texture[] = [];
                let disposed = false;

                const loaded = (texture: import('three').Texture) => {
                    if (disposed) {
                        texture.dispose();
                        return;
                    }
                    textures.push(texture);
                    if (textures.length < 2) return;
                    scene.add(photo);
                    container.setAttribute('data-ready', '');
                };

                const loader = new THREE.TextureLoader();
                loader.load(IMAGE_SRC, (texture) => {
                    uniforms.uImage.value = texture;
                    loaded(texture);
                });
                loader.load(DEPTH_SRC, (texture) => {
                    // Marched per pixel at an explicit LOD 0, so mipmaps would
                    // never be read; skip building them.
                    texture.generateMipmaps = false;
                    texture.minFilter = THREE.LinearFilter;
                    uniforms.uDepth.value = texture;
                    loaded(texture);
                });

                let hover = 0;
                let offsetX = 0;
                let offsetY = 0;

                return {
                    update: (delta, elapsed) => {
                        hover += ((cursor.active ? 1 : 0) - hover) * Math.min(delta * 3, 1);

                        // +1 as the banner enters at the bottom, -1 as it leaves at the
                        // top, so scrolling alone walks the viewpoint across the scene.
                        const rect = container.getBoundingClientRect();
                        const halfView = window.innerHeight / 2;
                        const scroll = clamp(
                            (rect.top + rect.height / 2 - halfView) / (halfView + rect.height / 2),
                            -1,
                            1
                        );

                        // With no mouse over it (touch, or looking elsewhere) the scene
                        // drifts slowly, so it still reads as depth rather than a photo.
                        const idleX = Math.sin(elapsed * 0.35) * 0.5;
                        const idleY = Math.sin(elapsed * 0.27 + 1.3) * 0.4;

                        const targetX = (hover * cursor.x + (1 - hover) * idleX) * MAX_X;
                        const targetY =
                            (hover * cursor.y + (1 - hover) * idleY) * MAX_Y + scroll * SCROLL_Y;

                        const ease = Math.min(delta * 4, 1);
                        offsetX += (targetX - offsetX) * ease;
                        offsetY += (targetY - offsetY) * ease;
                        uniforms.uOffset.value.set(offsetX, offsetY);
                    },
                    resize: fitCover,
                    dispose: () => {
                        disposed = true;
                        geometry.dispose();
                        material.dispose();
                        textures.forEach((texture) => texture.dispose());
                    },
                };
            },
            // The photo is 1799px wide; rendering past ~1.5x the banner's CSS width
            // only upsamples it, at twice the fragment cost of 2x.
            { maxPixelRatio: 1.5 }
        );
    }, []);

    return (
        <div
            ref={containerRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 data-[ready]:opacity-100"
        />
    );
};

export default WellingtonDepth;
