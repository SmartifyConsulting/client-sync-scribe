# Phase 3B Implementation Plan
## Emergency & Dispatch Screens - Full i18n Coverage

**Date:** 2026-06-29  
**Scope:** 35+ files, ~8,000+ lines  
**Approach:** Template-first, systematic implementation  
**Testing:** Optimized 2-language (Spanish + French)  
**Estimated Duration:** 6-8 hours

---

## Phase 3B Files Inventory

### Category 1: Admin/Provider Management (754+ lines)
**Primary File:**
- [ ] **HolarcHelpProviders.tsx** (754 lines) - CRITICAL
  - Hardcoded strings: Admin access, Active/Inactive, Activated, Deactivated, Tier updated, Deleted
  - Tab labels: Users, Accountability, Patients, Healthcare Providers, Hospitals, ER Providers, Pharmacies, Insurers, Admin
  - Table headers: Name, Contact, City, Tier, Status, Actions
  - Buttons: Add, Edit, Delete, Invite Staff, Search
  - Dialog labels: Add provider, Hospital, Emergency Response, Pharmacy
  - Status filters: Active, Inactive, All
  - ~35 translation keys needed

**Supporting Files:**
- [ ] HolarcHelpAccountability.tsx
- [ ] HolarcHelpProviderIncidents.tsx

### Category 2: Emergency/Incident Management (150+ lines)
- [ ] HolarcHelpIncidents.tsx (82 lines)
- [ ] HolarcHelpIncidentDetail.tsx
- [ ] HolarcHelpContacts.tsx
- [ ] HolarcHelpNearby.tsx
- [ ] HolarcHelpHome.tsx

**Key Strings:**
- Incident status: NEW, ACTIVE, COMPLETED
- Severity: Critical, High, Medium, Low
- Actions: View, Assign, Reassign, Complete, Close
- ~15-20 keys per file

### Category 3: Ambulance Provider Screens (213+ lines)
- [ ] **EmergencyDashboardScreen.tsx** (213 lines) - CRITICAL
  - Status labels: NEW, ACTIVE, COMPLETED
  - Severity colors: Critical, High, Medium, Low
  - Incident types: Self-created, From Hospital
  - Filter buttons, stats headers
  - ~20 translation keys

- [ ] AffiliatedHospitalsScreen.tsx
- [ ] HospitalNetworkScreen.tsx
- [ ] HospitalsDirectoryScreen.tsx

### Category 4: Hospital Operations (300+ lines)
- [ ] HospitalOpsLayout.tsx (48 lines)
- [ ] HospitalOpsDashboard.tsx
- [ ] ActiveDispatchScreen.tsx
- [ ] DispatchAssignmentScreen.tsx
- [ ] DispatchReassignmentScreen.tsx
- [ ] DispatchQueueScreen.tsx
- [ ] HospitalSelectionScreen.tsx
- [ ] HospitalIncidentConsole.tsx

**Key Strings:**
- Dispatch status: Active, Pending, Complete
- Actions: Assign, Reassign, Dispatch, Cancel
- Queue labels, incident lists
- ~15 keys per file

### Category 5: Components & Supporting Files (1,000+ lines)
- [ ] HospitalInboundListener.tsx
- [ ] HospitalAdmissionEditor.tsx (multiple versions)
- [ ] AmbulanceHospitalAffiliations.tsx
- [ ] EmergencyContactsSection.tsx
- [ ] EmergencyContactsInline.tsx
- [ ] HospitalPicker.tsx
- [ ] EmergencyPatientContext.tsx
- [ ] HolarcHelpGate.tsx
- [ ] InviteStaffDialog.tsx

**Key Strings:**
- Form labels: Email, Phone, Name, Organization
- Buttons: Save, Cancel, Add, Remove, Confirm
- Messages: Success, Error, Confirmation
- ~5-10 keys per component

---

## Implementation Strategy

### Phase 3B-1: Translation Key Design (1 hour)
**Tasks:**
1. [ ] Review all 35 files for hardcoded strings
2. [ ] Create comprehensive translation key schema
3. [ ] Organize keys by module:
   - `holarcHelp.admin.*`
   - `holarcHelp.emergency.*`
   - `holarcHelp.ambulance.*`
   - `holarcHelp.hospital.*`
   - `holarcHelp.components.*`
4. [ ] Document all keys in central reference

**Estimated Keys:** 150-200 total

### Phase 3B-2: Core Files Implementation (3 hours)
**Template Priority Order:**
1. [ ] **HolarcHelpProviders.tsx** (Template model)
   - Add useTranslation import and hook
   - Replace all hardcoded strings with t() calls
   - Create 35+ translation keys
   - Test template thoroughly

2. [ ] **EmergencyDashboardScreen.tsx** (Apply pattern)
   - Follow HolarcHelpProviders.tsx pattern
   - Implement 20 translation keys
   - Verify instant language switching

3. [ ] All Category 2 files (HolarcHelpIncidents, Detail, Contacts, etc.)
4. [ ] All Category 3 files (Ambulance screens)
5. [ ] All Category 4 files (Hospital operations)

### Phase 3B-3: Components Implementation (1.5 hours)
- [ ] Implement Category 5 supporting components
- [ ] Focus on high-visibility components first
- [ ] Low-priority components can use defaults

### Phase 3B-4: Language Files Update (30 minutes)
- [ ] Add all 150-200 Phase 3B keys to all 25 language files
- [ ] Structure: `holarcHelp` object with nested categories
- [ ] Verify key presence across all files

### Phase 3B-5: Testing & Validation (2 hours)
- [ ] Test Spanish + French (optimized approach)
- [ ] Navigate through all Phase 3B screens
- [ ] Verify:
  - [ ] All text translates correctly
  - [ ] No English text visible in other languages
  - [ ] Instant language switching (no page reload)
  - [ ] No console errors
  - [ ] Admin functionality works
  - [ ] Emergency screens display correctly

---

## Translation Key Schema

```javascript
// Phase 3B Translation Structure
{
  "holarcHelp": {
    "admin": {
      "title": "User Management",
      "description": "Manage users and accountability",
      "tabs": {
        "users": "Users",
        "accountability": "Accountability",
        "patients": "Patients",
        "healthcare": "Healthcare Providers",
        "hospitals": "Hospitals",
        "ambulance": "ER Providers",
        "pharmacies": "Pharmacies",
        "insurers": "Insurers",
        "admin": "Admin"
      },
      "status": {
        "active": "Active",
        "inactive": "Inactive",
        "all": "All"
      },
      "messages": {
        "adminAccessRequired": "Admin access required",
        "activated": "Activated",
        "deactivated": "Deactivated",
        "tierUpdated": "Tier updated",
        "deleted": "Deleted"
      },
      "actions": {
        "add": "Add",
        "edit": "Edit",
        "delete": "Delete",
        "inviteStaff": "Invite staff",
        "search": "Search"
      }
    },
    "emergency": {
      "dashboard": {
        "title": "Emergency Dashboard",
        "status": {
          "new": "NEW",
          "active": "ACTIVE",
          "completed": "COMPLETED"
        },
        "severity": {
          "critical": "Critical",
          "high": "High",
          "medium": "Medium",
          "low": "Low"
        }
      },
      "dispatch": {
        "title": "Dispatch Management",
        "status": {
          "active": "Active",
          "pending": "Pending",
          "complete": "Complete"
        }
      }
    }
  }
}
```

---

## Success Criteria

✅ All 35+ Phase 3B files have useTranslation hook  
✅ 150-200 translation keys created and implemented  
✅ All keys present in all 25 language files  
✅ Spanish + French tested and verified  
✅ No hardcoded English text visible in non-English modes  
✅ Instant language switching (no page reloads)  
✅ No console errors  
✅ Admin functionality fully working  
✅ Emergency screens fully functional  

---

## Next Steps After Phase 3B

1. **Phase 3C:** Admin & Remaining Screens
2. **Phase 4:** Settings, Notifications, Help screens
3. **Full App Deployment:** All 35+ screens in 25 languages
4. **User Testing:** Real-world language testing with international users

---

## Notes

- Use Phase 3A (HolarcHelpProviders/PatientDashboard) as exact template
- Same file structure, same naming conventions
- Reuse AdminPage, dialog patterns from existing code
- Test on production site https://www.holarchealth.com/
- Commit after every 3-4 files for safety
