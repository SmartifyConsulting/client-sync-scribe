

# Plan: Single "Login" button on Landing nav (mobile fit)

## Problem
The Landing nav shows three buttons — `Doctors Login`, `Patients Login`, and `Get Started` — alongside the logo. On a 390px mobile viewport this overflows, squeezing the logo. The role split is unnecessary at the nav level since `/auth` already handles role selection on the destination page.

## Fix

**File:** `src/pages/Landing.tsx` (nav block, lines ~111–129)

Replace the two role-specific login buttons with a single `Login` button:

```tsx
<div className="flex items-center gap-2 sm:gap-3">
  <Button
    variant="ghost"
    onClick={() => navigate("/auth?mode=login")}
    className="text-muted-foreground hover:text-foreground"
  >
    Login
  </Button>
  <Button onClick={() => setShowRoleDialog(true)} className="btn-pill">
    Get Started
  </Button>
</div>
```

Result: nav becomes `[logo] … [Login] [Get Started]` — fits comfortably at 390px and the logo keeps its full width.

## Out of scope
- No change to `/auth` page logic (it already handles login without a role param).
- No change to the role-selection dialog used by "Get Started" for signup.
- No change to `MobileHeader` (in-app shell, not the marketing landing page).

