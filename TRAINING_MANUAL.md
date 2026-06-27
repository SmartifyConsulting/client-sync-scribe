# Holarc Health Platform - Training Manual

**Version:** 1.0  
**Date:** June 27, 2026  
**Status:** Complete

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [User Roles & Access](#user-roles--access)
4. [Module 1: Vehicle Abuse Prevention](#module-1-vehicle-abuse-prevention)
5. [Module 2: Incident & Dispatch Management](#module-2-incident--dispatch-management)
6. [Common Workflows](#common-workflows)
7. [Notifications & Alerts](#notifications--alerts)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)
10. [Appendix](#appendix)

---

## Executive Summary

Holarc Health is a comprehensive emergency response and fleet management platform designed for ambulance service providers and hospitals. This manual covers two critical modules:

- **Vehicle Abuse Prevention**: Monitor and prevent unauthorized vehicle use, speeding, harsh driving, and route deviations
- **Incident & Dispatch Management**: Create incidents, triage emergencies, recommend ambulances, and track live dispatches

### Key Benefits

✅ **Real-time Monitoring** - Track ambulances and incidents in real-time  
✅ **Intelligent Dispatch** - Smart ambulance recommendations based on location and availability  
✅ **Fleet Protection** - Prevent vehicle abuse and unauthorized usage  
✅ **Complete Audit Trail** - All actions logged for compliance and accountability  
✅ **Multi-level Authorization** - Role-based access control and approvals  

---

## System Overview

### Architecture

The Holarc Health platform is built on:
- **Frontend**: React 18 with TypeScript
- **Components**: shadcn/ui component library
- **Styling**: Tailwind CSS
- **Navigation**: React Router v6
- **Data Management**: Real-time state management with mock data integration

### User Portals

The platform provides separate portals for different users:

1. **Hospital Portal** (`/provider/hospital`)
   - For hospital coordinators and dispatchers
   - Manage incidents, dispatch ambulances, track resources
   - Monitor bed capacity, admissions, triage

2. **Ambulance/ER Provider Portal** (`/provider/ambulance`)
   - For ambulance services and paramedics
   - Receive incidents, track vehicles, monitor fleet
   - View active incidents and team status

### Key Features

| Feature | Location | Purpose |
|---------|----------|---------|
| Vehicle Abuse Prevention | Ambulance Portal > Vehicle Abuse | Monitor unauthorized vehicle use |
| Incident Creation | Hospital Portal > Dispatch Management | Log emergency calls |
| Dispatch Management | Hospital Portal > Dispatch Management | Assign and track ambulances |
| Fleet Monitoring | Ambulance Portal > Fleet | Track vehicle status and utilization |
| Live Tracking | Hospital Portal > Active Dispatch | Real-time dispatch monitoring |

---

## User Roles & Access

### Hospital Portal Users

#### Dispatcher/Coordinator
- **Access Level**: Full dispatch management
- **Permissions**:
  - Create new incidents
  - Recommend and assign ambulances
  - Select hospital destinations
  - Track active dispatches
  - Reassign dispatches if needed
  - Access dispatch queue and multi-incident board

#### Hospital Manager
- **Access Level**: Supervisory
- **Permissions**:
  - All dispatcher permissions
  - Manual override for emergency protocols
  - View dispatch analytics and reports
  - Access audit logs

#### Administrator
- **Access Level**: System administration
- **Permissions**:
  - All manager permissions
  - System configuration
  - User and role management
  - Protocol and rule configuration

### Ambulance Portal Users

#### Driver/Paramedic
- **Access Level**: Limited operational
- **Permissions**:
  - View assigned incidents
  - Track vehicle location
  - Update incident status
  - View vehicle abuse alerts

#### Ambulance Manager
- **Access Level**: Fleet management
- **Permissions**:
  - All driver permissions
  - Vehicle Abuse Prevention dashboard
  - Fleet overview and analytics
  - Report vehicle issues

---

## Module 1: Vehicle Abuse Prevention

### Overview

The Vehicle Abuse Prevention module monitors ambulance fleet vehicles to detect and prevent:
- Unauthorized vehicle usage
- Speeding and dangerous driving
- Route deviations from dispatch
- After-hours vehicle movement
- Harsh driving (rapid acceleration/braking)
- Unlinked trips without authorization

### Accessing the Module

**Path**: `/provider/ambulance/abuse`

**Steps**:
1. Log in to Ambulance Provider Portal
2. Click "Vehicle Abuse" in the left sidebar (⚠️ icon)
3. Dashboard loads with overview of all incidents

### Dashboard Overview

The main Vehicle Abuse Prevention dashboard displays:

#### Stat Cards (Top Section)
- **Critical Events**: Red count of life-safety risk events
- **High Risk**: Orange count of significant concerns
- **Medium Priority**: Yellow count of moderate issues
- **Total Events**: Blue count of all recorded events

#### Event List (Main Section)
Shows all vehicle abuse events with:
- **Ambulance Code** (e.g., AMB-001)
- **Event Type Badge** (color-coded)
- **Description** of the incident
- **Location** details
- **Timestamp** of the event
- **Review Button** to investigate

#### Tab Navigation
- **All Events**: Shows every recorded incident
- **Geofence**: Breach events (vehicle left authorized zone)
- **After-Hours**: Usage outside operating hours
- **Routes**: Deviation from assigned routes

---

### Screen-by-Screen Guide

#### 1. Vehicle Abuse Prevention Dashboard
**Route**: `/provider/ambulance/abuse`

**Purpose**: Overview of all vehicle abuse incidents

**What You'll See**:
- Stat cards with event counts by severity
- Filterable list of all incidents
- Color-coded severity indicators
- Real-time incident data

**Actions Available**:
- Click event row to see details
- Click "Review" to investigate incident
- Switch tabs to filter by incident type

**Tips**:
- Red critical events need immediate attention
- Use tabs to focus on specific incident types
- Events are sorted by severity and time

---

#### 2. Geofence Management Screen
**Route**: `/provider/ambulance/abuse/geofence`

**Purpose**: Create and manage geographic zones for vehicles

**What You'll See**:
- "Add Geofence" button
- Active Geofences list
- Restricted Zones section
- Coverage area calculations

**How to Create a Geofence**:
1. Click "Add Geofence" button
2. Enter geofence details:
   - **Name**: e.g., "Central Depot"
   - **Type**: Select from dropdown (Depot, Hospital, No-Go Zone, Service Center, Standby)
   - **Latitude & Longitude**: Geographic coordinates
   - **Radius (km)**: Coverage area
3. Click "Save Geofence"
4. Receive SMS confirmation

**Geofence Types**:
- **Depot**: Vehicle home base
- **Hospital**: Destination hospitals
- **No-Go Zone**: Restricted areas (vehicles must avoid)
- **Service Center**: Maintenance locations
- **Standby**: Rest areas

**Tips**:
- Set accurate radius for your coverage area
- No-Go zones prevent vehicle movement
- Coverage calculations show overlap protection

---

#### 3. Route Deviation Tracking
**Route**: `/provider/ambulance/abuse/routes`

**Purpose**: Monitor when ambulances deviate from dispatch routes

**What You'll See**:
- Deviation percentage for each trip
- Authorized vs. Actual distance
- Extra distance traveled
- Incident references and timestamps

**How to Review a Route Deviation**:
1. Click event row
2. View:
   - Starting location (e.g., Main Depot)
   - Destination (e.g., Central Hospital)
   - Authorized distance (e.g., 15.2 km)
   - Actual distance traveled (e.g., 22.8 km)
   - Extra distance (7.6 km)
3. Click "Review" to investigate
4. Check incident notes for explanation

**Deviation Levels**:
- **0-5%**: Normal (acceptable variance)
- **5-15%**: Medium (monitor)
- **15%+**: High (investigate)

**Common Reasons for Deviation**:
- Traffic conditions
- Navigation errors
- Wrong address provided
- Emergency detour

---

#### 4. After-Hours Vehicle Use
**Route**: `/provider/ambulance/abuse/hours`

**Purpose**: Detect unauthorized vehicle movement outside operating hours

**What You'll See**:
- Critical Events count
- High Risk count
- Total Events count
- After-hours incident list

**Event Types in After-Hours**:
- **Unauthorized Start**: Vehicle started outside shift
- **Extended Hours**: Operation beyond scheduled end
- **Unauthorized Movement**: Vehicle movement with no active shift

**How to Review an After-Hours Event**:
1. Click event row
2. View:
   - Ambulance code
   - Event type
   - Time of occurrence
   - Location
   - Duration (unauthorized minutes)
   - Authorized shift end time
3. Click "Investigate" button
4. Contact vehicle operator for explanation

**Authorization Rules**:
- Vehicles only operate during assigned shift hours
- Extended operations need supervisor approval
- Off-hours use triggers immediate alert

---

#### 5. Unlinked Trips Detection
**Route**: `/provider/ambulance/abuse/trips`

**Purpose**: Identify vehicle movement without authorized purpose

**What You'll See**:
- High Risk Trips count
- Unauthorized Distance (total km)
- Total Trips count
- Trip detail list

**Trip Authorization Requirements**:
- Active incident dispatch
- Scheduled maintenance
- Fuel stop
- Other approved purpose

**How to Review an Unlinked Trip**:
1. Click trip row
2. View:
   - Start location
   - End location
   - Distance traveled
   - Duration
   - Time period
3. Click "Authorize" if trip is legitimate
4. Or "Investigate" if unauthorized

**Authorization Workflow**:
1. Driver submits explanation
2. Supervisor reviews
3. Trip marked as Authorized/Denied
4. Record updated in audit log

---

### Vehicle Abuse Workflows

#### Workflow 1: Investigating a Geofence Breach

**Scenario**: AMB-001 left authorized depot zone

**Steps**:
1. Dashboard shows "GEOFENCE BREACH" event
2. Click the event row
3. View:
   - Geofence name: "Central Depot"
   - Vehicle code: "AMB-001"
   - Timestamp: when breach occurred
   - Location: where vehicle entered/exited
4. Determine if authorized:
   - ✓ Authorized: Click "Authorize"
   - ✗ Unauthorized: Click "Escalate"
5. Contact crew for explanation
6. Update incident status
7. Action is logged automatically

#### Workflow 2: Addressing Speeding Event

**Scenario**: AMB-002 caught speeding in school zone

**Steps**:
1. Dashboard shows "SPEEDING" event
2. Click "Review" button
3. View:
   - Location: School zone (60 km/h limit)
   - Recorded speed: 85 km/h
   - Duration: 2 minutes
   - Crew: John Smith & Sarah Jones
4. Determine severity:
   - First offense: Warning
   - Repeat offender: Disciplinary action
5. Click "Send Warning"
6. Notification sent to crew lead
7. Incident marked as "Reviewed"

#### Workflow 3: Resolving After-Hours Usage

**Scenario**: AMB-003 started at 22:45, after 22:00 shift end

**Steps**:
1. Dashboard shows "UNAUTHORIZED START" event
2. Click event
3. View:
   - Authorized shift end: 22:00
   - Actual start time: 22:45
   - Location: Depot
   - Duration: 45 minutes
4. Determine cause:
   - ✓ Emergency dispatch: Authorize with note
   - ✗ Personal use: Escalate
5. Contact crew immediately
6. Review dispatch logs
7. Document findings
8. Update crew record

---

## Module 2: Incident & Dispatch Management

### Overview

The Incident & Dispatch Management module is the core of emergency response operations. It enables:
- Receiving and logging emergency calls
- Determining incident severity and type
- Recommending appropriate ambulances
- Assigning resources
- Real-time dispatch tracking
- Multi-incident management

### Accessing the Module

**Path**: `/provider/hospital/dispatch`

**Steps**:
1. Log in to Hospital Portal
2. Click "Dispatch Management" in left sidebar (⚡ icon)
3. Multi-Incident Board loads showing all active incidents

### The Incident Workflow

The incident workflow follows these steps:

```
CREATE INCIDENT
    ↓
CAPTURE LOCATION
    ↓
TRIAGE ASSESSMENT
    ↓
RECOMMEND AMBULANCE
    ↓
DISPATCH ASSIGNMENT
    ↓
ACTIVE DISPATCH TRACKING
```

---

### Screen-by-Screen Guide

#### 1. Create New Incident Screen
**Route**: `/provider/hospital/incident/create`

**Purpose**: Receive and log emergency call details

**Form Fields**:

**Caller Information**
- **Caller Name** (required): Person calling for help
- **Phone Number** (required): Contact number
- **Caller Location**: Where the caller is

**Emergency Details**
- **Emergency Type** (required):
  - Medical Emergency
  - Trauma/Accident
  - Cardiac Event
  - Respiratory Distress
  - Other

- **Priority Level** (required): Quick severity assessment
  - 🔴 Critical: Life-threatening
  - 🟠 High: Serious condition
  - 🟡 Medium: Stable but urgent
  - 🔵 Low: Non-emergency

- **Description** (required): Detailed explanation of emergency

**Patient Information** (Optional)
- **Age**: Patient age
- **Gender**: Patient gender

**How to Create an Incident**:
1. Answer phone and click "Create New Incident"
2. Fill in caller details
3. Select emergency type from dropdown
4. Choose priority level (usually based on call)
5. Write detailed description of symptoms/injuries
6. Fill patient age/gender if known
7. Click "Next: Capture Location"

**Tips**:
- Get accurate caller details first
- Listen carefully to determine correct priority
- Record exact symptoms reported by caller
- Ask for age/gender if not immediately apparent

---

#### 2. Incident Location Capture
**Route**: `/provider/hospital/incident/create/location`

**Purpose**: Determine exact incident location using multiple methods

**Location Input Methods**:

**📝 Manual Address Entry**
- Fastest method
- Enter street address or landmark
- Example: "123 Main St, Downtown" or "Shopping Centre near City Mall"
- Best when: Caller provides clear address

**📍 GPS Location**
- Click "Get My Location"
- System requests device GPS
- Automatic coordinate capture
- Best when: Using mobile device on-site

**🗺️ What3Words Code**
- Enter unique 3-word code
- Example: "table.cloth.horse"
- Pinpoints exact 3m x 3m location
- Best when: Caller has access to What3Words app

**🏥 Search Landmark**
- Search hospitals, malls, schools, etc.
- System auto-suggests matches
- Provides standardized location
- Best when: Location is near known landmark

**How to Capture Location**:
1. Choose preferred method
2. If Manual: Type address
3. If GPS: Click button and allow location access
4. If What3Words: Enter code
5. If Landmark: Type and select from suggestions
6. Confirm location appears in summary
7. Click "Next: Triage Assessment"

**Location Tips**:
- Verify location with caller before proceeding
- Use GPS when caller is on scene
- Use landmarks for recognizable locations
- Manual entry for known addresses
- Always confirm in summary box

---

#### 3. Incident Triage Assessment
**Route**: `/provider/hospital/incident/create/triage`

**Purpose**: Categorize incident by severity, type, and urgency

**Assessment Fields**:

**Severity Level** (4 options)
- 🔴 **Critical**: Immediate life threat
- 🟠 **High**: Serious condition, rapid care needed
- 🟡 **Medium**: Requires treatment, not immediately life-threatening
- 🔵 **Low**: Minor injury or illness

**Incident Type**
- Trauma
- Medical
- Cardiac
- Respiratory
- Obstetric
- Paediatric
- Other

**Response Urgency**
- ⚡ **Immediate**: Life-threatening, needs response ASAP (0-5 min)
- 🚑 **Urgent**: Serious, quick response needed (5-15 min)
- 📋 **Delayed**: Stable but treatment required (15-30 min)
- 🔵 **Routine**: Non-urgent (30+ min acceptable)

**Vital Signs Assessment**
- **Consciousness**: Alert / Responsive / Unresponsive
- **Breathing**: Normal / Difficulty / Severe Distress
- **Bleeding**: None / Minor / Moderate / Severe

**Additional Notes**: Free text for clinical observations

**How to Perform Triage**:
1. Review caller's description
2. Select appropriate severity level
3. Choose incident type
4. Determine response urgency
5. Assess consciousness level (ask if responsive)
6. Ask about breathing difficulty
7. Ask about visible bleeding
8. Add clinical notes
9. Click "Next: Find Ambulance"

**Triage Tips**:
- Listen to voice tone - distress indicates higher severity
- Ask direct questions about breathing/consciousness
- When in doubt, choose higher urgency
- Document all findings in notes
- Use urgency level to guide ambulance selection

---

#### 4. Nearest Ambulance Recommendation
**Route**: `/provider/hospital/incident/create/recommend-ambulance`

**Purpose**: Identify and select the nearest available ambulance

**What You'll See**:
- List of available ambulances ranked by distance
- For each ambulance:
  - **Code**: Vehicle identifier (AMB-001)
  - **Distance**: Distance from incident (e.g., 2.3 km)
  - **ETA**: Estimated arrival time (e.g., 7 minutes)
  - **Crew**: Paramedics assigned (e.g., "John Smith & Sarah Jones")
  - **Status**: Current availability
  - **Location**: Current vehicle location
  - **Type**: Vehicle capability level

**Ambulance Ranking**:
- List is automatically sorted by distance
- Closest ambulance is first recommendation
- All available ambulances shown

**How to Select an Ambulance**:
1. Review recommended list (sorted by proximity)
2. Verify ambulance status shows "Available"
3. Consider:
   - ETA matches urgency level
   - Crew experience matches incident type
   - Vehicle type appropriate
4. Click on ambulance row to select
5. Selected row highlights in blue
6. Review summary box at bottom
7. Click "Dispatch Ambulance"

**Selection Criteria**:
- **Critical/Immediate**: Select closest (shortest ETA)
- **High/Urgent**: Select closest with appropriate capability
- **Medium/Delayed**: Can select by crew experience
- **Routine**: Can select based on crew preference

**Tips**:
- Always verify "Available" status
- Consider crew experience for complex incidents
- Use closest ambulance unless unavailable
- Check vehicle type matches needs
- Confirm ETA is acceptable for urgency level

---

#### 5. Dispatch Assignment Screen
**Route**: `/provider/hospital/incident/create/dispatch-assignment`

**Purpose**: Finalize dispatch details and send to crew

**What You'll See**:
- Dispatch Details summary (ambulance, incident, crew, contact)
- Hospital Destination selector
- Route Priority options
- Special Instructions text area
- Notification recipients list

**Dispatch Details**:
- Pre-filled from previous selections
- Shows ambulance code, incident ID, crew lead, contact

**Hospital Destination**:
- Dropdown menu of available hospitals
- Shows specialties, bed availability, current wait times
- Select most appropriate facility

**Route Priority** (3 options):
- ✈️ **Fastest Route**: Quickest time, may use major roads
- 🛡️ **Safest Route**: Avoids dangerous areas
- ⚖️ **Standard Route**: Balanced approach

**Special Instructions**:
- Access notes, building entry info
- Patient allergies or special needs
- Hazards at scene
- Any special considerations

**Notification Recipients**:
- ✓ Crew Lead (SMS/app)
- ✓ Hospital Destination (system notification)
- ✓ Dispatch Control Center (logged)

**How to Complete Dispatch**:
1. Verify dispatch details are correct
2. Select hospital destination from dropdown
3. Choose route priority (usually "Fastest")
4. Enter special instructions if applicable:
   - "Gate code 1234 for building access"
   - "Patient may be combative"
   - "Watch for broken glass on driveway"
5. Review notification recipients
6. Click "Send Dispatch"
7. Confirmation shows dispatch sent
8. Crew receives SMS immediately

**Dispatch Tips**:
- Always include access instructions
- Mention patient hazards (combative, contagious, etc.)
- Choose nearest appropriate hospital
- Fastest route usually best for emergencies
- Double-check ambulance and incident details

---

#### 6. Active Dispatch Screen
**Route**: `/provider/hospital/incident/active-dispatch/:ambulanceId`

**Purpose**: Track single active dispatch in real-time

**What You'll See**:
- **Status Card**: Current dispatch status
- **Location & Route**: Current location and navigation info
- **Patient Status**: Current patient condition
- **Crew Communication**: Contact options
- **Dispatch Timeline**: Event history

**Status Indicators**:
- 🟦 **En Route**: Traveling to incident
- 🟧 **On Scene**: At incident location
- 🟪 **Transporting**: Patient in vehicle
- 🟩 **Arrived**: At hospital destination

**Location Information**:
- Current address/location
- Distance remaining
- ETA to destination
- Navigation link to view live map

**Patient Status Updates**:
- Current patient condition
- Vital signs if available
- Special notes from crew

**Crew Communication**:
- **Call Crew Lead**: Direct phone contact
- **Send SMS**: Text message
- **Open Chat**: In-app messaging

**Dispatch Timeline**:
- Dispatch sent
- Crew acknowledged
- En route to incident
- Arrived at incident
- Transporting patient
- Arrived at hospital

**How to Monitor Active Dispatch**:
1. Click dispatch from queue
2. Review current status
3. Monitor location and ETA
4. Check patient status updates
5. Contact crew if needed:
   - Click "Call Crew Lead" for urgent questions
   - Click "Send SMS" for updates
   - Click "Open Chat" for messages
6. Watch timeline for status changes
7. Page auto-updates every 30 seconds

**Monitoring Tips**:
- Watch ETA countdown
- Follow location on map
- Monitor patient status
- Only call for critical issues
- Document all updates

---

#### 7. Dispatch Queue Screen
**Route**: `/provider/hospital/dispatch-queue`

**Purpose**: Monitor all dispatches across all statuses

**Queue Status Types**:
- 🟨 **Waiting**: Incident created, awaiting ambulance
- 🟦 **Active**: Currently being transported
- 🟥 **Delayed**: Longer than expected ETA
- 🟩 **Completed**: Delivered to hospital

**Queue Display**:
- Status card with counts
- Sortable/filterable list
- Color-coded by status
- Priority badges on each dispatch

**Queue Actions**:
- **View**: See dispatch details
- **Quick Assign**: Reassign ambulance (waiting)
- **Escalate**: Escalate delayed dispatch

**How to Use Dispatch Queue**:
1. Navigate to Dispatch Queue
2. Monitor status counts at top
3. Click filter buttons to view by status:
   - All: All dispatches
   - Waiting: Need ambulances
   - Active: Currently responding
   - Delayed: Taking longer
   - Completed: Finished
4. For waiting dispatches: Click "Quick Assign"
5. For delayed dispatches: Click "Escalate"
6. Regularly check for new waiting items

**Queue Management Tips**:
- Waiting dispatches should be minimal
- Escalate any delayed beyond 5 mins
- Monitor active count capacity
- Prioritize critical incidents

---

#### 8. Multi-Incident Dispatch Board
**Route**: `/provider/hospital/dispatch`

**Purpose**: High-level overview of all active incidents

**Board Views**:
- **Grid View**: Card layout of all incidents
- **List View**: Compact list format

**Incident Cards Show**:
- Incident ID (e.g., INC-2024-001)
- Priority (color-coded)
- Location
- Response status
- Patient count
- Time elapsed
- Assigned ambulances

**Color Coding**:
- 🔴 **Red**: Critical
- 🟠 **Orange**: High
- 🟡 **Yellow**: Medium
- 🔵 **Blue**: Low

**Status Indicators**:
- 🆕 **New**: Just created, not assigned
- ✓ **Assigned**: Ambulance selected
- 🚑 **En Route**: Ambulance traveling
- 📍 **On Scene**: Ambulance at location
- 🏥 **Transporting**: Patient in vehicle

**How to Use Dispatch Board**:
1. Navigate to Dispatch Management
2. View all incidents at a glance
3. Red critical incidents demand attention
4. Click incident card to see details
5. Click "Dispatch Ambulance" for new incidents
6. Monitor progress of active dispatches
7. Switch to list view for detailed info

**Board Management Tips**:
- Focus on red critical incidents first
- Ensure all incidents have ambulances
- Monitor time elapsed
- Watch for delayed incidents
- Use to identify bottlenecks

---

#### 9. Hospital Destination Selection
**Route**: `/provider/hospital/incident/create/hospital-selection`

**Purpose**: Choose appropriate hospital for patient

**Hospital Information Shown**:
- **Hospital Name**
- **Distance**: From incident
- **ETA**: Estimated travel time
- **Specialties**: Available services
- **Capacity**: Beds available by type
- **Wait Time**: Current ER wait
- **Contact**: Direct number

**Bed Types**:
- **Trauma**: Surgical emergency beds
- **Cardiac**: Cardiology beds
- **Medical**: General medical beds

**Hospital Selection Criteria**:
- 🏥 **Closest hospital**: Usually best for critical
- 🟩 **Shortest wait**: If multiple options
- 🟧 **Specialty match**: e.g., Cardiac to cardiac facility
- 🏨 **Bed availability**: Choose if others full

**Wait Time Colors**:
- 🟩 **Green** (0-30 min): Accept wait
- 🟨 **Yellow** (30-45 min): Consider alternatives
- 🟥 **Red** (45+ min): Find alternative if possible

**How to Select Hospital**:
1. Review recommended hospitals (sorted by distance)
2. Click on hospital card to select
3. Consider:
   - ETA appropriate for urgency
   - Specialties match incident type
   - Wait time acceptable
   - Bed availability
4. Click "Confirm Selection"
5. Selected hospital moves to dispatch screen

**Hospital Selection Tips**:
- Always use closest for critical incidents
- Check wait times for non-critical
- Consider specialty for cardiac/trauma
- Confirm beds available
- Verify contact number is current

---

#### 10. Dispatch Reassignment Screen
**Route**: `/provider/hospital/dispatch-reassign/:incidentId`

**Purpose**: Change ambulance assignment for active dispatch

**Current Assignment Info**:
- Current ambulance code
- Location
- Status
- Contact number
- ETA to incident

**Reassignment Reasons**:
- 🔧 Vehicle Breakdown
- 🚨 Crew Emergency
- 📍 Better Available Location
- ⚙️ Capability Mismatch
- 🚗 Traffic Conditions
- 📝 Other

**Available Ambulances** (Shown):
- Distance from incident
- ETA
- Current status
- Crew lead name

**How to Reassign Dispatch**:
1. Click "Reassign" on active dispatch
2. Review current assignment
3. Select reassignment reason
4. Choose new ambulance from list
5. Compare ETAs (new vs. current)
6. Confirm change in summary
7. Click "Confirm Reassignment"
8. Previous crew receives notice
9. New crew gets updated dispatch

**Reassignment Tips**:
- Minimize reassignments (confuses crews)
- Only reassign for good reason
- Always choose closest available
- Document reason clearly
- Notify crews immediately

---

#### 11. Manual Override Screen
**Route**: `/provider/hospital/manual-override`

**Purpose**: Emergency protocol bypass with authorization

**Override Types**:
- Skip Triage Assessment
- Force Immediate Dispatch
- Bypass Response Protocol
- Emergency System Override

**When to Use Override**:
- Life-threatening emergency
- Standard workflow causes delay
- Critical patient needs immediate dispatch
- System errors or issues

**Override Process**:
1. Click "Manual Override"
2. Select override type
3. Provide detailed justification
4. Select authorization level needed (Supervisor/Manager/Admin)
5. Confirm supervisor approval (required)
6. Add audit notes
7. Click "Apply Override"

**Authorization Levels**:
- **Supervisor**: Minor protocol bypasses
- **Manager**: Significant protocol changes
- **Admin**: System-wide overrides

**Important Warnings**:
- ⚠️ All overrides are permanently logged
- ⚠️ Misuse can result in disciplinary action
- ⚠️ Only use in genuine emergencies
- ⚠️ Full incident details recorded

**Manual Override Tips**:
- Get authorization BEFORE applying
- Document reason thoroughly
- Avoid overuse
- Supervisors review all overrides
- Used for exceptions only

---

## Common Workflows

### Workflow A: Complete Emergency Response (End-to-End)

**Scenario**: Call comes in for car accident with injuries

**Step 1: Receive Call**
- Phone rings, dispatcher picks up
- Caller reports: "Multi-car accident on Main Street, people trapped"

**Step 2: Create Incident**
- Dispatcher navigates to "Create New Incident"
- Enters:
  - Caller Name: "Jane Smith"
  - Phone: "+27 11 555 1234"
  - Emergency Type: "Trauma/Accident"
  - Priority: "Critical" 🔴
  - Description: "Multi-car MVA, Main Street near traffic lights. Multiple patients, possible entrapment."

**Step 3: Capture Location**
- Dispatcher asks caller: "What's your exact location?"
- Caller: "Main Street opposite the shopping mall"
- Dispatcher chooses "Landmark" method
- Types "Shopping Centre" → selects "City Shopping Mall"
- Confirms location: "Main Street near City Shopping Mall"

**Step 4: Triage**
- Dispatcher asks caller about patients
- "How many people are injured?" → "About 4 or 5"
- "Are they conscious?" → "Yes, but some in pain"
- "Any severe bleeding?" → "One has head bleeding"
- Selects:
  - Severity: Critical
  - Type: Trauma
  - Urgency: Immediate
  - Consciousness: Responsive
  - Bleeding: Moderate
  - Notes: "Multi-trauma MVA, possible head injury, multiple patients"

**Step 5: Select Ambulances**
- System recommends:
  - AMB-001: 2.3 km, 7 min ETA
  - AMB-002: 3.1 km, 9 min ETA
  - AMB-003: 4.5 km, 13 min ETA
- For critical trauma, dispatcher selects first TWO ambulances:
  - Primary: AMB-001 (closest)
  - Backup: AMB-002
- Creates two dispatches (system handles or manual)

**Step 6: Dispatch & Assign**
- For AMB-001:
  - Selects hospital: "Central Hospital" (trauma specialist)
  - Route: "Fastest Route"
  - Instructions: "Multi-patient scene, Main Street near shopping mall. Gate code 1234. Possible head injury and trapped patient - fire service may be on scene."
  - Click "Send Dispatch"
- For AMB-002:
  - Repeat for backup ambulance

**Step 7: Track Dispatch**
- Dispatcher opens "Active Dispatch" for AMB-001
- Monitors:
  - Status changes (En Route → On Scene → Transporting)
  - Location in real-time
  - Patient status updates
  - Crew updates via chat
- Contacts crew via SMS: "Confirm arrival at scene"

**Step 8: Hospital Coordination**
- Central Hospital receives notice
- Hospital prepares trauma team
- When ambulance departs scene, hospital notified of ETA
- Trauma team ready when ambulance arrives

**Result**: Well-coordinated multi-patient emergency response

---

### Workflow B: Preventing Vehicle Abuse (Geofence Breach)

**Scenario**: Ambulance leaves authorized zone

**Step 1: Alert Triggered**
- System detects AMB-002 exited "Central Depot" geofence
- Alert appears on Vehicle Abuse Prevention dashboard
- Badge shows: "GEOFENCE BREACH"

**Step 2: Initial Review**
- Fleet manager clicks event
- Views:
  - Vehicle: AMB-002
  - Geofence: Central Depot (authorized zone)
  - Time: 14:35
  - Location: Left zone toward North District

**Step 3: Investigation**
- Fleet manager checks:
  - Active dispatch log: "INC-2024-003 - Incident at North Hospital"
  - Dispatch assignment: AMB-002 assigned to transport patient
  - Hospital destination: North Hospital (legitimate)
- Conclusion: Authorized departure

**Step 4: Authorization**
- Fleet manager clicks "Authorize"
- Notes: "Patient transport to North Hospital (authorized dispatch)"
- System records authorization
- Event marked as "Reviewed"

**Step 5: Documentation**
- Incident logged in AMB-002's vehicle record
- Audit trail shows: "Breach authorized - legitimate dispatch"
- Fleet metrics updated

**Tips for Geofence Management**:
- Establish clear zones (depots, hospitals, no-go areas)
- Regular radius reviews (too tight causes false alerts)
- Maintain geofence map for all staff
- Train drivers on geofence locations
- Review breaches monthly

---

## Notifications & Alerts

### Notification Types

| Notification | Trigger | Recipients | Medium |
|--------------|---------|-----------|--------|
| Dispatch Assignment | Ambulance assigned | Crew Lead | SMS + App |
| Dispatch Update | Status change | Crew + Control | App + System |
| Critical Event | High priority incident | Supervisors | SMS + Email |
| Vehicle Abuse Alert | Speeding/breach detected | Fleet Manager | App + Email |
| Geofence Breach | Vehicle leaves zone | Fleet Manager | App |
| After-Hours Alert | Vehicle use outside shift | Fleet Manager | Email |
| Hospital Notification | Patient en route | Hospital Ops | System |
| Dispatch Override | Manual override used | Supervisors | Email |

### How Notifications Work

**Crew Receives Dispatch**:
1. Dispatcher sends dispatch
2. Crew receives SMS: "INC-2024-001 at Main St. Respond to Central Hospital. 7 min ETA."
3. Crew receives app notification with full details
4. Crew confirms acknowledgment
5. Dispatcher sees confirmation in Active Dispatch

**Fleet Manager Receives Alert**:
1. Vehicle abuse event detected
2. Fleet manager sees alert in Vehicle Abuse dashboard
3. Email notification sent
4. Event appears in their inbox
5. Dashboard highlights new incidents in red

### Managing Notifications

**To View Recent Notifications**:
1. Check dashboard alerts
2. Open notifications inbox
3. Filter by type/date
4. Archive or delete as needed

**To Disable Notifications**:
1. Go to Settings
2. Navigate to Notifications
3. Toggle notification types on/off
4. Choose delivery methods (SMS/Email/App)

---

## Troubleshooting

### Issue: Ambulance Not Appearing in Recommendations

**Causes**:
- Ambulance is not marked "Available"
- Ambulance is currently on another dispatch
- Ambulance failed system health check
- Location tracking unavailable

**Solution**:
1. Check ambulance status on Fleet screen
2. Verify ambulance is not on active dispatch
3. Contact fleet manager if issue persists
4. Manual Override may be needed

---

### Issue: Location Not Capturing Correctly

**Causes**:
- GPS disabled or no signal
- Incorrect address entered
- What3Words code not recognized
- Device permissions not granted

**Solution**:
1. Try different location input method
2. Verify GPS is enabled
3. Allow app location permissions
4. Use landmark search as fallback
5. Manually enter known address

---

### Issue: Dispatch Not Reaching Crew

**Causes**:
- Crew device offline
- Poor cellular signal
- Phone number incorrect
- SMS service issue

**Solution**:
1. Verify crew phone number
2. Try calling crew directly
3. Send SMS message from dispatch screen
4. Check crew device status
5. Use backup communication method

---

### Issue: Vehicle Abuse Alert Incorrect

**Causes**:
- GPS inaccuracy (false geofence breach)
- Scheduled maintenance misclassified
- After-hours shift change timing issue
- Route data incomplete

**Solution**:
1. Verify incident details
2. Check actual vehicle location
3. Review shift schedule
4. Click "Authorize" if legitimate
5. Report false positives to IT

---

### Issue: Can't Access Module Features

**Causes**:
- User role doesn't have permission
- Feature not enabled in settings
- System outage/maintenance
- Browser cache issue

**Solution**:
1. Verify your user role (ask supervisor)
2. Check feature availability in settings
3. Clear browser cache
4. Log out and log back in
5. Contact system administrator

---

## FAQ

### General Questions

**Q: What's the difference between priority levels?**  
A: Critical = life-threatening (0-5 min response), High = serious (5-15 min), Medium = needs treatment (15-30 min), Low = non-urgent (30+ min). Choose based on severity of condition reported.

**Q: Can I reassign a dispatch after sending?**  
A: Yes, if the ambulance situation changes (breakdown, emergency, better alternative available). Go to "Dispatch Reassignment" screen to change.

**Q: How long are dispatch records kept?**  
A: All dispatches are logged permanently in the system for audit and compliance purposes. Access historical records on the dashboard.

**Q: What should I include in "Special Instructions"?**  
A: Gate codes, building access info, hazards at scene, patient special needs, pets present, or any safety concerns the crew should know.

---

### Vehicle Abuse Prevention Questions

**Q: How do I create a new geofence?**  
A: Go to Vehicle Abuse → Geofence tab. Click "Add Geofence". Enter name, type, coordinates, and radius. Save.

**Q: What's the difference between No-Go and Depot geofences?**  
A: Depot = vehicles allowed to be there (home base). No-Go = vehicles must avoid (restricted area). System prevents movement into No-Go zones.

**Q: Why is there a route deviation alert if the driver took a longer route?**  
A: Route deviations are flagged for review - could be traffic, navigation error, or unauthorized detour. Always check before authorizing.

**Q: How do I authorize an after-hours vehicle use?**  
A: Go to After-Hours tab. Click the event. Review dispatch/maintenance reason. If legitimate, click "Investigate" and add authorization notes.

---

### Dispatch Management Questions

**Q: What's the fastest way to respond to an emergency?**  
A: Use Create Incident → Location Capture → Triage → Select Ambulance → Dispatch flow. Takes ~2-3 minutes total if all information available.

**Q: Can I send multiple ambulances to one incident?**  
A: Yes, create the incident once, then create multiple dispatches selecting different ambulances. All linked to same incident.

**Q: What does "Manual Override" do?**  
A: Bypasses standard protocols in genuine emergencies (e.g., skip triage to dispatch immediately). Requires supervisor approval and is permanently logged.

**Q: How do I know if a dispatch is successful?**  
A: Check Active Dispatch screen. Status changes from "Assigned" → "En Route" → "On Scene" → "Transporting" → "Arrived". Each step confirms progress.

**Q: Can dispatchers contact crews?**  
A: Yes, use Active Dispatch screen. Options: "Call Crew Lead" (phone), "Send SMS" (text), "Open Chat" (app messaging).

---

### System & Access Questions

**Q: I don't have access to a feature. What should I do?**  
A: Contact your administrator. Features depend on user role (Dispatcher, Manager, Admin). You may need role upgrade.

**Q: Can I undo a dispatch?**  
A: No, but you can reassign. Dispatch assignment is permanent once sent. If wrong ambulance selected, use "Dispatch Reassignment".

**Q: Are all actions logged?**  
A: Yes. Every dispatch, authorization, override, and vehicle abuse event is logged for audit purposes. Management can review logs anytime.

**Q: What happens if the system goes down?**  
A: Use emergency protocols. Manual dispatch procedures documented separately. Contact IT immediately. System should have 99.9% uptime.

---

## Appendix

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Create New Incident | Ctrl+N |
| View Dispatch Queue | Ctrl+D |
| Open Vehicle Abuse | Ctrl+V |
| Search Incidents | Ctrl+F |
| Save/Submit Form | Ctrl+S |
| Refresh Dashboard | Ctrl+R |

---

### Emergency Contact Numbers

**Dispatch Control**: +27 11 555 0000  
**System Support**: +27 11 555 0001  
**Medical Coordination**: +27 11 555 0002  
**Fleet Management**: +27 11 555 0003

---

### Glossary

**Ambulance Code**: Vehicle identifier (e.g., AMB-001)

**Dispatch**: Assignment of specific ambulance to incident

**ETA**: Estimated Time of Arrival

**Geofence**: Defined geographic zone with alerts when vehicle enters/exits

**Incident**: Emergency call/event requiring response

**Triage**: Assessment of emergency severity

**Vehicle Abuse**: Unauthorized or dangerous vehicle use

**Route Deviation**: Vehicle traveling different path than assigned

**After-Hours**: Outside normal operating shift times

**Manual Override**: Bypassing standard protocol in emergency

**Active Dispatch**: Ongoing response from ambulance assignment to hospital arrival

**Multi-Incident Board**: Dashboard showing all active incidents

---

### Document Information

**Version**: 1.0 Complete
**Last Updated**: June 27, 2026
**Created By**: Holarc Health Development Team
**Status**: Live Production

**For Updates/Corrections**: training@holarchealth.com

---

## Training Completion Checklist

After reading this manual, users should be able to:

- [ ] Navigate between Hospital and Ambulance portals
- [ ] Create a new emergency incident from scratch
- [ ] Capture incident location using multiple methods
- [ ] Perform triage assessment accurately
- [ ] Select and dispatch appropriate ambulances
- [ ] Track active dispatches in real-time
- [ ] Monitor dispatch queue and multi-incident board
- [ ] Access and review Vehicle Abuse Prevention events
- [ ] Manage geofences for vehicle tracking
- [ ] Authorize or escalate vehicle abuse incidents
- [ ] Use Manual Override when necessary
- [ ] Interpret notifications and alerts
- [ ] Troubleshoot common issues
- [ ] Understand role-based access controls
- [ ] Document and audit all actions

**Completion**: All items checked = User fully trained ✓

---

**END OF TRAINING MANUAL**

