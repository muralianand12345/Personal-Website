'use client';

import { useEffect, useRef } from 'react';

import { mountScene } from '@/lib/three-scene';

/**
 * Drifting point cloud behind the hero: nodes wander slowly and draw a line to
 * every neighbour within LINK_DISTANCE, so the mesh keeps rewiring itself.
 *
 * The mouse acts as a search query against it. The nodes nearest the cursor on
 * screen are retrieved — brightened, haloed and linked back to the cursor, the
 * closest match most strongly — the way a nearest-neighbour lookup ranks
 * results from a vector store. Nothing beyond the retrieval radius is returned,
 * so an empty patch of the field genuinely comes back with no results.
 */

const LINK_DISTANCE = 1.9;
const MAX_LINKS = 900;
const CAMERA_Z = 8;
const FOV = 60;
const HALF_Z = 3;

/** How many nodes a query retrieves at most. */
const QUERY_K = 6;
/** Retrieval radius as a fraction of the canvas height, so the expected number
 * of hits stays constant however tall the hero renders. */
const QUERY_RADIUS = 0.25;

const nodeCountFor = (width: number) => (width < 640 ? 70 : width < 1024 ? 110 : 150);

/** A soft round sprite, so enlarged points read as glows instead of squares. */
const createGlowTexture = (THREE: typeof import('three')) => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    if (context) {
        const half = size / 2;
        const gradient = context.createRadialGradient(half, half, 0, half, half, half);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.45)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};

const HeroCanvas = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        return mountScene(
            container,
            ({ THREE, scene, camera, pointer, cursor, size }) => {
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
                // How strongly each node is currently retrieved. Eased toward
                // `target`, so results fade in and out instead of popping.
                const glow = new Float32Array(count);
                const target = new Float32Array(count);
                // Where the query stood when each node was last retrieved. A result
                // that drops out keeps this anchor while it fades, so its link
                // dissolves where it was; re-anchoring to the live cursor instead
                // would stretch it back across the hero after any quick flick.
                const anchors = new Float32Array(count * 3);

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
                const nodeColorAttribute = new THREE.BufferAttribute(nodeColors, 3);
                nodeColorAttribute.setUsage(THREE.DynamicDrawUsage);
                nodeGeometry.setAttribute('color', nodeColorAttribute);
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

                // --- Query overlay -------------------------------------------------
                // Lives in world space rather than inside `field`, since its anchor
                // is the cursor, which does not sway with the field.
                const glowTexture = createGlowTexture(THREE);

                const resultLinkPositions = new Float32Array(count * 6);
                const resultLinkColors = new Float32Array(count * 6);
                const resultLinkGeometry = new THREE.BufferGeometry();
                const resultLinkPositionAttribute = new THREE.BufferAttribute(
                    resultLinkPositions,
                    3
                );
                const resultLinkColorAttribute = new THREE.BufferAttribute(resultLinkColors, 3);
                resultLinkPositionAttribute.setUsage(THREE.DynamicDrawUsage);
                resultLinkColorAttribute.setUsage(THREE.DynamicDrawUsage);
                resultLinkGeometry.setAttribute('position', resultLinkPositionAttribute);
                resultLinkGeometry.setAttribute('color', resultLinkColorAttribute);
                const resultLinkMaterial = new THREE.LineBasicMaterial({
                    vertexColors: true,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                });
                const resultLinks = new THREE.LineSegments(resultLinkGeometry, resultLinkMaterial);

                const haloPositions = new Float32Array(count * 3);
                const haloColors = new Float32Array(count * 3);
                const haloGeometry = new THREE.BufferGeometry();
                const haloPositionAttribute = new THREE.BufferAttribute(haloPositions, 3);
                const haloColorAttribute = new THREE.BufferAttribute(haloColors, 3);
                haloPositionAttribute.setUsage(THREE.DynamicDrawUsage);
                haloColorAttribute.setUsage(THREE.DynamicDrawUsage);
                haloGeometry.setAttribute('position', haloPositionAttribute);
                haloGeometry.setAttribute('color', haloColorAttribute);
                const haloMaterial = new THREE.PointsMaterial({
                    size: 0.26,
                    sizeAttenuation: true,
                    map: glowTexture,
                    vertexColors: true,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                });
                const halos = new THREE.Points(haloGeometry, haloMaterial);

                const queryPointPosition = new Float32Array(3);
                const queryPointAttribute = new THREE.BufferAttribute(queryPointPosition, 3);
                const queryPointGeometry = new THREE.BufferGeometry();
                queryPointGeometry.setAttribute('position', queryPointAttribute);
                const queryPointMaterial = new THREE.PointsMaterial({
                    size: 0.1,
                    sizeAttenuation: true,
                    map: glowTexture,
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                });
                const queryPointMesh = new THREE.Points(queryPointGeometry, queryPointMaterial);

                // Their geometry is rewritten every frame, so a bounding sphere
                // cached from the first frame would cull them at the wrong times.
                for (const overlay of [resultLinks, halos, queryPointMesh]) {
                    overlay.frustumCulled = false;
                    scene.add(overlay);
                }

                const projected = new THREE.Vector3();
                const ray = new THREE.Vector3();
                const queryPoint = new THREE.Vector3();
                const bestIndex = new Int32Array(QUERY_K);
                const bestDistance = new Float32Array(QUERY_K);
                // Eases the whole overlay in and out as the cursor enters and leaves.
                let activation = 0;
                let wasLit = false;

                const retrieve = (delta: number) => {
                    activation += ((cursor.active ? 1 : 0) - activation) * Math.min(delta * 4, 1);
                    target.fill(0);

                    if (cursor.active) {
                        // Anchor the query where the cursor's ray crosses z = 0.
                        ray.set(cursor.x, cursor.y, 0.5)
                            .unproject(camera)
                            .sub(camera.position)
                            .normalize();
                        queryPoint
                            .copy(camera.position)
                            .addScaledVector(ray, -camera.position.z / ray.z);

                        // Ranked by distance on screen, since that is the nearness
                        // the reader actually perceives.
                        const radius = size.height * QUERY_RADIUS;
                        let found = 0;

                        for (let i = 0; i < count; i++) {
                            projected
                                .set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
                                .applyMatrix4(field.matrixWorld)
                                .project(camera);

                            const dx = (projected.x - cursor.x) * size.width * 0.5;
                            const dy = (projected.y - cursor.y) * size.height * 0.5;
                            const distance = Math.sqrt(dx * dx + dy * dy);

                            if (distance > radius) continue;
                            if (found === QUERY_K && distance >= bestDistance[QUERY_K - 1]) {
                                continue;
                            }

                            // Insert into the ranked top-K, shifting worse hits down.
                            let slot = found < QUERY_K ? found++ : QUERY_K - 1;
                            while (slot > 0 && bestDistance[slot - 1] > distance) {
                                bestDistance[slot] = bestDistance[slot - 1];
                                bestIndex[slot] = bestIndex[slot - 1];
                                slot--;
                            }
                            bestDistance[slot] = distance;
                            bestIndex[slot] = i;
                        }

                        for (let rank = 0; rank < found; rank++) {
                            const i = bestIndex[rank];
                            // Closer scores higher, but every result stays legible.
                            target[i] = 0.35 + 0.65 * (1 - bestDistance[rank] / radius);
                            anchors[i * 3] = queryPoint.x;
                            anchors[i * 3 + 1] = queryPoint.y;
                            anchors[i * 3 + 2] = queryPoint.z;
                        }
                    }

                    const ease = Math.min(delta * 8, 1);
                    for (let i = 0; i < count; i++) glow[i] += (target[i] - glow[i]) * ease;
                };

                const drawResults = () => {
                    let results = 0;

                    for (let i = 0; i < count; i++) {
                        const strength = glow[i] * activation;
                        const shade = brightness[i] + (1 - brightness[i]) * strength;
                        nodeColors[i * 3] = shade;
                        nodeColors[i * 3 + 1] = shade;
                        nodeColors[i * 3 + 2] = shade;

                        if (strength < 0.004) continue;

                        projected
                            .set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
                            .applyMatrix4(field.matrixWorld);

                        const p = results * 6;
                        resultLinkPositions[p] = anchors[i * 3];
                        resultLinkPositions[p + 1] = anchors[i * 3 + 1];
                        resultLinkPositions[p + 2] = anchors[i * 3 + 2];
                        resultLinkPositions[p + 3] = projected.x;
                        resultLinkPositions[p + 4] = projected.y;
                        resultLinkPositions[p + 5] = projected.z;

                        // Brightest at the query, thinning out toward the result.
                        const near = strength * 0.85;
                        const far = strength * 0.3;
                        resultLinkColors[p] = near;
                        resultLinkColors[p + 1] = near;
                        resultLinkColors[p + 2] = near;
                        resultLinkColors[p + 3] = far;
                        resultLinkColors[p + 4] = far;
                        resultLinkColors[p + 5] = far;

                        const h = results * 3;
                        const halo = strength * 0.5;
                        haloPositions[h] = projected.x;
                        haloPositions[h + 1] = projected.y;
                        haloPositions[h + 2] = projected.z;
                        haloColors[h] = halo;
                        haloColors[h + 1] = halo;
                        haloColors[h + 2] = halo;

                        results++;
                    }

                    resultLinkGeometry.setDrawRange(0, results * 2);
                    haloGeometry.setDrawRange(0, results);
                    if (results > 0) {
                        resultLinkPositionAttribute.needsUpdate = true;
                        resultLinkColorAttribute.needsUpdate = true;
                        haloPositionAttribute.needsUpdate = true;
                        haloColorAttribute.needsUpdate = true;
                    }

                    // One more upload after the last result fades, to restore base shades.
                    const lit = results > 0;
                    if (lit || wasLit) nodeColorAttribute.needsUpdate = true;
                    wasLit = lit;

                    queryPointPosition[0] = queryPoint.x;
                    queryPointPosition[1] = queryPoint.y;
                    queryPointPosition[2] = queryPoint.z;
                    queryPointAttribute.needsUpdate = true;
                    queryPointMaterial.opacity = activation * 0.55;
                };

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
                            // Edges between two retrieved nodes light up too, so the
                            // result set reads as a connected cluster.
                            const retrieved = Math.min(glow[i], glow[j]) * activation;
                            const shade =
                                fade *
                                (0.55 * Math.min(brightness[i], brightness[j]) + 0.45 * retrieved);
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

                        // A rotation that accumulated would eventually turn the field
                        // edge-on, since the box is far wider than it is deep. Sway.
                        field.rotation.y = Math.sin(elapsed * 0.06) * 0.12;

                        camera.position.x = pointer.x * 0.8;
                        camera.position.y = -pointer.y * 0.5;
                        camera.lookAt(0, 0, 0);

                        // Retrieval projects nodes onto the screen, so both matrices
                        // must be current before the renderer would refresh them.
                        field.updateMatrixWorld();
                        camera.updateMatrixWorld();

                        retrieve(delta);
                        rewire();
                        drawResults();
                    },
                    resize: (width, height) => {
                        halfX = halfY * (width / height) * 1.1;
                    },
                    dispose: () => {
                        nodeGeometry.dispose();
                        nodeMaterial.dispose();
                        linkGeometry.dispose();
                        linkMaterial.dispose();
                        resultLinkGeometry.dispose();
                        resultLinkMaterial.dispose();
                        haloGeometry.dispose();
                        haloMaterial.dispose();
                        queryPointGeometry.dispose();
                        queryPointMaterial.dispose();
                        glowTexture.dispose();
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
