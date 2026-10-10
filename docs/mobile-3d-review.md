# Axis 3D review — October 7, 2026

## Current implementation

The app uses React 19, TanStack Start/Router, Tailwind 4 and Vite 8. The homepage already has a lazy, persistent primitive-based scene spanning the story, teaser and quote. The story's poses and cabinet arrivals use monotonic cubic-bezier easing rather than springs. The /build configurator already exists with an instanced wall, configuration store, editable product configuration, camera presets and a build submission server function. This is a code review, not a physical-device frame-rate measurement or backend security audit.

## Mobile findings, in priority order

1. Homepage wall draw calls: axis-scene.tsx creates 31 separate box meshes with six material slots each, including a distinct LED shader per cabinet. Consider an instanced shell plus instanced LED faces with per-instance UV offsets and flash attributes. Profile draw calls first and verify the assembly and teardown animations remain identical.
2. Homepage full-screen postprocessing: Bloom and Vignette run on mobile; lowering Bloom intensity does not reduce the pass resolution. Measure GPU frame time on a midrange phone before selecting a lower-resolution mobile effect or fallback.
3. Builder continuous rendering: builder-scene.tsx uses the default always-on frame loop. Add visibility-based suspension and evaluate demand rendering when content, camera and transitions are idle. Animated content and auto-orbit must still invalidate frames.
4. Animation consistency in /build: configurator.tsx contains two explicit springs and an elastic mobile sheet. CameraRig adds random camera shake. Replace these with the approved easing during the builder refinement pass.
5. Reduced-motion preference: SceneHost and the builder's 3D/flat choice check the media query at mount. Subscribe to changes so enabling reduced motion while the page is open also stops the scene and story interception.
6. Frame work: the homepage queries and measures an anchor every frame and creates temporary pose objects. Cache anchor references and update measurements on scroll/resize; use profiling to determine whether allocation reduction matters.

Existing safeguards: DPR caps of 1.25 on mobile and 1.5 on desktop, no mobile canvas antialiasing, lazy scene loading, static fallbacks, reduced cable tessellation, homepage offscreen pause, and no builder postprocessing on mobile.

## Scroll fix validation

Regression tests exercise momentum spikes beyond cooldown, directional thresholds, rail-click locking, held keys, Shift+Space, small native boundary scrolls and one step per touch. Browser wheel events expose no reliable physical-gesture identifier: a 200 ms silence interval is the gesture delimiter. Hardware testing remains necessary for unusually long or intermittent trackpad inertia.

Manual acceptance: traverse all seven steps with a mouse and trackpad; flick during transitions; hold navigation keys; swipe on iOS/Android; exit both boundaries slowly; verify anchor navigation, browser zoom, reduced-motion fallback and the teaser/quote handoff. Measure frame times and renderer draw calls on physical phones before claiming a mobile performance improvement.


## Implemented homepage refinement

- Phones now use a native scrolling sticky stage (490svh) with a dedicated model area and text card. No mobile touch/wheel prevention or programmatic scroll loop. Desktop keeps the guarded step sequence and releases navigation-link clicks.
- Shared instanced cabinet shells and LED faces replace per-cabinet wall materials/meshes. The detailed main cabinet hands off to its wall instance after the pose transition.
- Mobile postprocessing is removed, internal chip detail is reduced, labels mount only in the desktop exploded step, and DPR remains capped. The scene loads near the story, pauses offscreen/when hidden, and falls back on context loss or render errors.
- Shortest-path turns, a bounded pixel zoom, shorter mobile transitions, and removal of the large illuminated floor keep the model framed. Spring-driven hover/ambient motion is removed from the homepage; reduced-motion changes are observed live.
- Hero, story, teaser and mobile input spacing are refined. Story and teaser placeholder prose is replaced in config; manufacturer numbers and illustrative project data remain unconfirmed.
- Devtools source injection is excluded for R3F scene modules. Browser validation reproduced a canvas crash from injected `data-tsd-source` properties before this compatibility fix.

Checked in a background browser at 390×844 and desktop size: hero layout, native story progression, exploded view, wall shader/assembly, and login layout. This is viewport testing, not measured frame-rate testing on physical iOS/Android hardware. Remaining builder-specific observations above are outside this homepage pass.


## Compact panel overview update

The homepage panel story now uses a compact section on desktop and mobile: three persistent benefits, a single visible-entry animation, optional pixel/back/layer views, and replay. It no longer uses a sticky multi-screen track or scroll-derived steps. The introduction waits for scene readiness, cancels when leaving the viewport, and yields immediately to manual controls. Reduced-motion/WebGL fallback keeps the benefits as static content.
