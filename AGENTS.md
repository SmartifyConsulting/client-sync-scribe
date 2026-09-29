# Agent rules
- Wealth workflow state is derived and changed only by DB functions (wealth_*); UI never writes stage directly. Why: keeps stage truthful to records and every change audited.
