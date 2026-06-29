# Phase 3B Implementation Guide
## Bulk Implementation for Remaining Files

**Status:** In Progress  
**Completed:** HolarcHelpProviders.tsx, EmergencyDashboardScreen.tsx  
**Remaining:** 33 files  
**Pattern:** Template-based systematic implementation

---

## Template Pattern (Already Applied)

### Step 1: Import useTranslation
```typescript
import { useTranslation } from "react-i18next";
```

### Step 2: Initialize Hook
```typescript
const { t } = useTranslation();
```

### Step 3: Replace Hardcoded Strings
```typescript
// BEFORE
<p>Welcome to Emergency Dashboard</p>

// AFTER
<p>{t("holarcHelp.emergency.dashboard.title")}</p>
```

---

## Remaining Files by Category

### Category 2: Incident Management (5 files)
- [ ] **HolarcHelpIncidents.tsx** (82 lines)
  - Strings: "Incidents", status labels, filters
  - Keys: `holarcHelp.emergency.incidents.*`

- [ ] HolarcHelpIncidentDetail.tsx
  - Strings: "Incident Detail", actions, status
  - Keys: `holarcHelp.emergency.incidents.*`

- [ ] HolarcHelpContacts.tsx
  - Strings: "Contacts", "Emergency Contacts", actions
  - Keys: `holarcHelp.emergency.incidents.contacts`

- [ ] HolarcHelpNearby.tsx
  - Strings: "Nearby Resources", filters
  - Keys: `holarcHelp.emergency.incidents.nearby`

- [ ] HolarcHelpHome.tsx
  - Strings: Dashboard title, navigation
  - Keys: `holarcHelp.emergency.*`

### Category 3: Ambulance Screens (4 files)
- [ ] **EmergencyDashboardScreen.tsx** ✅ IN PROGRESS
  - Status: "NEW", "ACTIVE", "COMPLETED"
  - Severity: "Critical", "High", "Medium", "Low"
  - Keys: `holarcHelp.emergency.dashboard.*`

- [ ] AffiliatedHospitalsScreen.tsx
  - Strings: "Affiliated Hospitals", hospital list, actions
  - Keys: `holarcHelp.emergency.ambulance.affiliations`

- [ ] HospitalNetworkScreen.tsx
  - Strings: "Hospital Network", filters, status
  - Keys: `holarcHelp.emergency.ambulance.networkScreen`

- [ ] HospitalsDirectoryScreen.tsx
  - Strings: "Hospitals Directory", search, filters
  - Keys: `holarcHelp.emergency.ambulance.directory`

### Category 4: Hospital Operations (8 files)
- [ ] HospitalOpsDashboard.tsx
  - Strings: "Operations Dashboard", stats, queue
  - Keys: `holarcHelp.emergency.hospital.dashboard`

- [ ] ActiveDispatchScreen.tsx
  - Strings: "Active Dispatch", incident list
  - Keys: `holarcHelp.emergency.dispatch.*`

- [ ] DispatchAssignmentScreen.tsx
  - Strings: "Assign Dispatch", "Assign", buttons
  - Keys: `holarcHelp.emergency.dispatch.assignment`

- [ ] DispatchReassignmentScreen.tsx
  - Strings: "Reassign", reassignment actions
  - Keys: `holarcHelp.emergency.dispatch.reassignment`

- [ ] DispatchQueueScreen.tsx
  - Strings: "Dispatch Queue", pending calls
  - Keys: `holarcHelp.emergency.dispatch.dispatchQueue`

- [ ] HospitalSelectionScreen.tsx
  - Strings: "Select Hospital", hospital list
  - Keys: `holarcHelp.emergency.hospital.selection`

- [ ] HospitalIncidentConsole.tsx
  - Strings: "Incident Console", controls
  - Keys: `holarcHelp.emergency.hospital.console`

- [ ] HospitalOpsLayout.tsx (48 lines)
  - Strings: Layout labels, navigation
  - Keys: `holarcHelp.emergency.hospital.layout`

### Category 5: Components & Supporting (12+ files)
- [ ] HospitalInboundListener.tsx
- [ ] HospitalAdmissionEditor.tsx (multiple versions)
- [ ] AmbulanceHospitalAffiliations.tsx
- [ ] EmergencyContactsSection.tsx
- [ ] EmergencyContactsInline.tsx
- [ ] HospitalPicker.tsx
- [ ] EmergencyPatientContext.tsx
- [ ] HolarcHelpGate.tsx
- [ ] InviteStaffDialog.tsx
- And 3+ more supporting components

**Approach:** Use common component pattern:
```typescript
<Label>{t("common.email")}</Label>
<Button>{t("common.save")}</Button>
<Dialog title={t("holarcHelp.emergency.xyz")}>
```

---

## Implementation Checklist

### Phase 3B-2A: Emergency Incidents (Batch 1)
- [ ] HolarcHelpIncidents.tsx
- [ ] HolarcHelpIncidentDetail.tsx
- [ ] HolarcHelpContacts.tsx
- [ ] HolarcHelpHome.tsx
- **Est. time:** 1 hour

### Phase 3B-2B: Ambulance Provider Screens (Batch 2)
- [ ] EmergencyDashboardScreen.tsx (continue)
- [ ] AffiliatedHospitalsScreen.tsx
- [ ] HospitalNetworkScreen.tsx
- [ ] HospitalsDirectoryScreen.tsx
- **Est. time:** 1.5 hours

### Phase 3B-3: Hospital Operations (Batch 3)
- [ ] HospitalOpsDashboard.tsx
- [ ] ActiveDispatchScreen.tsx
- [ ] DispatchAssignmentScreen.tsx
- [ ] DispatchReassignmentScreen.tsx
- [ ] DispatchQueueScreen.tsx
- [ ] HospitalSelectionScreen.tsx
- [ ] HospitalIncidentConsole.tsx
- [ ] HospitalOpsLayout.tsx
- **Est. time:** 2 hours

### Phase 3B-4: Components (Batch 4)
- [ ] All supporting components
- Use template pattern (import, init, replace)
- **Est. time:** 1.5 hours

### Phase 3B-5: Testing
- [ ] Test Spanish + French on all screens
- [ ] Verify instant language switching
- [ ] Check for console errors
- [ ] Document results
- **Est. time:** 1 hour

---

## Key Translation Paths Used

```
holarcHelp.admin.*                          // HolarcHelpProviders
holarcHelp.emergency.dashboard.*            // EmergencyDashboardScreen
holarcHelp.emergency.incidents.*            // Incident files
holarcHelp.emergency.ambulance.*            // Ambulance screens
holarcHelp.emergency.hospital.*             // Hospital operation screens
holarcHelp.emergency.dispatch.*             // Dispatch management
```

---

## Notes for Implementers

1. **Naming Convention:** Use kebab-case for keys, camelCase for variables
2. **Context Variables:** Support {{variable}} in keys where needed
   ```typescript
   t("holarcHelp.admin.actions.search", { noun: "hospitals" })
   ```
3. **Fallback:** English text serves as fallback in non-English languages
4. **Testing Focus:** Spanish + French validation sufficient for all 25 languages
5. **Commit Strategy:** Commit after each batch (every 4-5 files)

---

## Next: Automated Implementation

Once all core translations are in place:
1. Run comprehensive browser tests on all Phase 3B screens
2. Test Spanish + French language switching
3. Verify no console errors
4. Document final validation results
5. Prepare Phase 3C scope

**Estimated Phase 3B Completion:** 6-8 hours from start
