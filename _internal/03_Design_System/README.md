# SponsorAI Design System

SponsorAI is a calm analytical data platform.

This system defines:
- Tokens (design primitives + semantic roles)
- Components (UI building blocks)
- Usage rules (governance and restraint)
- Generation rules (for AI-assisted UI)

Principle:
Accent is punctuation, not paint.

No hype. No gamification. No aggressive saturation.
Clarity over decoration.

--

### Change checklist (required)
- [ ] Is this a reusable decision? If yes, update tokens not hardcoded styles
- [ ] Update both Light and Dark theme values (same semantic token names)
- [ ] Check contrast for text and key UI states (hover, focus, disabled)
- [ ] Verify selected, active, and focus states do not rely on colour alone
- [ ] If charts touched, update chart tokens too
- [ ] Add a one-line changelog note

### Responsive checklist (required)
- [ ] Check sm, md, lg layouts
- [ ] Grid reduces columns, not font size
- [ ] Tables have a mobile strategy (stack or scroll)
- [ ] Touch targets remain ≥ 44px
- [ ] Primary action remains visible on sm
- [ ] Charts remain readable (reduced labels if needed)
- [ ] Dark mode verified at sm and lg