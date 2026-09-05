---
description: Design and implement intelligent DealFlow360 experiences where business rules, risk, recommendations and next actions are clearly communicated to the user.
---

When implementing an intelligent DealFlow360 feature:

1. Identify the business decision being made.
2. Identify the deterministic rule responsible for the decision.
3. Display the current state.
4. Explain WHY the decision occurred.
5. Show the impact on:
   - revenue
   - margin
   - discount
   - risk
   - approval
   - fulfillment
6. Provide a recommended next action when appropriate.
7. Clearly distinguish deterministic business rules from AI recommendations.
8. Use progressive disclosure so the interface remains minimal.
9. Animate important state changes using Motion.
10. Use GSAP only for complex workflow visualization.

Preferred UX pattern:

STATE
↓
WHY
↓
IMPACT
↓
RECOMMENDATION
↓
ACTION