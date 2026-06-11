---
name: Test User Accounts
description: Designated test accounts (emails + roles only; never passwords) for QA across roles
type: reference
---
Designated test accounts (emails + intended role). Passwords are never stored in memory.

| Role | Email |
|------|-------|
| Developer | developer@smartify.co.za |
| Director | director@smartify.co.za |
| ER | er.test@holarchealth.com |
| ER | renken@smartify.co.za |
| Hospital | hospital.test@holarchhealth.com |
| Hospital | zano@smartify.co.za |
| Doctor | sme@smartify.co.za |
| Doctor | christina@smartify.co.za |
| Doctor | jeanprodromos@smartify.co.za |
| Patient | sme@smartify.co.za |
| Patient | paraskevoulasoldatos@gmail.com |
| Patient | projectmanager@smartify.co.za |
| Admin | info@georgiaadams.co.za |

Bulk password resets for these accounts: sign in as the Admin and visit `/admin/bulk-password-reset` (admin-gated page that calls the `admin-set-user-password` edge function per email).
