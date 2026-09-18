type ThreeModule = typeof import('three');

export type SceneContext = {
    THREE: ThreeModule;
    scene: import('three').Scene;
    camera: import('three').PerspectiveCamera;
    /** Pointer position across the viewport in -1..1 (y down), eased toward the real cursor. */
    pointer: { x: number; y: number };
    /**
     * The mouse over this scene's own container, in normalised device
     * coordinates (-1..1, y up) — ready for Vector3.unproject. Deliberately not
     * eased, so anything anchored to it tracks the cursor exactly. `active` is
     * false for touch, before the first move, and whenever the mouse is outside
     * the container or has left the window.
     */
    cursor: { x: number; y: number; active: boolean };
    size: { width: number; height: number };
};

export type SceneHooks = {
    /** Runs once per animation frame. Both arguments are in seconds. */
    update?: (delta: number, elapsed: number) => void;
    /** Runs after the renderer and camera have already been resized. */
    resize?: (width: number, height: number) => void;
    /** Release every geometry and material the scene allocated. */
    dispose: () => void;
};

export type SceneOptions = {
    fov?: number;
    cameraZ?: number;
    maxPixelRatio?: number;
};

/**
 * Mounts a three.js scene into `container` and owns its whole lifecycle:
 * lazy-loading three, sizing, pointer easing, pausing when off-screen or in a
 * hidden tab, honouring prefers-reduced-motion, and disposing on unmount.
 *
 * `build` describes only what is unique to a scene. Returns a cleanup function
 * that is safe to call before the dynamic import has even resolved.
 */
export const mountScene = (
    container: HTMLElement,
    build: (context: SceneContext) => SceneHooks,
    options: SceneOptions = {}
): (() => void) => {
    const { fov = 60, cameraZ = 8, maxPixelRatio = 2 } = options;

    let disposed = false;
    let teardown: (() => void) | undefined;

    import('three')
        .then((THREE) => {
            if (disposed) return;

            let renderer: import('three').WebGLRenderer;
            try {
                renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            } catch {
                // No WebGL, or it is blocked. Callers stay readable without it.
                return;
            }

            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            const size = {
                width: container.clientWidth || 1,
                height: container.clientHeight || 1,
            };

            renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
            renderer.setSize(size.width, size.height);
            renderer.domElement.style.display = 'block';
            container.appendChild(renderer.domElement);

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(fov, size.width / size.height, 0.1, 100);
            camera.position.z = cameraZ;

            const pointer = { x: 0, y: 0 };
            const pointerTarget = { x: 0, y: 0 };
            const cursor = { x: 0, y: 0, active: false };

            let clientX = 0;
            let clientY = 0;
            let hovering = false;

            // Measured every frame rather than on pointermove, so scrolling with a
            // still mouse moves the cursor across the scene as it should.
            const readCursor = () => {
                cursor.active = false;
                if (!hovering) return;

                const rect = container.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return;
                if (clientX < rect.left || clientX > rect.right) return;
                if (clientY < rect.top || clientY > rect.bottom) return;

                cursor.active = true;
                cursor.x = ((clientX - rect.left) / rect.width) * 2 - 1;
                cursor.y = 1 - ((clientY - rect.top) / rect.height) * 2;
            };

            const hooks = build({ THREE, scene, camera, pointer, cursor, size });

            let frame = 0;
            let running = false;
            let last = 0;
            let elapsed = 0;
            let onScreen = true;

            const render = () => renderer.render(scene, camera);

            const resize = () => {
                size.width = container.clientWidth || 1;
                size.height = container.clientHeight || 1;
                camera.aspect = size.width / size.height;
                camera.updateProjectionMatrix();
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
                renderer.setSize(size.width, size.height);
                hooks.resize?.(size.width, size.height);
                if (!running) render();
            };

            const tick = (now: number) => {
                frame = requestAnimationFrame(tick);
                const delta = Math.min((now - last) / 1000, 0.05);
                last = now;
                elapsed += delta;

                const ease = Math.min(delta * 2, 1);
                pointer.x += (pointerTarget.x - pointer.x) * ease;
                pointer.y += (pointerTarget.y - pointer.y) * ease;
                readCursor();

                hooks.update?.(delta, elapsed);
                render();
            };

            const start = () => {
                if (running || reduceMotion) return;
                running = true;
                last = performance.now();
                frame = requestAnimationFrame(tick);
            };

            const stop = () => {
                if (!running) return;
                running = false;
                cancelAnimationFrame(frame);
            };

            // Never burn frames for a scene nobody can see.
            const sync = () => (onScreen && !document.hidden ? start() : stop());

            const onPointerMove = (event: PointerEvent) => {
                pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
                pointerTarget.y = (event.clientY / window.innerHeight) * 2 - 1;

                // Touch has no hover: a finger dragging the page is not aiming at anything.
                hovering = event.pointerType !== 'touch';
                clientX = event.clientX;
                clientY = event.clientY;
            };

            const onPointerOut = (event: PointerEvent) => {
                // A null relatedTarget means the pointer left the window entirely.
                if (!event.relatedTarget) hovering = false;
            };

            const observer = new IntersectionObserver(
                ([entry]) => {
                    onScreen = entry.isIntersecting;
                    sync();
                },
                { threshold: 0 }
            );
            observer.observe(container);

            const resizeObserver = new ResizeObserver(resize);
            resizeObserver.observe(container);

            document.addEventListener('visibilitychange', sync);
            if (!reduceMotion) {
                window.addEventListener('pointermove', onPointerMove, { passive: true });
                window.addEventListener('pointerout', onPointerOut, { passive: true });
            }

            // Draw once up front, so the scene is present before the loop starts
            // and is the only frame drawn when motion is reduced.
            hooks.update?.(0, 0);
            render();
            sync();

            teardown = () => {
                stop();
                observer.disconnect();
                resizeObserver.disconnect();
                document.removeEventListener('visibilitychange', sync);
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerout', onPointerOut);
                hooks.dispose();
                renderer.domElement.remove();
                renderer.dispose();
                renderer.forceContextLoss();
            };
        })
        .catch(() => {
            // three failed to load; the section is fully readable without it.
        });

    return () => {
        disposed = true;
        teardown?.();
    };
};
