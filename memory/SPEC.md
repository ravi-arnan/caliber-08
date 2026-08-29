# Caliber 08 Living Spec

## Product

Caliber 08 is a self-contained editorial product study of a procedural mechanical watch. It uses a pinned Three.js canvas, scroll-driven assembly choreography, a generated component index, and a finale that compares four finishes.

## Data model

- `BEATS`: pure scroll keyframes for camera, assembly state, tone, copy, material, and bracelet curl
- `COMPONENTS`: 14 generated component types and their real mesh counts
- `FINISHES`: steel, graphite, yellow gold, and rose gold material presets

## Key flows

1. Scroll through the more responsive pinned track to inspect the watch from assembled, exploded, movement, dial, bracelet, and worn views.
2. Pause after the exploded assembly for a two-screen, model-free editorial interlude focused on verified technical facts.
3. Hold or keyboard-toggle the explore control during the exploded view to reveal all component labels.
4. Use the component index filters to focus on Structure, Face, Movement, or Band.
5. Use the finish list, next button, or pointer zones in the finale to compare the four material presets; the `Caliber 08` finale lettering stays behind the watches.

The former floating watch-card transition was removed to keep the hinge-to-index handoff clean. Section 11 is a dense technical catalog with number, component, assembly group, generation method, and mesh-count columns; most or all 14 rows fit within one desktop viewport.

The decorative miniature watch glyph was removed from the scroll chrome; only functional navigation and technical indicators remain.

The two-tone circular gauge begins at Hinge, completes a full 360° circumference exactly at 10 — Worn, and fades smoothly during the following beat without clipping the viewport.

The Hinge zoom-out is an active technical transition with animated orbit geometry, measurement axes, and “Closing the loop” copy. All non-lead chapter copy uses adaptive light or dark material panels so text remains readable over every watch angle and tonal state, including Case and Dial.

## Accessibility and fallbacks

- `prefers-reduced-motion` and WebGL failure use a readable static editorial document.
- Navigation anchors, index filters, and finale controls are keyboard operable and have visible focus states.
- No authentication or third-party integrations are used.

## Deployment compatibility

- The product remains a client-only Vite/Three.js experience.
- `frontend/` provides the Emergent runtime launcher while serving the root application source.
- `backend/` contains only a database-free `/api/health` compatibility service; it has no product data, MongoDB connection, or business logic.
- Vite accepts deployment hosts dynamically through `ALLOWED_HOSTS`, defaulting to the platform-provided host when unset.
- `frontend/.env` is a tracked, non-secret deployment contract containing only `VITE_APP_MODE=frontend_only` and `PORT=3000`; both frontend and backend env files are explicitly un-ignored.