## Add Johannesburg hospitals & emergency responders to the database

Seed the `holarchelp_hospitals` and `holarchelp_ambulance_providers` tables with the listed Johannesburg providers, pre-approved and active so they show up immediately in HolarcHelp dispatch and the public providers map.

### Hospitals (10 private + 6 public = 16 rows into `holarchelp_hospitals`)

For each row: `status='approved'`, `subscription_status='active'`, `accepting_patients=true`, `country='South Africa'`, `state='Gauteng'`, `city='Johannesburg'`, `owner_id` set to the existing admin user (`9ceb1207-…`) as a placeholder until each hospital claims its account, `contact_email` = a placeholder routing alias (e.g. `morningside@hospitals.holarchealth.com`) so the NOT NULL constraint is satisfied without leaking a real inbox.

| Name | Ownership | Tier | Address | Phone | Lat / Lng |
|---|---|---|---|---|---|
| Mediclinic Morningside | private | tier_1 | Cnr Rivonia Rd & Hill Rd, Morningside, Sandton | +27 11 282 5000 | -26.0760, 28.0560 |
| Netcare Milpark Hospital | private | tier_1 | 9 Guild Rd, Parktown West | +27 11 480 5600 | -26.1790, 28.0150 |
| Netcare Park Lane Hospital | private | tier_2 | 14 Junction Ave, Parktown | +27 11 480 4500 | -26.1840, 28.0440 |
| Netcare Rosebank Hospital | private | tier_2 | 14 Sturdee Ave, Rosebank | +27 11 328 0500 | -26.1450, 28.0420 |
| Netcare Olivedale Hospital | private | tier_2 | Cnr Pres Fouche & Windsor Way, Olivedale | +27 11 777 2000 | -26.0560, 27.9620 |
| Wits Donald Gordon Medical Centre | private | tier_1 | 21 Eton Rd, Parktown | +27 11 356 6000 | -26.1820, 28.0410 |
| Life Bedford Gardens Hospital | private | tier_2 | 4 Leicester Rd, Bedfordview | +27 11 677 8000 | -26.1810, 28.1390 |
| Life Brenthurst Hospital | private | tier_2 | 1 Eton Rd, Parktown | +27 11 484 0500 | -26.1810, 28.0410 |
| Life Wilgeheuwel Hospital | private | tier_2 | Cnr Amsterdam & Hendrik Potgieter, Wilgeheuwel | +27 11 207 9000 | -26.1170, 27.9120 |
| Netcare Linkwood Hospital | private | tier_2 | 24 12th Ave, Linksfield West | +27 11 647 3400 | -26.1660, 28.1110 |
| Charlotte Maxeke Johannesburg Academic Hospital | public | tier_1 | 17 Jubilee Rd, Parktown | +27 11 488 4911 | -26.1790, 28.0440 |
| Helen Joseph Hospital | public | tier_2 | Perth Rd, Auckland Park | +27 11 489 1011 | -26.1810, 27.9990 |
| Rahima Moosa Mother and Child Hospital | public | tier_2 | Fuel Rd, Coronationville | +27 11 470 9000 | -26.1820, 27.9760 |
| Chris Hani Baragwanath Academic Hospital | public | tier_1 | Chris Hani Rd, Diepkloof, Soweto | +27 11 933 8000 | -26.2620, 27.9390 |
| Edenvale Hospital | public | tier_2 | Modderfontein Rd, Edenvale | +27 11 321 6000 | -26.1430, 28.1530 |
| Bertha Gxowa Hospital | public | tier_2 | Angus St, Germiston | +27 11 089 8000 | -26.2160, 28.1690 |

### Emergency responders (10 rows into `holarchelp_ambulance_providers`)

`status='approved'`, `subscription_status='active'`, `accepting_patients=true`, `state='Gauteng'`, `city='Johannesburg'`, `country='South Africa'`, placeholder `owner_id` (admin) and placeholder `contact_email`.

| Company | Tier | Base | Phone |
|---|---|---|---|
| ER24 Joburg Central | tier_1 | Johannesburg Central | 084 124 |
| ER24 Joburg South | tier_1 | Johannesburg South | 084 124 |
| Emer-G-Med EMS | tier_1 | Sandton | 011 555 1066 |
| Medi Response | tier_1 | Morningside | 081 924 |
| Rescue 786 Emergency Medical Services | tier_2 | Lenasia | 011 854 7867 |
| Ralmed | tier_2 | Johannesburg | 011 974 7777 |
| St John EMS — Jhb Base | tier_2 | 25 Erlswold Way, Saxonwold | 011 403 4227 |
| Inter City Ambulance Service | tier_3 | Johannesburg | 011 873 4023 |
| National Emergency Medical Services | tier_2 | Johannesburg | 011 444 0440 |
| High Care EMS (Pty) Ltd | tier_3 | Johannesburg | 010 003 0150 |

### How the seed runs

A single `INSERT … ON CONFLICT DO NOTHING` (matched on `name` for hospitals / `company_name` for ambulances) — safe to re-run; existing manually-added rows are not overwritten. Run via the data-insert tool (no schema change needed).

### Caveats / things to confirm

- **`owner_id` placeholder.** Each row needs a non-null owner. Default is the admin user id `9ceb1207-…`. When a real hospital/EMS group signs up they take over via the existing approval flow. OK?
- **Phone numbers** are the publicly published switchboard / national dispatch numbers; some EMS operators (ER24 = 084124, Medi Response = 081924) only publish a national number — used as-is.
- **Lat/Lng** are best-effort approximations from public sources, accurate to ~100 m. Good enough for nearest-provider dispatch sorting; not surveyed coordinates.
- **No addresses found for some EMS** (e.g. Inter City, National EMS, High Care) — `base_address` left blank, only city/state populated.
- **Contact emails** are routing placeholders on `hospitals.holarchealth.com` / `ems.holarchealth.com` so the NOT NULL constraint passes without inventing fake real-looking emails. Real emails can be set later.

Confirm and I'll execute the inserts.