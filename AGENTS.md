<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep editable Axis marketing copy, specs, project media and form labels in `src/config/`; components render configuration to make content updates independent of presentation.
- Use a single scrolling homepage with section anchors and a separate `/build` route for the 3D wall configurator; navigation stays native. The panel overview plays once on entry, with optional detail buttons; do not restore scroll trapping or a multi-screen story track.
- Render the Inside-the-Panel story, build teaser wall and quote panel with one persistent lazy-loaded react-three-fiber canvas built from primitives, positioned via `data-scene-anchor` DOM elements and a small shared scene store; fall back to static DOM when WebGL or motion is unavailable. Why: the brief requires one continuous 3D panel that travels between sections.
- Save quote requests through validated public server functions and insert-only RLS; visitors must never be able to read or modify submitted contact information.
- Define visual styling in the shared stylesheet and expose reusable GlassCard and GlassButton controls; this keeps theme and interactions consistent.
- The `/build` configurator keeps selections in its own small store (`src/components/builder/store.ts`), product numbers in `src/config/builder.ts`, and renders one lazy r3f scene with instanced cabinets plus a 2D fallback; builds save to an insert-only table linked from quote requests. Why: every choice must update the scene instantly while staying editable and private.
