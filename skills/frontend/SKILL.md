# Frontend Skill — Meeting Prep Assistant

## Purpose
Build premium, accessible, responsive React/Next.js interfaces using the project's design system.

## When to Use
- Creating new UI components
- Modifying existing components
- Implementing pages/views
- Fixing responsive/accessibility issues
- Design system work

## Inputs
- Design system tokens (colors, spacing, typography, radius, shadows)
- Existing component library in `src/components/ui/`
- Feature requirements from product spec

## Responsibilities
1. **Use existing components first** — Check `components/ui/`, `components/*/` before creating new
2. **Design system compliance** — Only use semantic tokens, never raw values
3. **Server components by default** — Add `"use client"` only when interactivity required
4. **Responsive first** — Test 320px, 375px, 768px, 1024px, 1440px, 1920px
5. **Accessibility** — WCAG AA, keyboard nav, focus states, semantic HTML, ARIA
6. **Loading/Error/Empty states** — Every async UI must have all three
7. **Performance** — Minimal client bundle, optimize images, avoid layout shift

## Rules
- No raw color values (`bg-blue-500` → `bg-primary`)
- No raw spacing (`p-4` → use design system spacing scale)
- No `any` types — strict TypeScript
- Prefer Radix UI primitives over custom implementations
- Animations: subtle, purposeful, respect `prefers-reduced-motion`
- No "AI slop" UI — no excessive gradients, shadows, cards, animations

## Workflow
1. Read existing component patterns in `components/ui/`
2. Check design system in `tailwind.config.js` and `globals.css`
3. Implement component with all states
4. Test responsive breakpoints
5. Run `npm run lint && npm run typecheck`
6. Add to Storybook/docs if applicable

## Validation
- `npm run lint` — passes
- `npm run typecheck` — passes
- `npm test` — component tests pass
- Visual QA at all breakpoints
- Keyboard navigation works
- Screen reader test (NVDA/VoiceOver)

## Output
- Component files in `src/components/`
- Updated design system if new tokens needed
- Tests in `tests/unit/components/`

## Common Failure Modes
- Creating duplicate components that already exist
- Using hardcoded values instead of design tokens
- Forgetting `"use client"` for interactive components
- Missing focus-visible styles
- Layout shift on load
- Not testing mobile viewport