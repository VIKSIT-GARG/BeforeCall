# UX Review Skill — BeforeCall

## Purpose
Evaluate product from user perspective: can someone prepare for a meeting in 5 minutes?

## When to Use
- Before merging UI changes
- New feature completion
- Pre-release review
- Design system changes

## Evaluation Criteria

### Hierarchy & Information Architecture
- [ ] Primary action obvious within 3 seconds
- [ ] Information grouped by user task, not implementation
- [ ] Progressive disclosure — details on demand
- [ ] No orphaned features

### Typography
- [ ] Clear type scale (display → caption)
- [ ] Readable line lengths (45-75 chars)
- [ ] Sufficient contrast (WCAG AA)
- [ ] No more than 2 font families

### Spacing & Layout
- [ ] Consistent spacing scale (4px base)
- [ ] Breathing room — not cramped, not sparse
- [ ] Aligned to 8px grid
- [ ] Responsive breakpoints intentional

### Navigation & Flow
- [ ] User knows where they are
- [ ] Back navigation always works
- [ ] No dead ends
- [ ] Keyboard accessible

### Information Density
- [ ] Meeting brief scannable in 2-5 minutes
- [ ] TL;DR visible without scroll
- [ ] Sources accessible but not overwhelming
- [ ] 5-minute mode truly condensed

### Mobile Behavior
- [ ] 320px: all content accessible
- [ ] Touch targets 44x44px minimum
- [ ] No horizontal scroll
- [ ] Before You Walk In optimized for phone

### Accessibility
- [ ] Focus visible on all interactive elements
- [ ] Semantic HTML (landmarks, headings)
- [ ] ARIA labels where needed
- [ ] Color not sole indicator
- [ ] Screen reader tested

### Interaction Feedback
- [ ] Loading states (skeletons, progress)
- [ ] Success confirmation
- [ ] Error messages actionable
- [ ] Empty states helpful

### The "5-Second Test"
> Can a user understand what to do within 5 seconds of landing on any screen?

### The "Meeting in 15 Minutes" Test
> If I had an important meeting in 15 minutes, would this product genuinely help me?

## Workflow
1. Open feature in browser
2. Walk through user journey
3. Check each criterion
4. Document findings with screenshots
5. Prioritize: P0 (blocks use) → P3 (polish)

## Validation
- Checklist complete
- Screenshots attached
- Priority assigned to each finding

## Output
- UX review report in PR
- Annotated screenshots
- Prioritized remediation list

## Common Failure Modes
- Beautiful but unusable (form over function)
- Desktop-first, mobile broken
- Loading states missing → user thinks broken
- Error states generic → user stuck
- Empty states unhelpful → user confused
- Too many clicks to value