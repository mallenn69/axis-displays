# Axis Glow

Build a premium, flashy, high-tech marketing website for "Axis LED Panels," a U.S.-based company that sells and installs LED video walls, primarily to churches. Tagline: "Premium LED walls without the premium price." The attached image is a reference for mood and branding only — do not copy its layout or colors exactly; follow the design system below.

TECH
- React + TypeScript + Tailwind + framer-motion. Use react-three-fiber + drei ONLY for the scroll-story panel if needed; otherwise CSS 3D transforms. No external 3D model files.
- All editable content (text, specs, projects, testimonials, contact info) lives in data/config files under src/config/ so it can be changed without touching components.
- Fully responsive, mobile-first. Must feel smooth on iPhone.

DESIGN SYSTEM — DARK, CLEAN, GLASS, FLASHY
Colors (use only these; no orange, no other accent colors):
- Background: #050505 (page), #0E0F12 (sections/solid cards)
- Hairline borders: #1C1E23
- Headings: #FFFFFF. Body text: #A1A5AD. Secondary labels: #5C6068
- Single accent: electric blue #2B7FFF, with lighter glow tint #5B9DFF and deep blue #0B2A5C for gradients/LED visuals
Define these as Tailwind theme tokens / CSS variables.

Glassmorphism (core visual style — use it everywhere it makes sense):
- Glass surface: background rgba(255,255,255,0.04)–0.06, backdrop-filter blur(20px) saturate(140%), 1px border rgba(255,255,255,0.08), inner top highlight (inset 0 1px 0 rgba(255,255,255,0.08)), rounded-2xl corners.
- Add a very subtle noise/grain texture overlay on glass surfaces (generated in CSS/SVG, low opacity).
- Glass hover state: border brightens to rgba(43,127,255,0.4), soft blue outer glow (0 0 40px rgba(43,127,255,0.15)), and a diagonal light-sweep shine that animates across the card once.
- Interactive glass cards get a subtle 3D tilt that follows the cursor (max ~6deg) on desktop only.
- Create a reusable <GlassCard> component and a <GlassButton> component.
- Fallback: if backdrop-filter isn't supported, use solid #0E0F12 at 90% opacity.

Ambient effects (this is what makes it flashy — keep it tasteful and dark):
- 2–3 large, very blurred blue light orbs (#2B7FFF / #0B2A5C, 10–20% opacity) slowly drifting behind content on the page, so the glass has something to blur.
- Cursor spotlight on desktop: a soft radial blue glow (~400px) that follows the mouse across dark sections.
- Thin animated blue light lines/beams occasionally sweeping across section dividers.
- Buttons: primary = solid #2B7FFF with glow on hover and a shine sweep; secondary = glass button.
- Headings can use a subtle white-to-light-gray gradient text; key accent words in blue.

Typography:
- Headings: "Unbounded" (bold, wide). Body: "Inter". Small labels: wide letter-spacing, uppercase, 12px, #5C6068.
- Big, confident hero type (clamp ~44px mobile to ~88px desktop).

Motion:
- framer-motion for everything. Sections fade/slide up as they enter the viewport, staggered children.
- Smooth scrolling (Lenis or similar).
- Respect prefers-reduced-motion: disable tilt, parallax, orbs drifting, and heavy animations.
- On mobile: reduce blur radius to ~12px and disable cursor effects for performance.

LOGO
- SVG component: wordmark "AXIS" in bold wide white letters with a small four-point star/spark integrated into the A, spark in #2B7FFF with a soft glow. Under it "LED PANELS" in small, wide-tracked letters (#A1A5AD). Make it a component so I can swap in a real logo file later.
- Favicon: the blue spark.

NAVIGATION
- Floating glass navbar (pill shape, centered, detached from top edge by ~16px), appears/condenses on scroll.
- Links: Inside the Panel, Installs, Build Your Wall, Why Axis. Right side: primary "Get a Quote" button.
- Mobile: glass hamburger menu that opens a full-screen glass overlay with large staggered links.
- Active section highlight in the nav while scrolling.

HOMEPAGE SECTIONS (in order)

1. HERO (full screen)
- Small glass pill badge at top: "XS SERIES · INDOOR P2.6" with a pulsing blue dot.
- Headline: "Premium LED walls" (white) / "without the premium price." (blue).
- Subheadline: "Stage-ready LED video walls built for worship — designed, installed, and supported by people who know church production."
- Buttons: "Build Your Wall" (primary, links to /build) and "Get a Quote" (glass, scrolls to form).
- Visual: a large LED wall made of a grid of panel tiles (e.g., 12x6) with thin seams between them. On load, tiles power on one by one in a sweep. Then the wall plays a slowly shifting animated blue gradient "worship visual" across all tiles together, like a real video wall. Slight perspective tilt and mouse-follow parallax on desktop. A soft blue reflection of the wall fades onto a glossy floor below it.
- Below the buttons: a row of three small glass stat chips (e.g., "Refresh rate", "Warranty", "Tool-free service") using values from the specs config.
- Scroll cue at bottom (animated chevron or line).

2. TRUST MARQUEE
- An infinite horizontal scrolling strip of placeholder church names/logos in muted gray, fading at both edges. Label above: "Trusted by churches across the region."

3. "INSIDE THE PANEL" SCROLL STORY (the centerpiece — make this impressive)
- Sticky section ~500vh tall. LEFT: an LED cabinet panel built in code (square cabinet, front LED face made of 4 modules, back side with die-cast frame, handles, locks, power/data connectors with tiny blue status LEDs). RIGHT: explanation text in glass cards that swap as the user scrolls. The panel animation is driven directly by scroll progress (scrub, not just triggered).
- Step 1 "The Pixels": panel faces front and zooms deep into the surface until individual RGB pixels are visible, glowing red/green/blue clusters. Text: premium LED chips, accurate color, smooth gradients for worship visuals.
- Step 2 "Camera-Ready": the panel face shows a moving visual; a "camera viewfinder" overlay appears showing no flicker or scan lines. Text: high refresh rate means clean livestreams and recordings.
- Step 3 "Tool-Free Service": one module detaches from the front, floats forward with a soft glow, rotates slightly, then snaps back in. Text: modules swap from the front in seconds — no tools, no climbing behind the wall.
- Step 4 "The Cabinet": the panel rotates 180° to reveal the back: frame, handles, quick-locks, connectors with subtle blue accent lights. Text: precision die-cast cabinets built to align perfectly and last.
- Step 5 "Built to Scale": the single panel duplicates and the copies fly in and snap together into a full wall that lights up. Text: any size, any stage — from small sanctuaries to arenas.
- A vertical progress rail with 5 dots and step labels; the active one glows blue. Clicking a dot scrolls to that step.
- On mobile: panel sits on top (sticky), text cards below, same scroll-driven animations, simplified where needed.

4. SPECS GRID
- Glass cards in a responsive grid (2 columns mobile, 4 desktop) with icons and animated count-up numbers when in view: Pixel pitch, Refresh rate, Brightness (nits), Warranty, Cabinet size, Service access. All values come from src/config/specs.ts with placeholder values marked // TODO: confirm with manufacturer.

5. WHY AXIS
- Three large tilt glass cards with icons:
  - "Big-brand components, smart pricing" — the same tier of components used by premium brands, without the markup.
  - "The Sunday Guarantee" — fast support and spare parts on hand so you're never dark on a Sunday.
  - "Install, training, and support" — we install it, train your team, and stay with you.

6. FEATURED INSTALLS
- Section heading "Recent installs." Responsive gallery of glass project cards: photo, church name, city/state, wall size, pixel pitch. On hover: image zooms slightly, glass info panel slides up, blue border glow.
- Clicking a card opens a glass modal with a larger image gallery and project details.
- 3 placeholder projects in src/config/projects.ts (use dark stage/concert placeholder images).

7. TESTIMONIAL
- Large centered glass panel with a big quote, pastor name, role, church name, and a small avatar circle. Placeholder content in config. Soft blue orb glowing behind it.

8. BIG CTA BANNER
- Full-width glass band with an animated LED-wall gradient behind it: "See your stage with an Axis wall." Buttons: "Build Your Wall" and "Get a Quote."

9. GET A QUOTE FORM (id="quote")
- Two-column layout on desktop: left side has heading "Let's light up your stage," short reassurance text, and contact details (phone, email — placeholders); right side is a large glass form.
- Fields: Name*, Church name*, Role* (dropdown: Pastor, Tech Director, Worship Leader, Other), Email*, Phone, City*, State*, Approximate stage width (ft), "When do you want it installed?" (Before Christmas, Before Easter, This year, Just exploring), Message.
- Glass inputs with blue focus glow, floating labels, inline validation messages.
- Save submissions to the database (table: quote_requests, with created_at timestamp and a status field defaulting to "new").
- On submit: button shows a loading shimmer, then an animated success state (blue checkmark draws itself) with "Thanks — we'll be in touch within one business day."

10. FOOTER
- Dark with a top hairline and faint blue glow. Logo, short tagline, nav links, contact placeholders, "U.S. Based Company" badge, copyright with current year.

/BUILD PAGE
- For now, a placeholder page in the same style: headline "Build Your Wall — coming soon," a teaser animated LED grid, and a button back to the quote form.

SEO & BASICS
- Page title: "Axis LED Panels | LED Video Walls for Churches." Meta description about premium LED walls for churches at a better price. Open Graph tags.
- Semantic HTML, alt text on images, good color contrast for body text, keyboard-accessible nav and form.
- Lazy-load images; keep performance strong (Lighthouse-friendly).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/13b90297-a256-4646-89cf-12ab0f856884).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
