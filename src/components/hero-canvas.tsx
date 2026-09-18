'use client';

import { useEffect, useRef } from 'react';

import { mountScene } from '@/lib/three-scene';

/**
 * Drifting point cloud behind the hero: nodes wander slowly and draw a line to
 * every neighbour within LINK_DISTANCE, so the mesh keeps rewiring itself.
 */

const LINK_DISTANCE = 1.9;
const MAX_LINKS = 900;
const CAMERA_Z = 8;
const FOV = 60;
const HALF_Z = 3;

const nodeCountFor = (width: number) => (width < 640 ? 70 : width < 1024 ? 110 : 150);

const HeroCanvas = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        return mountScene(
            container,
            ({ THREE, scene, camera, pointer, size }) => {
                const field = new THREE.Group();
                scene.add(field);

                // Wrap boundaries sit well outside the masked-visible area, so a node
                // teleporting across the field happens where it cannot be seen.
                const halfY = Math.tan((FOV / 2) * (Math.PI / 180)) * CAMERA_Z * 1.5;
                let halfX = halfY * (size.width / size.height) * 1.1;

                const count = nodeCountFor(window.innerWidth);
                const positions = new Float32Array(count * 3);
                const velocities = new Float32Array(count * 3);
                const nodeColors = new Float32Array(count * 3);
                const brightness = new Float32Array(count);

                for (let i = 0; i < count; i++) {
                    positions[i * 3] = (Math.random() * 2 - 1) * halfX;
                    positions[i * 3 + 1] = (Math.random() * 2 - 1) * halfY;
                    positions[i * 3 + 2] = (Math.random() * 2 - 1) * HALF_Z;

                    velocities[i * 3] = (Math.random() * 2 - 1) * 0.1;
                    velocities[i * 3 + 1] = (Math.random() * 2 - 1) * 0.08;
                    velocities[i * 3 + 2] = (Math.random() * 2 - 1) * 0.06;

                    const shade = 0.45 + Math.random() * 0.55;
                    brightness[i] = shade;
                    nodeColors[i * 3] = shade;
                    nodeColors[i * 3 + 1] = shade;
                    nodeColors[i * 3 + 2] = shade;
                }

                const nodeGeometry = new THREE.BufferGeometry();
                nodeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                nodeGeometry.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));
                const nodeMaterial = new THREE.PointsMaterial({
                    size: 0.045,
                    sizeAttenuation: true,
                    vertexColors: true,
                    transparent: true,
                    opacity: 0.9,
                    depthWrite: false,
                });
                field.add(new THREE.Points(nodeGeometry, nodeMaterial));

                const linkPositions = new Float32Array(MAX_LINKS * 6);
                const linkColors = new Float32Array(MAX_LINKS * 6);
                const linkGeometry = new THREE.BufferGeometry();
                const linkPositionAttribute = new THREE.BufferAttribute(linkPositions, 3);
                const linkColorAttribute = new THREE.BufferAttribute(linkColors, 3);
                linkPositionAttribute.setUsage(THREE.DynamicDrawUsage);
                linkColorAttribute.setUsage(THREE.DynamicDrawUsage);
                linkGeometry.setAttribute('position', linkPositionAttribute);
                linkGeometry.setAttribute('color', linkColorAttribute);
                const linkMaterial = new THREE.LineBasicMaterial({
                    vertexColors: true,
                    transparent: true,
                    opacity: 0.7,
                    depthWrite: false,
                });
                field.add(new THREE.LineSegments(linkGeometry, linkMaterial));

                const nodePositionAttribute = nodeGeometry.getAttribute('position');

                const rewire = () => {
                    let link = 0;

                    for (let i = 0; i < count && link < MAX_LINKS; i++) {
                        const xi = positions[i * 3];
                        const yi = positions[i * 3 + 1];
                        const zi = positions[i * 3 + 2];

                        for (let j = i + 1; j < count && link < MAX_LINKS; j++) {
                            const dx = xi - positions[j * 3];
                            const dy = yi - positions[j * 3 + 1];
                            const dz = zi - positions[j * 3 + 2];
                            const distanceSquared = dx * dx + dy * dy + dz * dz;
                            if (distanceSquared > LINK_DISTANCE * LINK_DISTANCE) continue;

                            const fade = 1 - Math.sqrt(distanceSquared) / LINK_DISTANCE;
                            const shade = fade * 0.55 * Math.min(brightness[i], brightness[j]);
                            const p = link * 6;

                            linkPositions[p] = xi;
                            linkPositions[p + 1] = yi;
                            linkPositions[p + 2] = zi;
                            linkPositions[p + 3] = positions[j * 3];
                            linkPositions[p + 4] = positions[j * 3 + 1];
                            linkPositions[p + 5] = positions[j * 3 + 2];

                            for (let k = 0; k < 6; k++) linkColors[p + k] = shade;

                            link++;
                        }
                    }

                    linkGeometry.setDrawRange(0, link * 2);
                    linkPositionAttribute.needsUpdate = true;
                    linkColorAttribute.needsUpdate = true;
                };

                const drift = (delta: number) => {
                    for (let i = 0; i < count; i++) {
                        const x = i * 3;
                        const y = x + 1;
                        const z = x + 2;

                        positions[x] += velocities[x] * delta;
                        positions[y] += velocities[y] * delta;
                        positions[z] += velocities[z] * delta;

                        if (positions[x] > halfX) positions[x] = -halfX;
                        else if (positions[x] < -halfX) positions[x] = halfX;
                        if (positions[y] > halfY) positions[y] = -halfY;
                        else if (positions[y] < -halfY) positions[y] = halfY;
                        if (positions[z] > HALF_Z) positions[z] = -HALF_Z;
                        else if (positions[z] < -HALF_Z) positions[z] = HALF_Z;
                    }
                    nodePositionAttribute.needsUpdate = true;
                };

                return {
                    update: (delta, elapsed) => {
                        drift(delta);
                        rewire();

                        // A rotation that accumulated would eventually turn the field
                        // edge-on, since the box is far wider than it is deep. Sway.
                        field.rotation.y = Math.sin(elapsed * 0.06) * 0.12;

                        camera.position.x = pointer.x * 0.8;
                        camera.position.y = -pointer.y * 0.5;
                        camera.lookAt(0, 0, 0);
                    },
                    resize: (width, height) => {
                        halfX = halfY * (width / height) * 1.1;
                    },
                    dispose: () => {
                        nodeGeometry.dispose();
                        nodeMaterial.dispose();
                        linkGeometry.dispose();
                        linkMaterial.dispose();
                    },
                };
            },
            { fov: FOV, cameraZ: CAMERA_Z }
        );
    }, []);

    return (
        <div
            ref={containerRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-75"
            style={{
                maskImage:
                    'radial-gradient(ellipse 80% 75% at 50% 45%, black 30%, transparent 75%)',
                WebkitMaskImage:
                    'radial-gradient(ellipse 80% 75% at 50% 45%, black 30%, transparent 75%)',
            }}
        />
    );
};

export default HeroCanvas;
