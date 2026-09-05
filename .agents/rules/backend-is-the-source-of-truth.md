---
trigger: always_on
---

Never place critical DealFlow360 business rules inside presentation components.

Business decisions must ultimately come from backend/application logic.

This includes:
- discount ceilings
- approval routing
- risk calculations
- margin calculations
- warehouse allocation
- backorders
- billing
- proration
- permissions
- deal health

The frontend may use mock data during frontend development, but mock business logic must remain isolated and replaceable by API responses.