---
trigger: always_on
---

Do not create UI elements that appear functional but do nothing.

Buttons should have an intended action.
Filters should affect displayed data.
Tabs should change content.
Quantity controls should update values.
Approval actions should change state.
Negotiation actions should update the quotation state.

During frontend-only development, use realistic mock state when backend APIs are unavailable, but keep the interaction real.