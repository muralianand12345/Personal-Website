'use client';

import { useEffect, useRef } from 'react';

import { mountScene } from '@/lib/three-scene';

/**
 * Slow wireframe globe behind the contact call to action, with a loose shell of
 * points orbiting it. Closes the page with the same monochrome vocabulary the
 * hero opens with, without repeating the drifting mesh.
 */

const RADIUS = 2.6;
const ORBIT_COUNT = 260;

const ContactCanvas = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        return mountScene(
            container,
            ({ THREE, scene, camera, pointer }) => {
                const globe = new THREE.Group();
                // A fixed lean, so the lat/long grid never reads as a flat bullseye.
                globe.rotation.z = 0.32;
                scene.add(globe);

                const sphere = new THREE.SphereGeometry(RADIUS, 28, 16);
                const wireframe = new THREE.WireframeGeometry(sphere);
                sphere.dispose();
                const wireMaterial = new THREE.LineBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.16,
                    depthWrite: false,
                });
                globe.add(new THREE.LineSegments(wireframe, wireMaterial));

                // Points scattered on a slightly larger shell, so they read as
                // orbiting the globe rather than sitting on its surface.
                const orbitPositions = new Float32Array(ORBIT_COUNT * 3);
                const orbitColors = new Float32Array(ORBIT_COUNT * 3);
                for (let i = 0; i < ORBIT_COUNT; i++) {
                    // Even distribution over a sphere; acos keeps the poles from clumping.
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(Math.random() * 2 - 1);
                    const r = RADIUS * (1.04 + Math.random() * 0.22);

                    orbitPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
                    orbitPositions[i * 3 + 1] = r * Math.cos(phi);
                    orbitPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

                    const shade = 0.4 + Math.random() * 0.6;
                    orbitColors[i * 3] = shade;
                    orbitColors[i * 3 + 1] = shade;
                    orbitColors[i * 3 + 2] = shade;
                }

                const orbitGeometry = new THREE.BufferGeometry();
                orbitGeometry.setAttribute(
                    'position',
                    new THREE.BufferAttribute(orbitPositions, 3)
                );
                orbitGeometry.setAttribute('color', new THREE.BufferAttribute(orbitColors, 3));
                const orbitMaterial = new THREE.PointsMaterial({
                    size: 0.04,
                    sizeAttenuation: true,
                    vertexColors: true,
                    transparent: true,
                    opacity: 0.85,
                    depthWrite: false,
                });
                const orbit = new THREE.Points(orbitGeometry, orbitMaterial);
                scene.add(orbit);
                orbit.rotation.z = -0.24;

                return {
                    update: (delta, elapsed) => {
                        globe.rotation.y += delta * 0.09;
                        orbit.rotation.y -= delta * 0.045;

                        // Breathe very slightly, so a still page is never fully static.
                        const breath = 1 + Math.sin(elapsed * 0.35) * 0.012;
                        globe.scale.setScalar(breath);

                        globe.rotation.x = pointer.y * 0.16;
                        orbit.rotation.x = pointer.y * 0.16;
                        camera.position.x = pointer.x * 0.5;
                        camera.lookAt(0, 0, 0);
                    },
                    dispose: () => {
                        wireframe.dispose();
                        wireMaterial.dispose();
                        orbitGeometry.dispose();
                        orbitMaterial.dispose();
                    },
                };
            },
            { fov: 55, cameraZ: 9 }
        );
    }, []);

    return (
        <div
            ref={containerRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-70"
            style={{
                maskImage:
                    'radial-gradient(ellipse 70% 80% at 50% 50%, black 25%, transparent 72%)',
                WebkitMaskImage:
                    'radial-gradient(ellipse 70% 80% at 50% 50%, black 25%, transparent 72%)',
            }}
        />
    );
};

export default ContactCanvas;
