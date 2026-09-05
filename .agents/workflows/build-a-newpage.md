---
description: Build a new DealFlow360 frontend page incrementally while preserving the existing architecture, design system and performance standards.
---

When building a new page:

1. Inspect the existing routing, layout and relevant components.
2. Identify reusable UI components before creating new ones.
3. Follow the DealFlow360 design system.
4. Build the page structure first.
5. Add realistic typed mock data if APIs are unavailable.
6. Add interactions.
7. Add Motion animations.
8. Use GSAP only when a complex animation genuinely improves the experience.
9. Make the page responsive.
10. Add loading, empty and error states where appropriate.
11. Verify accessibility and keyboard interaction.
12. Check TypeScript/build errors.
13. Remove unused imports and dead code.
14. Do not modify unrelated files.

The page should feel like a production enterprise SaaS product, not a prototype dashboard.