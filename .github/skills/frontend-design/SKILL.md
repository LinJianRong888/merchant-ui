---
name: frontend-design
description: "Use when building or refining frontend pages, components, layouts, dashboards, landing pages, Taro views, Vue components, or when styling and beautifying web UI. Produces distinctive, production-grade interface code with a clear visual direction, strong typography, intentional motion, and non-generic aesthetics."
---

# Frontend Design

Create production-ready frontend interfaces with a strong point of view.
Favor intentional design over safe defaults, and avoid generic, interchangeable UI output.

This skill applies when the user asks for:
- A new page, section, component, card, dashboard, or landing page
- A visual redesign or polish pass
- Better styling, layout, hierarchy, spacing, or motion
- A more distinctive visual direction for an existing frontend
- UI work in HTML, CSS, JavaScript, TypeScript, Vue, React, Taro, or similar frontend stacks

## Working Principles

Before writing code, establish the direction:
- Purpose: identify what the interface needs to help the user do
- Audience: infer who will use it and what level of clarity or density fits
- Tone: choose a concrete aesthetic direction such as editorial, refined minimal, industrial, playful, brutalist, retro-futurist, or natural
- Constraints: respect framework, runtime, accessibility, performance, and existing design-system limits
- Differentiation: decide what makes the result memorable instead of generic

Do not produce default AI-looking layouts. Every design should feel specific to the problem.

## Design Rules

### Typography

- Pick fonts intentionally and avoid generic default stacks when the environment allows it
- Create clear hierarchy with scale, weight, spacing, and rhythm
- Use expressive display typography carefully and keep body text readable

### Color And Theme

- Commit to a cohesive palette with a dominant base and deliberate accent colors
- Prefer CSS variables or theme tokens for consistency
- Avoid overused purple-on-white gradients and bland neutral-only palettes unless the product already uses them

### Layout And Composition

- Build strong visual hierarchy before adding ornament
- Use asymmetry, overlap, contrast in density, or unexpected structure when appropriate
- Keep responsive behavior intentional on both mobile and desktop
- Respect the surrounding product patterns when working inside an existing app

### Motion

- Use a few meaningful animations rather than many scattered effects
- Favor page-load reveals, hover states, state transitions, and motion that clarifies structure
- Keep motion performant and proportionate to the interface

### Surface Detail

- Use backgrounds, gradients, textures, borders, shadows, patterns, or overlays to create atmosphere
- Add detail only when it supports the chosen direction
- Refine spacing, radii, line treatments, and empty states with care

## Implementation Standard

When applying this skill:
- Deliver working code, not mockups
- Match the repo's existing stack and conventions
- Prefer minimal, maintainable structure unless the design direction requires complexity
- Keep accessibility in scope: contrast, semantics, focus states, and readable sizes
- Reuse existing tokens, utilities, and components when they exist
- If working in Taro or Vue, stay idiomatic to that stack and preserve project patterns

## Anti-Patterns

Avoid:
- Generic SaaS hero sections with interchangeable cards
- Default font stacks without considering better options
- Safe but forgettable spacing and color choices
- Adding effects with no relationship to the design direction
- Rebuilding established project patterns when the task only needs refinement

## Expected Output Shape

For substantial UI work, the response should usually:
1. State the chosen aesthetic direction in a sentence or two
2. Implement the interface directly in code
3. Ensure the result is responsive and production-usable
4. Briefly note any important tradeoffs, constraints, or follow-up items