# Caliber 08 Living Spec

## Product

Caliber 08 is a self-contained editorial product study of a procedural mechanical watch. It uses a pinned Three.js canvas, scroll-driven assembly choreography, a generated component index, and a finale that compares four finishes.

## Data model

- `BEATS`: pure scroll keyframes for camera, assembly state, tone, copy, material, and bracelet curl
- `COMPONENTS`: 14 generated component types and their real mesh counts
- `FINISHES`: steel, graphite, yellow gold, and rose gold material presets

## Key flows

1. Scroll through the pinned track to inspect the watch from assembled, exploded, movement, dial, bracelet, and worn views.
2. Hold or keyboard-toggle the explore control during the exploded view to reveal all component labels.
3. Use the component index filters to focus on Structure, Face, Movement, or Band.
4. Use the finish list, next button, or pointer zones in the finale to compare the four material presets.

## Accessibility and fallbacks

- `prefers-reduced-motion` and WebGL failure use a readable static editorial document.
- Navigation anchors, index filters, and finale controls are keyboard operable and have visible focus states.
- No authentication or third-party integrations are used.