# Indigro

This document outlines the functional requirements for "This document outlines the functional requirements for "MedPad," a versatile mobile and web application designed to streamline practice and client management for individual professionals (e.g., consultants, therapists, coaches, independent legal experts). The primary goal is to centralize client records, manage appointments, leverage AI for summarizing consultations, and automate follow-up tasks and document delivery, thereby improving efficiency and service quality.

2. Scope and Key Features

The application will focus on three core areas: Practice Management, Service Delivery Workflow, and Client Communication.

Key Features:

Calendar Synchronization: Two-way sync with native device calendar (e.g., Google Calendar, Outlook).

Client Management: Comprehensive client profiles, history, and document storage.

Intelligent Appointment Recording: Text summary generation and automated action point extraction using an LLM model (Gemini API).

Flexible Document Automation: Voice-to-text transcription for document content and a template builder for custom deliverables (e.g., proposals, summaries, instructions).

Automated Follow-up Scheduling.

3. Functional Requirements (FR)

3.1 User Authentication & Setup

FR ID

Feature/Requirement

Details

FR 3.1.1

Secure Authentication

Standard login (email/password) and multi-factor authentication (MFA).

FR 3.1.2

Profile Setup

User must input their primary contact details, practice/business location, and professional ID/details.

3.2 Calendar Integration & Management

The application must integrate seamlessly with the user's existing, native email calendar application (e.g., Google, Outlook, Apple Calendar) to ensure a single source of truth for scheduling.

FR ID

Feature/Requirement

Details

FR 3.2.1

Two-Way Calendar Sync

The app must offer a one-time setup to establish secure, two-way, read/write synchronization with the user's native calendar. (Integration Point)

FR 3.2.2

Appointment Display

The in-app calendar view must display all appointments and personal calendar items retrieved from the native calendar.

FR 3.2.3

To-Do Item Sync

Action points generated during consultation (see FR 3.5.2) must be written back to the native calendar as new To-Do tasks, tagged with [ProFlow].

FR 3.2.4

Schedule Block Management

User must be able to define work hours, breaks, and unavailability (blocked time) directly in the app, which is reflected in the native calendar.

3.3 Client & History Management

FR ID

Feature/Requirement

Details

FR 3.3.1

Client Profile Creation

Capture mandatory fields: Name, DOB/Company ID, Contact Number, Email. Optional: Primary Contact/Manager, Billing Details.

FR 3.3.2

Client List View

A searchable and filterable list of all registered clients.

FR 3.3.3

Comprehensive History

Each client profile must contain a chronological list of all past appointments/sessions, including the Summary, Action Points, and Deliverables associated with each engagement.

FR 3.3.4

Document Upload (Per Client)

User must be able to upload files (e.g., financial statements, legal documents, assessment forms) to a client's profile. Supported formats: PDF, DOCX, JPG, PNG.

FR 3.3.5

Document Categorization

Uploaded documents must be tagged (e.g., "Contract," "Invoice," "Report") for easy filtering.

3.4 Appointment Workflow (Service Delivery)

This defines the flow during a client consultation or service session.

FR ID

Feature/Requirement

Details

FR 3.4.1

Start Session

A dedicated button/action on a scheduled appointment to initiate the "Service Mode."

FR 3.4.2

Live Text Input

An area for the professional to type notes during the session.

FR 3.4.3

Live Voice Recording

A feature to record the audio of the session (with client consent confirmation). The audio file is saved securely to the client record.

FR 3.4.4

End Session

A button to finalize the session, which triggers the AI summarization process (see FR 3.5.1).

3.5 AI-Driven Summarization & Task Creation

The app leverages the Gemini API to analyze session input (typed notes and/or transcribed audio) and provide structured, intelligent outputs.

FR ID

Feature/Requirement

Details

FR 3.5.1

Session Summarization

Upon ending a session, the system will use the Gemini API to generate a concise, professional, single-paragraph summary of the session's key discussion points. This summary is filed immediately to the client's history.

FR 3.5.2

Action Point Extraction

The system must analyze the summary and notes to automatically identify actionable tasks (e.g., "Draft proposal," "Research relevant case law," "Review financial data") and list them.

FR 3.5.3

To-Do Calendar Allocation

The user must be able to review the extracted Action Points (FR 3.5.2) and, with one click, allocate them as To-Do items in the in-app calendar (which syncs via FR 3.2.3).

3.6 Document Generation & Communication Module

This module enables efficient, customizable creation and delivery of professional documents, and general communication drafting.

FR ID

Feature/Requirement

Details

FR 3.6.1

Document Template Builder

A visual editor allowing the user to create, save, and edit reusable document templates (e.g., "Client Action Plan," "Invoice Summary," "Letter of Advice"). Templates must support placeholder fields (e.g., [ClientName], [SessionDate]).

FR 3.6.2

Voice-to-Content Transcription

A dedicated microphone button allows the user to voice-record the specific content for the document (e.g., "The key finding is that the Q4 returns exceeded expectations, requiring immediate portfolio reallocation...").

FR 3.6.3

Content Transcription (Document)

The system must transcribe the voice recording into a structured, bulleted list or paragraph format for clear readability using the Gemini API.

FR 3.6.4

Document Assembly & Edit

The user must be able to select a template (FR 3.6.1), insert the transcribed content (FR 3.6.3), and manually edit the final document before it is finalized.

FR 3.6.5

Email Communication (Client/Recipient)

Upon finalization of a document, the user must have a one-click option to: <ul><li>Email the document to the client (using their default native email client/app).</li><li>Email the document to a third party (e.g., an accountant, partner, or colleague) (using their default native email client/app). (Integration Point)</li></ul>

FR 3.6.6

Document Filing

A copy of the finalized document must be automatically timestamped and filed within the client's history.

FR 3.6.7

Voice-to-Email Drafting

A dedicated mode allowing the user to initiate a new general email draft and dictate the body of the message. This feature is not tied to a specific client document template.

FR 3.6.8

Content Transcription (Email)

The system must transcribe the voice recording into the email body using the Gemini API, ensuring correct punctuation and paragraph breaks for a professional format.

FR 3.6.9

Email Review, Edit, & Send

The user must be able to specify recipients and subject line, review the transcribed email, manually edit it, and send it off using their default native email client/app. (Integration Point)

3.7 Automated Follow-up Scheduling

FR ID

Feature/Requirement

Details

FR 3.7.1

Automated Follow-up Entry

Upon finalization of a session, the system must automatically create a "Follow-up Call/Check-in" event in the user's in-app calendar (which syncs via FR 3.2.1) scheduled for three (3) business days after the current session date.

FR 3.7.2

Follow-up Context

The follow-up event must include the client's name and the session summary (FR 3.5.1) in its notes for quick context.

4. Non-Functional Requirements (NFR)

NFR ID

Requirement Type

Description

NFR 4.1

Security

All client data must be encrypted in transit and at rest. Strict access controls and audit logs are mandatory (relevant industry compliance, e.g., legal, financial).

NFR 4.2

Performance

All client data retrieval, document upload, and calendar synchronization must be completed within 3 seconds.

NFR 4.3

Reliability

The application must maintain 99.9% uptime. The AI summarization process must include retry mechanisms for API communication failures.

NFR 4.4

Usability

The user interface must be intuitive, minimizing clicks for core workflows (session, document generation).," a versatile mobile and web application designed to streamline practice and client management for individual professionals (e.g., consultants, therapists, coaches, independent legal experts). The primary goal is to centralize client records, manage appointments, leverage AI for summarizing consultations, and automate follow-up tasks and document delivery, thereby improving efficiency and service quality.

2. Scope and Key Features

The application will focus on three core areas: Practice Management, Service Delivery Workflow, and Client Communication.

Key Features:

Calendar Synchronization: Two-way sync with native device calendar (e.g., Google Calendar, Outlook).

Client Management: Comprehensive client profiles, history, and document storage.

Intelligent Appointment Recording: Text summary generation and automated action point extraction using an LLM model (Gemini API).

Flexible Document Automation: Voice-to-text transcription for document content and a template builder for custom deliverables (e.g., proposals, summaries, instructions).

Automated Follow-up Scheduling.

3. Functional Requirements (FR)

3.1 User Authentication & Setup

FR ID

Feature/Requirement

Details

FR 3.1.1

Secure Authentication

Standard login (email/password) and multi-factor authentication (MFA).

FR 3.1.2

Profile Setup

User must input their primary contact details, practice/business location, and professional ID/details.

3.2 Calendar Integration & Management

The application must integrate seamlessly with the user's existing, native email calendar application (e.g., Google, Outlook, Apple Calendar) to ensure a single source of truth for scheduling.

FR ID

Feature/Requirement

Details

FR 3.2.1

Two-Way Calendar Sync

The app must offer a one-time setup to establish secure, two-way, read/write synchronization with the user's native calendar. (Integration Point)

FR 3.2.2

Appointment Display

The in-app calendar view must display all appointments and personal calendar items retrieved from the native calendar.

FR 3.2.3

To-Do Item Sync

Action points generated during consultation (see FR 3.5.2) must be written back to the native calendar as new To-Do tasks, tagged with [ProFlow].

FR 3.2.4

Schedule Block Management

User must be able to define work hours, breaks, and unavailability (blocked time) directly in the app, which is reflected in the native calendar.

3.3 Client & History Management

FR ID

Feature/Requirement

Details

FR 3.3.1

Client Profile Creation

Capture mandatory fields: Name, DOB/Company ID, Contact Number, Email. Optional: Primary Contact/Manager, Billing Details.

FR 3.3.2

Client List View

A searchable and filterable list of all registered clients.

FR 3.3.3

Comprehensive History

Each client profile must contain a chronological list of all past appointments/sessions, including the Summary, Action Points, and Deliverables associated with each engagement.

FR 3.3.4

Document Upload (Per Client)

User must be able to upload files (e.g., financial statements, legal documents, assessment forms) to a client's profile. Supported formats: PDF, DOCX, JPG, PNG.

FR 3.3.5

Document Categorization

Uploaded documents must be tagged (e.g., "Contract," "Invoice," "Report") for easy filtering.

3.4 Appointment Workflow (Service Delivery)

This defines the flow during a client consultation or service session.

FR ID

Feature/Requirement

Details

FR 3.4.1

Start Session

A dedicated button/action on a scheduled appointment to initiate the "Service Mode."

FR 3.4.2

Live Text Input

An area for the professional to type notes during the session.

FR 3.4.3

Live Voice Recording

A feature to record the audio of the session (with client consent confirmation). The audio file is saved securely to the client record.

FR 3.4.4

End Session

A button to finalize the session, which triggers the AI summarization process (see FR 3.5.1).

3.5 AI-Driven Summarization & Task Creation

The app leverages the Gemini API to analyze session input (typed notes and/or transcribed audio) and provide structured, intelligent outputs.

FR ID

Feature/Requirement

Details

FR 3.5.1

Session Summarization

Upon ending a session, the system will use the Gemini API to generate a concise, professional, single-paragraph summary of the session's key discussion points. This summary is filed immediately to the client's history.

FR 3.5.2

Action Point Extraction

The system must analyze the summary and notes to automatically identify actionable tasks (e.g., "Draft proposal," "Research relevant case law," "Review financial data") and list them.

FR 3.5.3

To-Do Calendar Allocation

The user must be able to review the extracted Action Points (FR 3.5.2) and, with one click, allocate them as To-Do items in the in-app calendar (which syncs via FR 3.2.3).

3.6 Document Generation & Communication Module

This module enables efficient, customizable creation and delivery of professional documents, and general communication drafting.

FR ID

Feature/Requirement

Details

FR 3.6.1

Document Template Builder

A visual editor allowing the user to create, save, and edit reusable document templates (e.g., "Client Action Plan," "Invoice Summary," "Letter of Advice"). Templates must support placeholder fields (e.g., [ClientName], [SessionDate]).

FR 3.6.2

Voice-to-Content Transcription

A dedicated microphone button allows the user to voice-record the specific content for the document (e.g., "The key finding is that the Q4 returns exceeded expectations, requiring immediate portfolio reallocation...").

FR 3.6.3

Content Transcription (Document)

The system must transcribe the voice recording into a structured, bulleted list or paragraph format for clear readability using the Gemini API.

FR 3.6.4

Document Assembly & Edit

The user must be able to select a template (FR 3.6.1), insert the transcribed content (FR 3.6.3), and manually edit the final document before it is finalized.

FR 3.6.5

Email Communication (Client/Recipient)

Upon finalization of a document, the user must have a one-click option to: <ul><li>Email the document to the client (using their default native email client/app).</li><li>Email the document to a third party (e.g., an accountant, partner, or colleague) (using their default native email client/app). (Integration Point)</li></ul>

FR 3.6.6

Document Filing

A copy of the finalized document must be automatically timestamped and filed within the client's history.

FR 3.6.7

Voice-to-Email Drafting

A dedicated mode allowing the user to initiate a new general email draft and dictate the body of the message. This feature is not tied to a specific client document template.

FR 3.6.8

Content Transcription (Email)

The system must transcribe the voice recording into the email body using the Gemini API, ensuring correct punctuation and paragraph breaks for a professional format.

FR 3.6.9

Email Review, Edit, & Send

The user must be able to specify recipients and subject line, review the transcribed email, manually edit it, and send it off using their default native email client/app. (Integration Point)

3.7 Automated Follow-up Scheduling

FR ID

Feature/Requirement

Details

FR 3.7.1

Automated Follow-up Entry

Upon finalization of a session, the system must automatically create a "Follow-up Call/Check-in" event in the user's in-app calendar (which syncs via FR 3.2.1) scheduled for three (3) business days after the current session date.

FR 3.7.2

Follow-up Context

The follow-up event must include the client's name and the session summary (FR 3.5.1) in its notes for quick context.

4. Non-Functional Requirements (NFR)

NFR ID

Requirement Type

Description

NFR 4.1

Security

All client data must be encrypted in transit and at rest. Strict access controls and audit logs are mandatory (relevant industry compliance, e.g., legal, financial).

NFR 4.2

Performance

All client data retrieval, document upload, and calendar synchronization must be completed within 3 seconds.

NFR 4.3

Reliability

The application must maintain 99.9% uptime. The AI summarization process must include retry mechanisms for API communication failures.

NFR 4.4

Usability

The user interface must be intuitive, minimizing clicks for core workflows (session, document generation).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://client-sync-scribe.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/320b9905-9d0e-4ca1-af45-821272397de6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
