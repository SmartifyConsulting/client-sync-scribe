# Holarc Health - Ambulance Provider Portal
## Complete Training Guide

**Version:** 2.0  
**Date:** June 27, 2026  
**Platform:** Renken ER Provider  

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Portal Access & Navigation](#portal-access--navigation)
3. [Emergency Response Operations](#emergency-response-operations)
4. [External Partnerships](#external-partnerships)
5. [Team & Fleet Management](#team--fleet-management)
6. [Analytics & Compliance](#analytics--compliance)
7. [Administration](#administration)
8. [Troubleshooting](#troubleshooting)
9. [Sample Data Reference](#sample-data-reference)

---

## System Overview

The Holarc Health Ambulance Provider Portal is designed for Emergency Response (ER) service providers to manage incidents, coordinate with hospitals, track fleet operations, and monitor team performance.

### Key Features
- **Real-time incident management** for self-created and hospital-originated emergencies
- **Unified fleet operations** with vehicle tracking and maintenance scheduling
- **Team performance monitoring** with driver licensing and safety tracking
- **Analytics and reporting** for operational excellence
- **Hospital integration** for seamless emergency coordination

### User Roles
- **Paramedic**: Can view incidents, update status, and track operations
- **Driver**: Can view assignments and update vehicle status
- **Fleet Manager**: Full access to fleet management and maintenance
- **Administrator**: Full system access including user management

---

## Portal Access & Navigation

### Logging In
1. Navigate to **https://holarchealth.com**
2. Click **"Log In as Provider"** or use your credentials
3. Select your organization (e.g., **Renken ER**) from the profile menu
4. You'll be directed to the **Active Incidents** dashboard

### Main Navigation Menu

The left sidebar organizes features into four tiers:

#### **🚨 EMERGENCY RESPONSE TIER** (Top Priority)
- **Active Incidents** - Your current active emergency calls
- **Live SOS** - Real-time SOS feed from patients
- **Incoming SOS** - New SOS calls awaiting response
- **Incident Management** - Unified management of all incidents
- **Incident History** - Past incidents and documentation

#### **🏥 EXTERNAL PARTNERSHIPS TIER**
- **Navigation** - Route planning and GPS integration
- **Hospitals** - Directory of partner hospitals
- **Affiliated Hospitals** - Your network of hospital affiliates

#### **👥 TEAM & FLEET TIER**
- **Team Status** - Driver availability and location
- **Fleet** - Vehicle management and maintenance
- **Vehicle Abuse** - Safety and compliance monitoring
- **Telematics** - Real-time tracking and analytics

#### **⚙️ ADMIN TIER**
- **User Admin** - Staff management and permissions

---

## Emergency Response Operations

### 1. Active Incidents Dashboard

**Access:** Click **"Active Incidents"** from sidebar (home screen)

#### What You'll See
- **Status bar** showing current shift status (ACTIVE MISSION, OFF SHIFT, START SHIFT)
- **Active incident count** and crew assignments
- **Live incident feed** with priority levels

#### Key Columns
| Column | Description |
|--------|-------------|
| Priority | CRITICAL (red), HIGH (orange), MEDIUM (yellow), LOW (blue) |
| Incident | Incident code and type (e.g., INC-2024-100) |
| Patient | Patient condition and vitals |
| Triggered | When the incident occurred |
| Response | Status (open, assigned, en route, arrived) |
| Action | Quick links to incident details |

#### What to Do
1. **Review incoming incidents** - Scan priority levels
2. **Assign ambulances** - Click "Assign" to deploy vehicles
3. **Track progress** - Monitor response status in real-time
4. **Update status** - Mark as "en route," "arrived," "treating," "transporting"
5. **View details** - Click on any incident for full information

---

### 2. Live SOS Feed

**Access:** Click **"Live SOS"** from sidebar

#### Purpose
Real-time stream of SOS calls from patients using the Holarc Health mobile app. These are the most critical incoming emergencies.

#### Screen Layout
- **Incident ID** - Unique call identifier
- **Patient Location** - GPS coordinates or address
- **Vital Signs** - Current health metrics
- **Condition** - Brief patient assessment
- **Time** - Call received timestamp
- **Dispatch Status** - Whether ambulance is assigned

#### Actions
- **Respond Now** - Accept and dispatch ambulance
- **View Location** - See map with patient location
- **Call Patient** - Direct phone contact
- **Assign Ambulance** - Select specific vehicle and crew

---

### 3. Incident Management

**Access:** Click **"Incident Management"** from sidebar

#### Overview
Unified management screen for ALL incidents:
- **Self-created incidents** (marked with 📋 badge)
- **Hospital-originated incidents** (marked with 🏥 badge)

#### Status Filter Tabs
- **All** - View all incidents
- **Pending** - Awaiting your response
- **Active** - Currently being handled
- **Completed** - Finished calls

#### For Hospital-Originated Incidents

When a hospital sends you an incident (marked with 🏥 FROM: Hospital Name):

**Two Options:**

1. **Accept** ✓
   - Click "Accept" button
   - Ambulance automatically dispatches
   - You're responsible for patient transport
   - Hospital tracks your ETA and status

2. **Decline** ✗
   - Click "Decline" button
   - Select reason from dropdown:
     - "No capacity at this time"
     - "Service area too far"
     - "Lack of required equipment/specialization"
     - "All units currently on emergency"
     - "Maintenance/vehicle issue"
     - "Staff shortage"
     - "Cannot reach location in required time"
     - "Other"
   - Hospital automatically finds alternative provider
   - You see their capacity status to inform your decision

#### Incident Details
- **Severity badge** - Color-coded priority
- **Status badge** - Current state of incident
- **Location** - Where patient is located
- **Received time** - When call came in
- **Distance** - How far from your location
- **Capacity** - Your current vehicle capacity percentage
- **Assigned ambulance** - Which vehicle is handling it
- **Description** - Medical notes and patient info

---

### 4. Incident History

**Access:** Click **"Incident History"** from sidebar

#### Purpose
Complete log of all past incidents for documentation and compliance

#### Searchable By
- Date range
- Incident type
- Severity level
- Patient name
- Hospital name (if hospital-originated)
- Outcome (treated & released, transported, deceased, etc.)

#### What's Recorded
- Complete incident timeline
- Patient assessment notes
- Treatment provided
- Hospital destination
- Outcome
- Crew members involved
- Equipment used
- Duration

#### Uses
- **Audit trail** for compliance
- **Training review** for quality improvement
- **Insurance documentation** for billing
- **Performance metrics** for your reports

---

## External Partnerships

### 5. Navigation

**Access:** Click **"Navigation"** from sidebar

#### Features
- **Real-time GPS tracking** of all your ambulances
- **Route optimization** using current traffic
- **ETA calculation** to hospital
- **Alternative route suggestions**
- **Traffic alerts** and road closures

#### Using Navigation
1. Select destination (patient location or hospital)
2. Choose preferred route (fastest, safest, smoothest)
3. Get turn-by-turn directions
4. System updates ETA as you drive
5. Hospital receives updated ETA in real-time

---

### 6. Hospitals Directory

**Access:** Click **"Hospitals"** from sidebar

#### Information Available
- Hospital name and location
- Departments and specialties
- Current bed availability
- ER wait time
- Trauma center designation
- Contact information
- Insurance accepted
- Protocols and procedures

#### Using the Directory
- **Search** by name or location
- **Filter** by specialty (trauma, cardiac, pediatric, etc.)
- **Sort** by distance or wait time
- **View details** for protocols
- **Call directly** from portal

---

### 7. Affiliated Hospitals

**Access:** Click **"Affiliated Hospitals"** from sidebar

#### What Are Affiliated Hospitals?
Hospitals that have formal agreements with you to:
- Send you emergency patients
- Receive your transports with priority
- Coordinate dispatch operations
- Share performance data

#### Benefits of Affiliation
- **Direct incident dispatch** - They send incidents directly to you
- **Capacity visibility** - You see their available beds in real-time
- **Priority routing** - Your ambulances get priority at their facility
- **Integrated billing** - Simplified payment processing

#### Your Affiliation Status
See which hospitals you're affiliated with and manage:
- Service area boundaries
- Preferred specialties
- Response time targets
- Contact protocols

---

## Team & Fleet Management

### 8. Team Status

**Access:** Click **"Team Status"** from sidebar

#### Live Team Dashboard
Real-time view of all your staff:

| Staff Member | Status | Location | Vehicle | On Duty | Incidents |
|--------------|--------|----------|---------|---------|-----------|
| John Smith | Available | Downtown Depot | AMB-001 | Yes | 0 |
| Sarah Johnson | Assigned | Main Street | AMB-002 | Yes | 1 |
| Mike Brown | On Break | Station | — | No | — |

#### Information Shown
- **Name and role** (Paramedic, EMT, Driver)
- **Current status** (Available, Assigned, On Break, Off Duty)
- **Location** (GPS coordinates or location name)
- **Assigned vehicle** (ambulance code)
- **Shift status** (On duty/Off duty)
- **Current incidents** (how many calls they're handling)
- **License status** (valid, expiring soon, expired)

#### Actions
- **Assign to incident** - Dispatch specific crew
- **View location** - See GPS position on map
- **Send message** - Text crew member
- **View profile** - See qualifications and certifications
- **Schedule shift** - Update availability

---

### 9. Fleet Management

**Access:** Click **"Fleet"** from sidebar

#### Fleet Overview
Summary of all vehicles:
- **6 vehicles total** (example: 3 available, 2 in-service, 1 maintenance)
- **Status filters** to view specific vehicle groups
- **Fleet statistics** (average mileage, fleet age, maintenance overdue)

#### Vehicle Status Indicators
- **✓ AVAILABLE** (green) - Ready for deployment
- **🚑 IN-SERVICE** (orange) - Currently responding to incident
- **⚙ MAINTENANCE** (gray) - In workshop or maintenance

#### For Each Vehicle
- **Vehicle code** (e.g., AMB-001)
- **Make/Model** (e.g., Mercedes-Benz Sprinter Type-A)
- **Location** (where parked or currently deployed)
- **Mileage** (total kilometers)
- **Last Service** (date of last maintenance)
- **Next Service** (when maintenance is due)
- **Days until service** (countdown with color warning)

#### Vehicle Actions
- **View Profile** - Detailed vehicle record (VIN, registration, equipment)
- **Schedule Service** - Book maintenance appointment
- **Assign** - Assign to crew or incident
- **Edit** - Update vehicle information
- **Delete** - Remove from fleet

#### Filtering Vehicles
Use tabs to view by status:
- **All** - All vehicles
- **Available** - Ready to deploy
- **In-Service** - Currently active
- **Maintenance** - In workshop

---

### 10. Vehicle Availability Scheduling

**Access:** Click **"Fleet"** > View vehicle details

#### What It Shows
Upcoming vehicle availability:
- **Currently available vehicles** with deploy readiness
- **Vehicles becoming available soon** with time estimate
- **Why they're unavailable** (maintenance, cleaning, crew change)

#### Use This To
- **Know what's available** before accepting incidents
- **Estimate when vehicle becomes free** for next call
- **Plan crew scheduling** around vehicle availability

#### Example
```
AMB-001: Available Now (green)
AMB-002: Available in 2 hours (crew change, cleaning)
AMB-003: Available in 6 hours (scheduled maintenance)
```

---

### 11. Vehicle Type Management

**Access:** Click **"Fleet"** > Manage Types

#### Vehicle Types in Your Fleet
Different ambulances for different situations:

**Type-A Ambulance**
- Capacity: 3 crew + 2 stretchers
- Equipment: AED, Oxygen, Full medical kit
- Cost: $8,500/month per vehicle
- Your fleet: 5 units

**Type-B Ambulance**
- Capacity: 2 crew + 1 stretcher
- Equipment: AED, Basic medical kit
- Cost: $5,200/month per vehicle
- Your fleet: 3 units

**ICU Mobile Unit**
- Capacity: 4 crew + 1 stretcher
- Equipment: Ventilator, Monitor, Full life support
- Cost: $12,000/month per vehicle
- Your fleet: 2 units

#### Why Types Matter
- **Type A** - Most common, versatile
- **Type B** - Faster, for minor injuries
- **ICU** - Critical care, long transports

---

### 12. Vehicle Utilisation Dashboard

**Access:** Click **"Fleet"** > View Utilisation

#### Key Metrics
- **Average Utilisation** (76.4% - how much your fleet is actually in use)
- **Total Trips** (3,675 this month)
- **Total Mileage** (13,520 km)
- **Operating Cost** ($4,250 per vehicle/month average)

#### Utilisation Charts
- **Vehicle utilisation rate** - Which vehicles are being used most
- **Usage trends** - 5-week history of hours and miles
- **Cost breakdown** - Fuel vs maintenance vs insurance vs depreciation

#### What's Good?
- **Utilisation above 80%** = Excellent fleet usage
- **Average mileage trending up** = Growing demand
- **Low downtime** = Good maintenance scheduling

#### What Needs Attention?
- **Vehicles under 40% utilisation** = Underused, consider selling
- **Sudden utilisation drops** = Equipment issues or scheduling problems
- **Rising maintenance costs** = Aging fleet, plan replacements

---

### 13. Fleet Calendar

**Access:** Click **"Fleet"** > View Calendar

#### What It Shows
Scheduled maintenance, inspections, and renewals:
- **Oil changes and filter replacements**
- **Annual vehicle inspections**
- **Insurance renewals**
- **MOT (fitness) checks**
- **Major service intervals**
- **Equipment expiry (oxygen cylinders, etc.)**

#### Color-Coded Events
- 🔧 Maintenance (blue) - Routine service
- ✓ Inspection (purple) - Government inspection
- 📋 Insurance (green) - Policy renewal
- 🚗 MOT (orange) - Fitness examination

#### Using the Calendar
1. **See what's due** - Click on any date
2. **Schedule maintenance** - Add new appointment
3. **Track overdue items** - Red highlighting shows delays
4. **Plan budget** - See upcoming major expenses
5. **Export schedule** - Download for team planning

---

### 14. Driver & Crew Management

**Access:** Click **"Team Status"** > View Driver Profiles OR Admin panel

#### Staff Directory
Complete roster of all team members:

| Name | Role | Status | Performance Score | Incidents | License Expiry |
|------|------|--------|-------------------|-----------|----------------|
| John Smith | Paramedic | Active | 92 | 0 | 2027-03-15 |
| Sarah Johnson | EMT | Active | 85 | 1 | 2026-08-20 |
| Mike Brown | Driver | Active | 78 | 2 | 2026-12-01 |

#### Performance Scoring
- **90+** (green) - Excellent, no incidents
- **80-89** (blue) - Good, minor issues
- **70-79** (yellow) - Needs improvement
- **Below 70** (red) - At risk, intervention needed

#### License Tracking
- **Green** - Valid, expires in 12+ months
- **Yellow** - Expiring in 3-12 months, schedule renewal
- **Red** - Expired or expiring soon, immediate action needed

#### Driver Actions
- **View full profile** - Qualifications, certifications, history
- **Schedule training** - Assign refresher courses
- **Update license** - Add renewed certification
- **Review incidents** - See detailed incident records
- **Edit information** - Update contact details

---

## Analytics & Compliance

### 15. Telematics & API Integration

**Access:** Click **"Telematics"** from sidebar

#### What Telematics Does
Collects real-time data from vehicles:
- **GPS location** - Live vehicle position
- **Speed** - Current and average speeds
- **Harsh braking** - Sudden stops (safety metric)
- **Hard acceleration** - Aggressive driving detection
- **Fuel consumption** - Efficiency metrics
- **Engine hours** - Operational wear
- **Route deviations** - When drivers leave planned route

#### Connected Providers
Your telematics data comes from:
- **Samsara** - GPS and driving behavior
- **Geotab** - Fuel and engine diagnostics
- **Other integrations** - Custom sensors

#### Using Telematics Data
- **Driver coaching** - Identify aggressive driving patterns
- **Route optimization** - See actual vs planned routes
- **Fuel efficiency** - Track consumption and cost
- **Predictive maintenance** - Know when servicing is needed
- **Safety analysis** - Identify high-risk drivers
- **Compliance reporting** - Document fleet behavior

---

### 16. Vehicle Abuse Prevention

**Access:** Click **"Vehicle Abuse"** from sidebar

#### What's Monitored
- **Geofence breaches** - Vehicles leaving authorized areas
- **After-hours usage** - Driving outside shift times
- **Route deviations** - Unplanned detours
- **Speeding events** - Exceeding speed limits
- **Harsh driving** - Rapid acceleration/braking
- **Unauthorized stops** - Vehicles stopping in unusual locations
- **Idle time** - Engine running without movement

#### Color-Coded Severity
- **🔴 CRITICAL** - Severe safety concern (major speeding, accident risk)
- **🟠 HIGH** - Significant issue (repeated harsh braking)
- **🟡 MEDIUM** - Watch pattern (occasional speeding)
- **🔵 LOW** - Note for training (minor variance)

#### Actions
- **Review incident** - See details and context
- **Coach driver** - Schedule training based on behavior
- **Analyze pattern** - See if behavior is recurring
- **Report to insurance** - Document serious violations
- **Suspend privileges** - Remove vehicle access if needed

---

### 17. Maintenance Dashboard

**Access:** Click **"Maintenance"** from admin area

#### Overview
All vehicle maintenance tracked in one place:

| Vehicle | Service Type | Status | Due Date | Cost |
|---------|-------------|--------|----------|------|
| AMB-001 | Oil Change | Pending | 2026-06-30 | $150 |
| AMB-002 | Filter Replacement | In Progress | 2026-06-28 | $200 |
| AMB-003 | Brake Service | Overdue | 2026-06-20 | $500 |

#### Status States
- **Pending** (yellow) - Scheduled, awaiting appointment
- **In Progress** (blue) - Currently being serviced
- **Completed** (green) - Done, documented
- **Overdue** (red) - Past due date, immediate action

#### Actions
- **Schedule Service** - Book appointment with workshop
- **View History** - See all past maintenance
- **Update Status** - Mark as complete
- **Record Notes** - Document issues found
- **Track Cost** - Monitor maintenance budget

---

## Administration

### 18. User Admin & Staff Management

**Access:** Click **"User Admin"** from sidebar

#### Staff Management
Add, edit, or remove team members:
- **Create new user account** - Invite new staff
- **Assign roles** - Paramedic, Driver, Admin, etc.
- **Set permissions** - What they can access
- **Schedule shifts** - Who works when
- **Manage teams** - Group drivers into crews
- **Track certifications** - Medical licenses, driving licenses
- **Suspend/remove** - Deactivate staff

#### Permissions by Role
- **Paramedic** - Full incident response, patient data access
- **Driver** - Vehicle operation, navigation, incident location
- **Fleet Manager** - Vehicle management, maintenance scheduling
- **Administrator** - All features, staff management, configuration

---

## Troubleshooting

### Common Issues & Solutions

#### Issue: Ambulance Not Showing on Map
**Solution:**
1. Check if vehicle GPS is powered on
2. Verify vehicle is assigned to a crew
3. Check Telematics provider connection (Samsara/Geotab)
4. Restart vehicle tablet/GPS device

#### Issue: Hospital Can't Find My Service
**Solution:**
1. Confirm affiliation status in "Affiliated Hospitals"
2. Check if service area boundaries are correct
3. Verify contact information is up-to-date
4. Call hospital directly to confirm affiliation

#### Issue: Incident Not Showing in History
**Solution:**
1. Check date range in filter
2. Ensure incident was marked "completed"
3. Search by patient name if code not known
4. Contact admin if still missing

#### Issue: Driver License Shows Expired
**Solution:**
1. Have driver provide renewed license copy
2. Upload to system via driver profile
3. Update expiry date
4. Confirm change in system

#### Issue: Performance Score Not Updating
**Solution:**
1. Wait 24 hours for data to sync
2. Check telematics provider connection
3. Verify incidents were properly logged
4. Contact admin for manual refresh

---

## Sample Data Reference

### Sample Incident Data

**Self-Created Incident (INC-2024-100)**
```
Code: INC-2024-100
Type: Cardiac Emergency
Severity: CRITICAL
Status: ACTIVE
Location: Main Street Downtown
Time: 14:32
Duration: 12 minutes
Assigned: AMB-001
Patient: Conscious, experiencing chest pain and shortness of breath
```

**Hospital-Originated Incident (INC-2024-050)**
```
Code: INC-2024-050
Type: Trauma/Accident
Severity: HIGH
Status: PENDING YOUR RESPONSE
From: Central Hospital
Location: Downtown Medical Center
Distance: 3.2 km away
Patient: Multi-vehicle accident, 2 patients, stable vitals
```

### Sample Fleet Data

**Vehicle: AMB-001**
```
Status: ✓ AVAILABLE
Make/Model: Mercedes-Benz Sprinter Type-A
Location: Central Depot
Mileage: 45,230 km
Last Service: 2026-06-15
Next Service: 2026-09-15 (80 days)
Equipment: AED, Oxygen (2), First Aid Kit, Stretcher, Communication Equipment
```

### Sample Driver Data

**John Smith - Paramedic**
```
Status: Active
Performance Score: 92/100
Incidents This Month: 0
License: Valid until 2027-03-15
Certifications: Paramedic (Advanced), ACLS, PALS
Shift: Monday-Friday, 08:00-20:00
Vehicle Assigned: AMB-001
```

---

## Quick Reference Guide

### Keyboard Shortcuts
- **Press ?** - Show help menu
- **Press N** - New incident
- **Press M** - Map view
- **Press S** - Settings

### Response Time Targets
- **CRITICAL** - Respond within 5 minutes
- **HIGH** - Respond within 10 minutes
- **MEDIUM** - Respond within 15 minutes
- **LOW** - Respond within 30 minutes

### Shift Status Meanings
- **ACTIVE MISSION** 🚨 - Current incident in progress
- **OFF SHIFT** 😴 - Not on duty
- **START SHIFT** ▶️ - Available to receive calls
- **ON BREAK** ☕ - Temporarily unavailable

---

## Support & Resources

### Getting Help
- **In-app help**: Click **?** icon in top right
- **Live chat**: Available 24/7
- **Phone support**: 1-800-HOLARC-1
- **Email support**: support@holarchealth.com
- **Training videos**: https://training.holarchealth.com

### Documentation
- **API reference**: https://api.holarchealth.com/docs
- **Incident codes**: Reference guide available in admin
- **Medical protocols**: Standard emergency protocols
- **Hospital directories**: Complete network information

---

**End of Training Guide**

*For updates and additional resources, visit https://support.holarchealth.com*
