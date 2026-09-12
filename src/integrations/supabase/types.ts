export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admission_imaging: {
        Row: {
          admission_id: string
          attachment_url: string | null
          body_region: string | null
          created_at: string
          id: string
          modality: string
          nurse_id: string | null
          nurse_name_snapshot: string | null
          pacs_link: string | null
          performed_at: string
          recorded_by: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          admission_id: string
          attachment_url?: string | null
          body_region?: string | null
          created_at?: string
          id?: string
          modality: string
          nurse_id?: string | null
          nurse_name_snapshot?: string | null
          pacs_link?: string | null
          performed_at?: string
          recorded_by: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          admission_id?: string
          attachment_url?: string | null
          body_region?: string | null
          created_at?: string
          id?: string
          modality?: string
          nurse_id?: string | null
          nurse_name_snapshot?: string | null
          pacs_link?: string | null
          performed_at?: string
          recorded_by?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_imaging_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "hospital_admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_imaging_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "hospital_nurses"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_interactions: {
        Row: {
          admission_id: string
          created_at: string
          id: string
          interaction_type: string
          notes: string | null
          nurse_id: string | null
          nurse_name_snapshot: string
          payload: Json | null
          recorded_at: string
          recorded_by_user_id: string | null
          updated_at: string
        }
        Insert: {
          admission_id: string
          created_at?: string
          id?: string
          interaction_type: string
          notes?: string | null
          nurse_id?: string | null
          nurse_name_snapshot: string
          payload?: Json | null
          recorded_at?: string
          recorded_by_user_id?: string | null
          updated_at?: string
        }
        Update: {
          admission_id?: string
          created_at?: string
          id?: string
          interaction_type?: string
          notes?: string | null
          nurse_id?: string | null
          nurse_name_snapshot?: string
          payload?: Json | null
          recorded_at?: string
          recorded_by_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_interactions_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "hospital_admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_interactions_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "hospital_nurses"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_lab_results: {
        Row: {
          admission_id: string
          attachment_url: string | null
          created_at: string
          id: string
          notes: string | null
          nurse_id: string | null
          nurse_name_snapshot: string | null
          recorded_by: string
          reference_range: string | null
          result_date: string
          result_value: string | null
          test_name: string
          units: string | null
          updated_at: string
        }
        Insert: {
          admission_id: string
          attachment_url?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          nurse_id?: string | null
          nurse_name_snapshot?: string | null
          recorded_by: string
          reference_range?: string | null
          result_date?: string
          result_value?: string | null
          test_name: string
          units?: string | null
          updated_at?: string
        }
        Update: {
          admission_id?: string
          attachment_url?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          nurse_id?: string | null
          nurse_name_snapshot?: string | null
          recorded_by?: string
          reference_range?: string | null
          result_date?: string
          result_value?: string | null
          test_name?: string
          units?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_lab_results_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "hospital_admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_lab_results_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "hospital_nurses"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_medications: {
        Row: {
          admission_id: string
          created_at: string
          dosage: string | null
          frequency: string | null
          id: string
          name: string
          notes: string | null
          nurse_id: string | null
          nurse_name_snapshot: string | null
          recorded_by: string
          started_at: string | null
          stopped_at: string | null
          updated_at: string
        }
        Insert: {
          admission_id: string
          created_at?: string
          dosage?: string | null
          frequency?: string | null
          id?: string
          name: string
          notes?: string | null
          nurse_id?: string | null
          nurse_name_snapshot?: string | null
          recorded_by: string
          started_at?: string | null
          stopped_at?: string | null
          updated_at?: string
        }
        Update: {
          admission_id?: string
          created_at?: string
          dosage?: string | null
          frequency?: string | null
          id?: string
          name?: string
          notes?: string | null
          nurse_id?: string | null
          nurse_name_snapshot?: string | null
          recorded_by?: string
          started_at?: string | null
          stopped_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_medications_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "hospital_admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_medications_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "hospital_nurses"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_progress_notes: {
        Row: {
          admission_id: string
          category: string
          content: string
          created_at: string
          id: string
          recorded_by: string | null
          recorded_by_name: string | null
          updated_at: string
        }
        Insert: {
          admission_id: string
          category?: string
          content: string
          created_at?: string
          id?: string
          recorded_by?: string | null
          recorded_by_name?: string | null
          updated_at?: string
        }
        Update: {
          admission_id?: string
          category?: string
          content?: string
          created_at?: string
          id?: string
          recorded_by?: string | null
          recorded_by_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_progress_notes_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "hospital_admissions"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_vitals: {
        Row: {
          admission_id: string
          bmi: number | null
          bp_diastolic: number | null
          bp_systolic: number | null
          created_at: string
          heart_rate: number | null
          height_cm: number | null
          id: string
          notes: string | null
          nurse_id: string | null
          nurse_name_snapshot: string | null
          recorded_at: string
          recorded_by: string
          spo2: number | null
          temperature_c: number | null
          weight_kg: number | null
        }
        Insert: {
          admission_id: string
          bmi?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          heart_rate?: number | null
          height_cm?: number | null
          id?: string
          notes?: string | null
          nurse_id?: string | null
          nurse_name_snapshot?: string | null
          recorded_at?: string
          recorded_by: string
          spo2?: number | null
          temperature_c?: number | null
          weight_kg?: number | null
        }
        Update: {
          admission_id?: string
          bmi?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          heart_rate?: number | null
          height_cm?: number | null
          id?: string
          notes?: string | null
          nurse_id?: string | null
          nurse_name_snapshot?: string | null
          recorded_at?: string
          recorded_by?: string
          spo2?: number | null
          temperature_c?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_vitals_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "hospital_admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_vitals_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "hospital_nurses"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_audit_log: {
        Row: {
          action: string | null
          alert_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          staff_user_id: string | null
        }
        Insert: {
          action?: string | null
          alert_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          staff_user_id?: string | null
        }
        Update: {
          action?: string | null
          alert_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          staff_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_audit_log_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "patient_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_audit_log_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ambulance_coverage_areas: {
        Row: {
          area_name: string
          country: string | null
          created_at: string
          id: string
          provider_id: string
          region: string | null
        }
        Insert: {
          area_name: string
          country?: string | null
          created_at?: string
          id?: string
          provider_id: string
          region?: string | null
        }
        Update: {
          area_name?: string
          country?: string | null
          created_at?: string
          id?: string
          provider_id?: string
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambulance_coverage_areas_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_ambulance_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_coverage_areas_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_ambulance_providers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ambulance_crew_assignments: {
        Row: {
          ambulance_id: string
          created_at: string
          id: string
          is_default_lead: boolean
          member_id: string
        }
        Insert: {
          ambulance_id: string
          created_at?: string
          id?: string
          is_default_lead?: boolean
          member_id: string
        }
        Update: {
          ambulance_id?: string
          created_at?: string
          id?: string
          is_default_lead?: boolean
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambulance_crew_assignments_ambulance_id_fkey"
            columns: ["ambulance_id"]
            isOneToOne: false
            referencedRelation: "ambulances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_crew_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_ambulance_members"
            referencedColumns: ["id"]
          },
        ]
      }
      ambulance_fleet: {
        Row: {
          count: number
          created_at: string
          id: string
          notes: string | null
          provider_id: string
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          notes?: string | null
          provider_id: string
          updated_at?: string
          vehicle_type: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          notes?: string | null
          provider_id?: string
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambulance_fleet_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_ambulance_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_fleet_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_ambulance_providers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ambulance_hospital_affiliations: {
        Row: {
          ambulance_provider_id: string
          created_at: string
          hospital_id: string | null
          hospital_name_snapshot: string | null
          id: string
          role: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ambulance_provider_id: string
          created_at?: string
          hospital_id?: string | null
          hospital_name_snapshot?: string | null
          id?: string
          role?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ambulance_provider_id?: string
          created_at?: string
          hospital_id?: string | null
          hospital_name_snapshot?: string | null
          id?: string
          role?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambulance_hospital_affiliations_ambulance_provider_id_fkey"
            columns: ["ambulance_provider_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_ambulance_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_hospital_affiliations_ambulance_provider_id_fkey"
            columns: ["ambulance_provider_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_ambulance_providers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_hospital_affiliations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_hospital_affiliations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ambulances: {
        Row: {
          created_at: string
          current_latitude: number | null
          current_longitude: number | null
          id: string
          notes: string | null
          provider_id: string
          registration_number: string | null
          status: string
          updated_at: string
          vehicle_code: string
        }
        Insert: {
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          id?: string
          notes?: string | null
          provider_id: string
          registration_number?: string | null
          status?: string
          updated_at?: string
          vehicle_code: string
        }
        Update: {
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          id?: string
          notes?: string | null
          provider_id?: string
          registration_number?: string | null
          status?: string
          updated_at?: string
          vehicle_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambulances_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_ambulance_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulances_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_ambulance_providers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      app_modules: {
        Row: {
          description: string | null
          enabled: boolean
          module_key: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          module_key: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          module_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointment_requests: {
        Row: {
          created_at: string | null
          doctor_id: string
          id: string
          notes: string | null
          patient_id: string
          patient_user_id: string
          proposed_end: string | null
          proposed_start: string | null
          requested_end: string
          requested_start: string
          service_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          id?: string
          notes?: string | null
          patient_id: string
          patient_user_id: string
          proposed_end?: string | null
          proposed_start?: string | null
          requested_end: string
          requested_start: string
          service_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          patient_user_id?: string
          proposed_end?: string | null
          proposed_start?: string | null
          requested_end?: string
          requested_start?: string
          service_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_type_colors: {
        Row: {
          color: string
          created_at: string | null
          id: string
          type_name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          type_name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          type_name?: string
          user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          created_at: string
          description: string | null
          end_time: string
          google_event_id: string | null
          id: string
          location: string | null
          patient_id: string | null
          practice_id: string | null
          start_time: string
          synced_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          patient_id?: string | null
          practice_id?: string | null
          start_time: string
          synced_at?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          patient_id?: string | null
          practice_id?: string | null
          start_time?: string
          synced_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      approved_daily_medications: {
        Row: {
          active: boolean
          category: string
          created_at: string
          default_with_food: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          default_with_food?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          default_with_food?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ask_maeve_anchors: {
        Row: {
          anchor_description: string | null
          created_at: string
          id: string
          patient_words: string | null
          resource_label: string | null
          session_id: string
          tested: boolean
          user_id: string
        }
        Insert: {
          anchor_description?: string | null
          created_at?: string
          id?: string
          patient_words?: string | null
          resource_label?: string | null
          session_id: string
          tested?: boolean
          user_id: string
        }
        Update: {
          anchor_description?: string | null
          created_at?: string
          id?: string
          patient_words?: string | null
          resource_label?: string | null
          session_id?: string
          tested?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ask_maeve_anchors_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ask_maeve_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_maeve_messages: {
        Row: {
          content: string
          conversation_state: string | null
          created_at: string
          id: string
          is_safety_response: boolean
          process_key: string | null
          process_step: number | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_state?: string | null
          created_at?: string
          id?: string
          is_safety_response?: boolean
          process_key?: string | null
          process_step?: number | null
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_state?: string | null
          created_at?: string
          id?: string
          is_safety_response?: boolean
          process_key?: string | null
          process_step?: number | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ask_maeve_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ask_maeve_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_maeve_outcomes: {
        Row: {
          context: string | null
          created_at: string
          desired_state: string | null
          ecology: string | null
          evidence: string | null
          id: string
          patient_words: string | null
          sensory_evidence: string | null
          session_id: string
          updated_at: string
          user_id: string
          value: string | null
          within_control: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          desired_state?: string | null
          ecology?: string | null
          evidence?: string | null
          id?: string
          patient_words?: string | null
          sensory_evidence?: string | null
          session_id: string
          updated_at?: string
          user_id: string
          value?: string | null
          within_control?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          desired_state?: string | null
          ecology?: string | null
          evidence?: string | null
          id?: string
          patient_words?: string | null
          sensory_evidence?: string | null
          session_id?: string
          updated_at?: string
          user_id?: string
          value?: string | null
          within_control?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ask_maeve_outcomes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ask_maeve_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_maeve_preferences: {
        Row: {
          created_at: string
          updated_at: string
          user_id: string
          voice_id: string
          voice_label: string | null
        }
        Insert: {
          created_at?: string
          updated_at?: string
          user_id: string
          voice_id?: string
          voice_label?: string | null
        }
        Update: {
          created_at?: string
          updated_at?: string
          user_id?: string
          voice_id?: string
          voice_label?: string | null
        }
        Relationships: []
      }
      ask_maeve_processes: {
        Row: {
          contraindications: Json
          created_at: string
          entry_conditions: Json
          exit_conditions: Json
          key: string
          name: string
          plain_language: string
          purpose: string
          requires_consent: boolean
          requires_ecology_check: boolean
          requires_future_pacing: boolean
          steps: Json
          updated_at: string
          version: number
        }
        Insert: {
          contraindications?: Json
          created_at?: string
          entry_conditions?: Json
          exit_conditions?: Json
          key: string
          name: string
          plain_language: string
          purpose: string
          requires_consent?: boolean
          requires_ecology_check?: boolean
          requires_future_pacing?: boolean
          steps?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          contraindications?: Json
          created_at?: string
          entry_conditions?: Json
          exit_conditions?: Json
          key?: string
          name?: string
          plain_language?: string
          purpose?: string
          requires_consent?: boolean
          requires_ecology_check?: boolean
          requires_future_pacing?: boolean
          steps?: Json
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      ask_maeve_resources: {
        Row: {
          created_at: string
          id: string
          label: string
          patient_words: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          patient_words?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          patient_words?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ask_maeve_resources_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ask_maeve_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_maeve_response_validations: {
        Row: {
          action_taken: string
          attempt: number
          created_at: string
          id: string
          message_id: string | null
          passed: boolean
          rules_fired: Json
          session_id: string | null
          user_id: string
        }
        Insert: {
          action_taken: string
          attempt?: number
          created_at?: string
          id?: string
          message_id?: string | null
          passed: boolean
          rules_fired?: Json
          session_id?: string | null
          user_id: string
        }
        Update: {
          action_taken?: string
          attempt?: number
          created_at?: string
          id?: string
          message_id?: string | null
          passed?: boolean
          rules_fired?: Json
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ask_maeve_response_validations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ask_maeve_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_maeve_safety_events: {
        Row: {
          action_taken: string
          category: string
          created_at: string
          detail: string | null
          id: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          action_taken: string
          category: string
          created_at?: string
          detail?: string | null
          id?: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          action_taken?: string
          category?: string
          created_at?: string
          detail?: string | null
          id?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ask_maeve_safety_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ask_maeve_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_maeve_session_processes: {
        Row: {
          completed_at: string | null
          consent_given: boolean
          created_at: string
          current_step: number
          id: string
          process_key: string
          session_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          consent_given?: boolean
          created_at?: string
          current_step?: number
          id?: string
          process_key: string
          session_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          consent_given?: boolean
          created_at?: string
          current_step?: number
          id?: string
          process_key?: string
          session_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ask_maeve_session_processes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ask_maeve_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_maeve_sessions: {
        Row: {
          closed_at: string | null
          conversation_state: string
          created_at: string
          current_state_description: string | null
          desired_outcome: string | null
          ecology_observations: Json
          future_pacing_observations: Json
          id: string
          longitudinal_consent: boolean
          patient_defined_insights: Json
          patient_language_patterns: Json
          patient_observations: Json
          safety_flagged: boolean
          session_intention: string | null
          session_summary: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
          well_formed_outcome: Json
        }
        Insert: {
          closed_at?: string | null
          conversation_state?: string
          created_at?: string
          current_state_description?: string | null
          desired_outcome?: string | null
          ecology_observations?: Json
          future_pacing_observations?: Json
          id?: string
          longitudinal_consent?: boolean
          patient_defined_insights?: Json
          patient_language_patterns?: Json
          patient_observations?: Json
          safety_flagged?: boolean
          session_intention?: string | null
          session_summary?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
          well_formed_outcome?: Json
        }
        Update: {
          closed_at?: string | null
          conversation_state?: string
          created_at?: string
          current_state_description?: string | null
          desired_outcome?: string | null
          ecology_observations?: Json
          future_pacing_observations?: Json
          id?: string
          longitudinal_consent?: boolean
          patient_defined_insights?: Json
          patient_language_patterns?: Json
          patient_observations?: Json
          safety_flagged?: boolean
          session_intention?: string | null
          session_summary?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          well_formed_outcome?: Json
        }
        Relationships: []
      }
      auth_recovery_attempts: {
        Row: {
          code_hash: string | null
          created_at: string
          id: number
          identifier_hash: string | null
          ip: string | null
          success: boolean
        }
        Insert: {
          code_hash?: string | null
          created_at?: string
          id?: never
          identifier_hash?: string | null
          ip?: string | null
          success?: boolean
        }
        Update: {
          code_hash?: string | null
          created_at?: string
          id?: never
          identifier_hash?: string | null
          ip?: string | null
          success?: boolean
        }
        Relationships: []
      }
      auth_recovery_audit: {
        Row: {
          created_at: string
          id: number
          ip: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          ip?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          ip?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      biolog_ageing_config: {
        Row: {
          created_at: string
          healthspan_attention_delta: number
          healthspan_improving_delta: number
          id: string
          max_days_high_quality: number
          min_daily_entries_for_insights: number
          min_days_between_assessments: number
          pace_faster_above: number
          pace_slower_below: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          healthspan_attention_delta?: number
          healthspan_improving_delta?: number
          id?: string
          max_days_high_quality?: number
          min_daily_entries_for_insights?: number
          min_days_between_assessments?: number
          pace_faster_above?: number
          pace_slower_below?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          healthspan_attention_delta?: number
          healthspan_improving_delta?: number
          id?: string
          max_days_high_quality?: number
          min_daily_entries_for_insights?: number
          min_days_between_assessments?: number
          pace_faster_above?: number
          pace_slower_below?: number
          updated_at?: string
        }
        Relationships: []
      }
      biolog_ageing_insights: {
        Row: {
          assessment_id: string | null
          confidence: string | null
          created_at: string
          description: string | null
          evidence: Json
          generated_at: string
          id: string
          insight_type: string
          patient_user_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assessment_id?: string | null
          confidence?: string | null
          created_at?: string
          description?: string | null
          evidence?: Json
          generated_at?: string
          id?: string
          insight_type?: string
          patient_user_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string | null
          confidence?: string | null
          created_at?: string
          description?: string | null
          evidence?: Json
          generated_at?: string
          id?: string
          insight_type?: string
          patient_user_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "biolog_ageing_insights_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "biolog_biological_age_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      biolog_biological_age_assessments: {
        Row: {
          age_difference: number | null
          ageing_pace: number | null
          assessment_date: string
          assessment_type: string
          biological_age: number | null
          chronological_age: number | null
          created_at: string
          created_by: string | null
          id: string
          laboratory_name: string | null
          markers: Json
          model_name: string | null
          notes: string | null
          patient_user_id: string
          provider_name: string | null
          reference_population: string | null
          report_path: string | null
          sample_type: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          age_difference?: number | null
          ageing_pace?: number | null
          assessment_date: string
          assessment_type?: string
          biological_age?: number | null
          chronological_age?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          laboratory_name?: string | null
          markers?: Json
          model_name?: string | null
          notes?: string | null
          patient_user_id: string
          provider_name?: string | null
          reference_population?: string | null
          report_path?: string | null
          sample_type?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          age_difference?: number | null
          ageing_pace?: number | null
          assessment_date?: string
          assessment_type?: string
          biological_age?: number | null
          chronological_age?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          laboratory_name?: string | null
          markers?: Json
          model_name?: string | null
          notes?: string | null
          patient_user_id?: string
          provider_name?: string | null
          reference_population?: string | null
          report_path?: string | null
          sample_type?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      biolog_correlations: {
        Row: {
          created_at: string
          enabled: boolean
          group_name: string
          id: string
          input_variable: string
          is_custom: boolean
          outcome_variables: string[]
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          group_name?: string
          id?: string
          input_variable: string
          is_custom?: boolean
          outcome_variables?: string[]
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          group_name?: string
          id?: string
          input_variable?: string
          is_custom?: boolean
          outcome_variables?: string[]
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      biolog_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          note: string | null
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_date?: string
          id?: string
          note?: string | null
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          note?: string | null
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      biolog_exercises: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          unit: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
          unit?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      biolog_foods: {
        Row: {
          calories: number | null
          category: string
          created_at: string
          id: string
          kilojoules: number | null
          name: string
          serving_size: string | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          category?: string
          created_at?: string
          id?: string
          kilojoules?: number | null
          name: string
          serving_size?: string | null
          user_id: string
        }
        Update: {
          calories?: number | null
          category?: string
          created_at?: string
          id?: string
          kilojoules?: number | null
          name?: string
          serving_size?: string | null
          user_id?: string
        }
        Relationships: []
      }
      biolog_medications: {
        Row: {
          created_at: string
          dose_amount: number | null
          dose_unit: string | null
          id: string
          label: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dose_amount?: number | null
          dose_unit?: string | null
          id?: string
          label: string
          user_id: string
        }
        Update: {
          created_at?: string
          dose_amount?: number | null
          dose_unit?: string | null
          id?: string
          label?: string
          user_id?: string
        }
        Relationships: []
      }
      biolog_programme_assignments: {
        Row: {
          assigned_by: string
          created_at: string
          end_date: string | null
          id: string
          patient_user_id: string
          programme_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          end_date?: string | null
          id?: string
          patient_user_id: string
          programme_id: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          end_date?: string | null
          id?: string
          patient_user_id?: string
          programme_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "biolog_programme_assignments_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "biolog_programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      biolog_programmes: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          duration_days: number
          id: string
          kind: string
          name: string
          targets: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          duration_days?: number
          id?: string
          kind?: string
          name: string
          targets?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          duration_days?: number
          id?: string
          kind?: string
          name?: string
          targets?: Json
          updated_at?: string
        }
        Relationships: []
      }
      biolog_section_order: {
        Row: {
          block_order: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          block_order?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          block_order?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      biolog_sections: {
        Row: {
          created_at: string
          enabled: boolean
          group_name: string
          id: string
          is_custom: boolean
          key: string
          label: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          group_name?: string
          id?: string
          is_custom?: boolean
          key: string
          label: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          group_name?: string
          id?: string
          is_custom?: boolean
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blood_bank_providers: {
        Row: {
          address: string | null
          approved_at: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          owner_id: string
          registration_number: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          owner_id: string
          registration_number?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          owner_id?: string
          registration_number?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      blood_donations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          blood_bank_id: string
          created_at: string
          donated_at: string
          id: string
          notes: string | null
          patient_user_id: string
          rewarded: boolean
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          blood_bank_id: string
          created_at?: string
          donated_at?: string
          id?: string
          notes?: string | null
          patient_user_id: string
          rewarded?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          blood_bank_id?: string
          created_at?: string
          donated_at?: string
          id?: string
          notes?: string | null
          patient_user_id?: string
          rewarded?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blood_donations_blood_bank_id_fkey"
            columns: ["blood_bank_id"]
            isOneToOne: false
            referencedRelation: "blood_bank_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_donations_blood_bank_id_fkey"
            columns: ["blood_bank_id"]
            isOneToOne: false
            referencedRelation: "blood_bank_providers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_actuals: {
        Row: {
          amount: number
          created_at: string | null
          department_budget_id: string | null
          description: string | null
          id: string
          reference_id: string | null
          transaction_date: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          department_budget_id?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_date?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          department_budget_id?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_date?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_actuals_department_budget_id_fkey"
            columns: ["department_budget_id"]
            isOneToOne: false
            referencedRelation: "department_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          created_at: string
          created_via: string
          description: string | null
          display_name: string | null
          id: string
          status: string
          status_changed_at: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_via?: string
          description?: string | null
          display_name?: string | null
          id?: string
          status?: string
          status_changed_at?: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_via?: string
          description?: string | null
          display_name?: string | null
          id?: string
          status?: string
          status_changed_at?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_connections: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          provider: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clinical_protocols: {
        Row: {
          applicable_conditions: string[]
          checklist_items: string[]
          contraindicated_meds: string[] | null
          created_at: string | null
          description: string | null
          id: string
          monitoring_parameters: string[] | null
          priority_level: string | null
          protocol_code: string | null
          protocol_name: string
          recommended_medications: string[] | null
        }
        Insert: {
          applicable_conditions: string[]
          checklist_items: string[]
          contraindicated_meds?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          monitoring_parameters?: string[] | null
          priority_level?: string | null
          protocol_code?: string | null
          protocol_name: string
          recommended_medications?: string[] | null
        }
        Update: {
          applicable_conditions?: string[]
          checklist_items?: string[]
          contraindicated_meds?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          monitoring_parameters?: string[] | null
          priority_level?: string | null
          protocol_code?: string | null
          protocol_name?: string
          recommended_medications?: string[] | null
        }
        Relationships: []
      }
      compliance_audit_trail: {
        Row: {
          action: string | null
          compliance_impact: string | null
          created_at: string | null
          details: string | null
          id: string
          incident_id: string | null
          staff_user_id: string | null
        }
        Insert: {
          action?: string | null
          compliance_impact?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          incident_id?: string | null
          staff_user_id?: string | null
        }
        Update: {
          action?: string | null
          compliance_impact?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          incident_id?: string | null
          staff_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_audit_trail_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cpd_certificates: {
        Row: {
          certificate_name: string
          certificate_url: string | null
          cpd_points: number | null
          created_at: string | null
          date_earned: string
          id: string
          issuing_body: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          certificate_name: string
          certificate_url?: string | null
          cpd_points?: number | null
          created_at?: string | null
          date_earned: string
          id?: string
          issuing_body?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          certificate_name?: string
          certificate_url?: string | null
          cpd_points?: number | null
          created_at?: string | null
          date_earned?: string
          id?: string
          issuing_body?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      demand_forecasts: {
        Row: {
          based_on_avg_consumption: number | null
          confidence_level: string | null
          created_at: string | null
          forecast_period: string
          hospital_id: string | null
          id: string
          projected_quantity: number
          stock_item_id: string | null
        }
        Insert: {
          based_on_avg_consumption?: number | null
          confidence_level?: string | null
          created_at?: string | null
          forecast_period: string
          hospital_id?: string | null
          id?: string
          projected_quantity: number
          stock_item_id?: string | null
        }
        Update: {
          based_on_avg_consumption?: number | null
          confidence_level?: string | null
          created_at?: string | null
          forecast_period?: string
          hospital_id?: string | null
          id?: string
          projected_quantity?: number
          stock_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demand_forecasts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_forecasts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_forecasts_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      department_budgets: {
        Row: {
          allocated_amount: number
          budget_period: string
          category: string
          created_at: string | null
          department_name: string
          hospital_id: string | null
          id: string
          period_end: string
          period_start: string
        }
        Insert: {
          allocated_amount: number
          budget_period: string
          category: string
          created_at?: string | null
          department_name: string
          hospital_id?: string | null
          id?: string
          period_end: string
          period_start: string
        }
        Update: {
          allocated_amount?: number
          budget_period?: string
          category?: string
          created_at?: string | null
          department_name?: string
          hospital_id?: string | null
          id?: string
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_budgets_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_budgets_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_access_requests: {
        Row: {
          created_at: string
          doctor_practice_number: string
          doctor_registration_number: string
          id: string
          patient_avatar_url: string | null
          patient_name: string | null
          patient_user_id: string
          status: Database["public"]["Enums"]["invitation_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_practice_number: string
          doctor_registration_number: string
          id?: string
          patient_avatar_url?: string | null
          patient_name?: string | null
          patient_user_id: string
          status?: Database["public"]["Enums"]["invitation_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_practice_number?: string
          doctor_registration_number?: string
          id?: string
          patient_avatar_url?: string | null
          patient_name?: string | null
          patient_user_id?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          updated_at?: string
        }
        Relationships: []
      }
      doctor_congratulations: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          streak_count: number
          streak_type: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          streak_count: number
          streak_type: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          streak_count?: number
          streak_type?: string
        }
        Relationships: []
      }
      doctor_hospital_affiliations: {
        Row: {
          created_at: string
          doctor_id: string | null
          hospital_id: string | null
          hospital_name_snapshot: string | null
          id: string
          pending_doctor_payload: Json | null
          role_at_hospital: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id?: string | null
          hospital_id?: string | null
          hospital_name_snapshot?: string | null
          id?: string
          pending_doctor_payload?: Json | null
          role_at_hospital?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string | null
          hospital_id?: string | null
          hospital_name_snapshot?: string | null
          id?: string
          pending_doctor_payload?: Json | null
          role_at_hospital?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_hospital_affiliations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_hospital_affiliations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_patient_access: {
        Row: {
          created_at: string
          doctor_id: string
          granted_at: string
          id: string
          is_active: boolean
          patient_user_id: string
          permissions: Database["public"]["Enums"]["access_permission"][]
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          granted_at?: string
          id?: string
          is_active?: boolean
          patient_user_id: string
          permissions?: Database["public"]["Enums"]["access_permission"][]
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          granted_at?: string
          id?: string
          is_active?: boolean
          patient_user_id?: string
          permissions?: Database["public"]["Enums"]["access_permission"][]
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      doctor_patient_checkins: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          note: string | null
          patient_user_id: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          note?: string | null
          patient_user_id: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          note?: string | null
          patient_user_id?: string
        }
        Relationships: []
      }
      doctor_rewards: {
        Row: {
          awarded_at: string | null
          description: string | null
          doctor_id: string
          id: string
          reference_id: string | null
          reward_type: string
          vulas_count: number
        }
        Insert: {
          awarded_at?: string | null
          description?: string | null
          doctor_id: string
          id?: string
          reference_id?: string | null
          reward_type: string
          vulas_count?: number
        }
        Update: {
          awarded_at?: string | null
          description?: string | null
          doctor_id?: string
          id?: string
          reference_id?: string | null
          reward_type?: string
          vulas_count?: number
        }
        Relationships: []
      }
      document_shares: {
        Row: {
          created_at: string
          document_id: string
          expires_at: string | null
          id: string
          message: string | null
          opened_at: string | null
          recipient_email: string
          recipient_user_id: string | null
          shared_by: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id: string
          expires_at?: string | null
          id?: string
          message?: string | null
          opened_at?: string | null
          recipient_email: string
          recipient_user_id?: string | null
          shared_by: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          opened_at?: string | null
          recipient_email?: string
          recipient_user_id?: string | null
          shared_by?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation_suggestions: {
        Row: {
          created_at: string | null
          id: string
          incident_id: string | null
          patient_user_id: string | null
          priority: string | null
          related_data: Json | null
          suggestion_text: string | null
          suggestion_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          incident_id?: string | null
          patient_user_id?: string | null
          priority?: string | null
          related_data?: Json | null
          suggestion_text?: string | null
          suggestion_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          incident_id?: string | null
          patient_user_id?: string | null
          priority?: string | null
          related_data?: Json | null
          suggestion_text?: string | null
          suggestion_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentation_suggestions_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_analysis: string | null
          ai_analyzed_at: string | null
          attachments: Json
          content: string
          created_at: string
          email_sent_at: string | null
          id: string
          is_draft: boolean | null
          is_transcribed: boolean
          linked_document_ids: string[]
          media_type: string | null
          media_url: string | null
          name: string
          patient_id: string | null
          patient_name: string | null
          record_date: string | null
          session_id: string | null
          source_file_name: string | null
          source_file_url: string | null
          template_id: string | null
          template_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: string | null
          ai_analyzed_at?: string | null
          attachments?: Json
          content: string
          created_at?: string
          email_sent_at?: string | null
          id?: string
          is_draft?: boolean | null
          is_transcribed?: boolean
          linked_document_ids?: string[]
          media_type?: string | null
          media_url?: string | null
          name: string
          patient_id?: string | null
          patient_name?: string | null
          record_date?: string | null
          session_id?: string | null
          source_file_name?: string | null
          source_file_url?: string | null
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: string | null
          ai_analyzed_at?: string | null
          attachments?: Json
          content?: string
          created_at?: string
          email_sent_at?: string | null
          id?: string
          is_draft?: boolean | null
          is_transcribed?: boolean
          linked_document_ids?: string[]
          media_type?: string | null
          media_url?: string | null
          name?: string
          patient_id?: string | null
          patient_name?: string | null
          record_date?: string | null
          session_id?: string | null
          source_file_name?: string | null
          source_file_url?: string | null
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_interactions: {
        Row: {
          clinical_effect: string | null
          created_at: string | null
          drug_1: string
          drug_2: string
          id: string
          interaction_description: string | null
          recommendation: string | null
          severity: string
          updated_at: string | null
        }
        Insert: {
          clinical_effect?: string | null
          created_at?: string | null
          drug_1: string
          drug_2: string
          id?: string
          interaction_description?: string | null
          recommendation?: string | null
          severity: string
          updated_at?: string | null
        }
        Update: {
          clinical_effect?: string | null
          created_at?: string | null
          drug_1?: string
          drug_2?: string
          id?: string
          interaction_description?: string | null
          recommendation?: string | null
          severity?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      emoticon_messages: {
        Row: {
          ai_reason: string | null
          ai_verdict: string | null
          created_at: string | null
          emoticon: string
          id: string
          is_ai_flagged: boolean | null
          message: string | null
          patient_id: string
          profile_viewed: boolean | null
          recipient_id: string
          reply_to_id: string | null
          sender_id: string
          vulas_awarded: number | null
        }
        Insert: {
          ai_reason?: string | null
          ai_verdict?: string | null
          created_at?: string | null
          emoticon: string
          id?: string
          is_ai_flagged?: boolean | null
          message?: string | null
          patient_id: string
          profile_viewed?: boolean | null
          recipient_id: string
          reply_to_id?: string | null
          sender_id: string
          vulas_awarded?: number | null
        }
        Update: {
          ai_reason?: string | null
          ai_verdict?: string | null
          created_at?: string | null
          emoticon?: string
          id?: string
          is_ai_flagged?: boolean | null
          message?: string | null
          patient_id?: string
          profile_viewed?: boolean | null
          recipient_id?: string
          reply_to_id?: string | null
          sender_id?: string
          vulas_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "emoticon_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emoticon_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "emoticon_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_plan_days: {
        Row: {
          created_at: string
          day_of_week: number
          description: string
          id: string
          plan_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          description?: string
          id?: string
          plan_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          description?: string
          id?: string
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_plan_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "exercise_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_plans: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          patient_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          patient_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_config: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          lollipops_awarded: number
          updated_at: string
          visit_category: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          lollipops_awarded?: number
          updated_at?: string
          visit_category: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          lollipops_awarded?: number
          updated_at?: string
          visit_category?: string
        }
        Relationships: []
      }
      goods_received: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          purchase_order_id: string | null
          received_by: string | null
          received_date: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          purchase_order_id?: string | null
          received_by?: string | null
          received_date?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          purchase_order_id?: string | null
          received_by?: string | null
          received_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_received_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      header_footer_templates: {
        Row: {
          created_at: string
          description: string | null
          font_family: string | null
          footer: Json | null
          header: Json | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          font_family?: string | null
          footer?: Json | null
          header?: Json | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          font_family?: string | null
          footer?: Json | null
          header?: Json | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_photos: {
        Row: {
          ai_validation_result: Json | null
          captured_at: string
          category: string
          created_at: string
          id: string
          is_validated: boolean | null
          lollipops_awarded: number | null
          patient_id: string
          photo_date: string
          photo_url: string
        }
        Insert: {
          ai_validation_result?: Json | null
          captured_at?: string
          category: string
          created_at?: string
          id?: string
          is_validated?: boolean | null
          lollipops_awarded?: number | null
          patient_id: string
          photo_date?: string
          photo_url: string
        }
        Update: {
          ai_validation_result?: Json | null
          captured_at?: string
          category?: string
          created_at?: string
          id?: string
          is_validated?: boolean | null
          lollipops_awarded?: number | null
          patient_id?: string
          photo_date?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_photos_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      holarchelp_ambulance_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          invited_by: string | null
          invited_email: string | null
          invited_name: string | null
          phone: string | null
          provider_id: string
          role: string
          shift_pattern: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          invited_email?: string | null
          invited_name?: string | null
          phone?: string | null
          provider_id: string
          role?: string
          shift_pattern?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          invited_email?: string | null
          invited_name?: string | null
          phone?: string | null
          provider_id?: string
          role?: string
          shift_pattern?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_ambulance_members_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_ambulance_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_ambulance_members_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_ambulance_providers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      holarchelp_ambulance_providers: {
        Row: {
          accepting_patients: boolean
          admin_email: string | null
          admin_full_name: string | null
          admin_phone: string | null
          approved_at: string | null
          at_capacity: boolean
          base_address: string | null
          city: string | null
          company_name: string
          contact_email: string
          contact_phone: string | null
          country: string | null
          created_at: string
          credential_score: number | null
          credential_score_updated_at: string | null
          directors: Json
          dispatch_priority: number
          dispatcher_on_duty: boolean
          dispatcher_on_duty_since: string | null
          dispatcher_on_duty_user_id: string | null
          emergency_phone: string | null
          fleet_size: number | null
          id: string
          latitude: number | null
          license_file_mime: string | null
          license_file_path: string | null
          license_file_size_bytes: number | null
          longitude: number | null
          owner_id: string
          ownership: string
          registration_number: string | null
          rejection_reason: string | null
          sos_voice_clip_path: string | null
          state: string | null
          status: Database["public"]["Enums"]["holarchelp_provider_status"]
          subscription_status: Database["public"]["Enums"]["holarchelp_subscription_status"]
          tier: Database["public"]["Enums"]["holarchelp_ambulance_tier"]
          updated_at: string
        }
        Insert: {
          accepting_patients?: boolean
          admin_email?: string | null
          admin_full_name?: string | null
          admin_phone?: string | null
          approved_at?: string | null
          at_capacity?: boolean
          base_address?: string | null
          city?: string | null
          company_name: string
          contact_email: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          credential_score?: number | null
          credential_score_updated_at?: string | null
          directors?: Json
          dispatch_priority?: number
          dispatcher_on_duty?: boolean
          dispatcher_on_duty_since?: string | null
          dispatcher_on_duty_user_id?: string | null
          emergency_phone?: string | null
          fleet_size?: number | null
          id?: string
          latitude?: number | null
          license_file_mime?: string | null
          license_file_path?: string | null
          license_file_size_bytes?: number | null
          longitude?: number | null
          owner_id: string
          ownership?: string
          registration_number?: string | null
          rejection_reason?: string | null
          sos_voice_clip_path?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["holarchelp_provider_status"]
          subscription_status?: Database["public"]["Enums"]["holarchelp_subscription_status"]
          tier?: Database["public"]["Enums"]["holarchelp_ambulance_tier"]
          updated_at?: string
        }
        Update: {
          accepting_patients?: boolean
          admin_email?: string | null
          admin_full_name?: string | null
          admin_phone?: string | null
          approved_at?: string | null
          at_capacity?: boolean
          base_address?: string | null
          city?: string | null
          company_name?: string
          contact_email?: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          credential_score?: number | null
          credential_score_updated_at?: string | null
          directors?: Json
          dispatch_priority?: number
          dispatcher_on_duty?: boolean
          dispatcher_on_duty_since?: string | null
          dispatcher_on_duty_user_id?: string | null
          emergency_phone?: string | null
          fleet_size?: number | null
          id?: string
          latitude?: number | null
          license_file_mime?: string | null
          license_file_path?: string | null
          license_file_size_bytes?: number | null
          longitude?: number | null
          owner_id?: string
          ownership?: string
          registration_number?: string | null
          rejection_reason?: string | null
          sos_voice_clip_path?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["holarchelp_provider_status"]
          subscription_status?: Database["public"]["Enums"]["holarchelp_subscription_status"]
          tier?: Database["public"]["Enums"]["holarchelp_ambulance_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      holarchelp_emergency_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notify_min_severity: string
          personal_info_ref: string | null
          phone: string | null
          priority: number
          relationship: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notify_min_severity?: string
          personal_info_ref?: string | null
          phone?: string | null
          priority?: number
          relationship?: string | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notify_min_severity?: string
          personal_info_ref?: string | null
          phone?: string | null
          priority?: number
          relationship?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      holarchelp_hospital_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          hospital_id: string
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          invited_by: string | null
          invited_email: string | null
          invited_name: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          hospital_id: string
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          invited_email?: string | null
          invited_name?: string | null
          role?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          hospital_id?: string
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          invited_email?: string | null
          invited_name?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_hospital_members_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_hospital_members_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      holarchelp_hospitals: {
        Row: {
          accepting_patients: boolean
          accepts_ambulance_transfers: boolean
          address: string | null
          admin_email: string | null
          admin_full_name: string | null
          admin_phone: string | null
          approved_at: string | null
          at_capacity: boolean
          bed_capacity: number | null
          beds_available: number | null
          city: string | null
          contact_email: string
          contact_phone: string | null
          country: string | null
          created_at: string
          credential_score: number | null
          credential_score_updated_at: string | null
          directors: Json
          dispatch_priority: number
          er_beds_available: number | null
          er_capacity_status: string
          has_emergency_department: boolean
          icu_available: number | null
          icu_capacity: number | null
          id: string
          latitude: number | null
          license_file_mime: string | null
          license_file_path: string | null
          license_file_size_bytes: number | null
          longitude: number | null
          name: string
          operates_own_ambulance_fleet: boolean
          owner_id: string
          ownership: string
          registration_number: string | null
          rejection_reason: string | null
          services: string[] | null
          state: string | null
          status: Database["public"]["Enums"]["holarchelp_provider_status"]
          subscription_status: Database["public"]["Enums"]["holarchelp_subscription_status"]
          tier: Database["public"]["Enums"]["holarchelp_hospital_tier"]
          updated_at: string
        }
        Insert: {
          accepting_patients?: boolean
          accepts_ambulance_transfers?: boolean
          address?: string | null
          admin_email?: string | null
          admin_full_name?: string | null
          admin_phone?: string | null
          approved_at?: string | null
          at_capacity?: boolean
          bed_capacity?: number | null
          beds_available?: number | null
          city?: string | null
          contact_email: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          credential_score?: number | null
          credential_score_updated_at?: string | null
          directors?: Json
          dispatch_priority?: number
          er_beds_available?: number | null
          er_capacity_status?: string
          has_emergency_department?: boolean
          icu_available?: number | null
          icu_capacity?: number | null
          id?: string
          latitude?: number | null
          license_file_mime?: string | null
          license_file_path?: string | null
          license_file_size_bytes?: number | null
          longitude?: number | null
          name: string
          operates_own_ambulance_fleet?: boolean
          owner_id: string
          ownership?: string
          registration_number?: string | null
          rejection_reason?: string | null
          services?: string[] | null
          state?: string | null
          status?: Database["public"]["Enums"]["holarchelp_provider_status"]
          subscription_status?: Database["public"]["Enums"]["holarchelp_subscription_status"]
          tier?: Database["public"]["Enums"]["holarchelp_hospital_tier"]
          updated_at?: string
        }
        Update: {
          accepting_patients?: boolean
          accepts_ambulance_transfers?: boolean
          address?: string | null
          admin_email?: string | null
          admin_full_name?: string | null
          admin_phone?: string | null
          approved_at?: string | null
          at_capacity?: boolean
          bed_capacity?: number | null
          beds_available?: number | null
          city?: string | null
          contact_email?: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          credential_score?: number | null
          credential_score_updated_at?: string | null
          directors?: Json
          dispatch_priority?: number
          er_beds_available?: number | null
          er_capacity_status?: string
          has_emergency_department?: boolean
          icu_available?: number | null
          icu_capacity?: number | null
          id?: string
          latitude?: number | null
          license_file_mime?: string | null
          license_file_path?: string | null
          license_file_size_bytes?: number | null
          longitude?: number | null
          name?: string
          operates_own_ambulance_fleet?: boolean
          owner_id?: string
          ownership?: string
          registration_number?: string | null
          rejection_reason?: string | null
          services?: string[] | null
          state?: string | null
          status?: Database["public"]["Enums"]["holarchelp_provider_status"]
          subscription_status?: Database["public"]["Enums"]["holarchelp_subscription_status"]
          tier?: Database["public"]["Enums"]["holarchelp_hospital_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      holarchelp_incident_cancellations: {
        Row: {
          created_at: string
          evidence_note: string | null
          id: string
          incident_id: string
          provider_id: string
          reason_code: string
          reason_text: string
        }
        Insert: {
          created_at?: string
          evidence_note?: string | null
          id?: string
          incident_id: string
          provider_id: string
          reason_code: string
          reason_text: string
        }
        Update: {
          created_at?: string
          evidence_note?: string | null
          id?: string
          incident_id?: string
          provider_id?: string
          reason_code?: string
          reason_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_incident_cancellations_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      holarchelp_incident_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          incident_id: string
          latitude: number | null
          longitude: number | null
          payload: Json | null
          provider_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          incident_id: string
          latitude?: number | null
          longitude?: number | null
          payload?: Json | null
          provider_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          incident_id?: string
          latitude?: number | null
          longitude?: number | null
          payload?: Json | null
          provider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_incident_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      holarchelp_incident_feedback: {
        Row: {
          arrived_on_time: boolean
          comment: string | null
          created_at: string
          critical_flag: boolean
          felt_safe: boolean
          id: string
          incident_id: string
          rating: number
          user_id: string
        }
        Insert: {
          arrived_on_time: boolean
          comment?: string | null
          created_at?: string
          critical_flag?: boolean
          felt_safe: boolean
          id?: string
          incident_id: string
          rating: number
          user_id: string
        }
        Update: {
          arrived_on_time?: boolean
          comment?: string | null
          created_at?: string
          critical_flag?: boolean
          felt_safe?: boolean
          id?: string
          incident_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_incident_feedback_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: true
            referencedRelation: "holarchelp_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      holarchelp_incident_offers: {
        Row: {
          distance_km: number | null
          id: string
          incident_id: string
          offered_at: string
          paramedic_user_id: string | null
          priority_boost: boolean
          provider_id: string
          provider_kind: string
          responded_at: string | null
          response: string
        }
        Insert: {
          distance_km?: number | null
          id?: string
          incident_id: string
          offered_at?: string
          paramedic_user_id?: string | null
          priority_boost?: boolean
          provider_id: string
          provider_kind?: string
          responded_at?: string | null
          response?: string
        }
        Update: {
          distance_km?: number | null
          id?: string
          incident_id?: string
          offered_at?: string
          paramedic_user_id?: string | null
          priority_boost?: boolean
          provider_id?: string
          provider_kind?: string
          responded_at?: string | null
          response?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_incident_offers_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      holarchelp_incident_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          incident_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          incident_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          incident_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "holarchelp_incident_photos_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      holarchelp_incidents: {
        Row: {
          accepted_at: string | null
          activation_method: string | null
          admitted_at: string | null
          ai_emergency_summary: string | null
          arrived_at: string | null
          assigned_ambulance_id: string | null
          assigned_doctor_name: string | null
          assigned_doctor_user_id: string | null
          assigned_paramedic_user_id: string | null
          assigned_provider_id: string | null
          assigned_trauma_bay: string | null
          at_hospital_at: string | null
          at_risk: boolean
          breathing: boolean | null
          cancelled_at: string | null
          completed_at: string | null
          conscious: boolean | null
          coverage: string
          created_at: string
          destination_hospital_id: string | null
          device_id: string | null
          en_route_at: string | null
          escalated_at: string | null
          escalation_level: number
          eta_minutes: number | null
          first_contact_acknowledged_at: string | null
          handover_at: string | null
          handover_notes: string | null
          handover_status: string
          hospital_acceptance_status: string
          hospital_accepted_by: string | null
          hospital_admission_status: string | null
          hospital_decision_at: string | null
          id: string
          incident_number: string
          last_eta_update: string | null
          manually_logged: boolean
          notes: string | null
          patient_collected_at: string | null
          patient_name_cached: string | null
          patient_user_id: string | null
          pre_arrival_notes: string | null
          priority_boost: boolean
          provider_latitude: number | null
          provider_location_updated_at: string | null
          provider_longitude: number | null
          resolved_at: string | null
          severity: string
          status: string
          tracking_token: string
          trauma_team_prepared: boolean
          triage_assigned_at: string | null
          triage_bay: string | null
          triage_nurse: string | null
          triage_priority: string | null
          triggered_by_role: string | null
          triggered_by_user_id: string | null
          user_id: string
          voice_note_audio_url: string | null
          voice_note_transcript: string | null
        }
        Insert: {
          accepted_at?: string | null
          activation_method?: string | null
          admitted_at?: string | null
          ai_emergency_summary?: string | null
          arrived_at?: string | null
          assigned_ambulance_id?: string | null
          assigned_doctor_name?: string | null
          assigned_doctor_user_id?: string | null
          assigned_paramedic_user_id?: string | null
          assigned_provider_id?: string | null
          assigned_trauma_bay?: string | null
          at_hospital_at?: string | null
          at_risk?: boolean
          breathing?: boolean | null
          cancelled_at?: string | null
          completed_at?: string | null
          conscious?: boolean | null
          coverage?: string
          created_at?: string
          destination_hospital_id?: string | null
          device_id?: string | null
          en_route_at?: string | null
          escalated_at?: string | null
          escalation_level?: number
          eta_minutes?: number | null
          first_contact_acknowledged_at?: string | null
          handover_at?: string | null
          handover_notes?: string | null
          handover_status?: string
          hospital_acceptance_status?: string
          hospital_accepted_by?: string | null
          hospital_admission_status?: string | null
          hospital_decision_at?: string | null
          id?: string
          incident_number: string
          last_eta_update?: string | null
          manually_logged?: boolean
          notes?: string | null
          patient_collected_at?: string | null
          patient_name_cached?: string | null
          patient_user_id?: string | null
          pre_arrival_notes?: string | null
          priority_boost?: boolean
          provider_latitude?: number | null
          provider_location_updated_at?: string | null
          provider_longitude?: number | null
          resolved_at?: string | null
          severity?: string
          status?: string
          tracking_token?: string
          trauma_team_prepared?: boolean
          triage_assigned_at?: string | null
          triage_bay?: string | null
          triage_nurse?: string | null
          triage_priority?: string | null
          triggered_by_role?: string | null
          triggered_by_user_id?: string | null
          user_id: string
          voice_note_audio_url?: string | null
          voice_note_transcript?: string | null
        }
        Update: {
          accepted_at?: string | null
          activation_method?: string | null
          admitted_at?: string | null
          ai_emergency_summary?: string | null
          arrived_at?: string | null
          assigned_ambulance_id?: string | null
          assigned_doctor_name?: string | null
          assigned_doctor_user_id?: string | null
          assigned_paramedic_user_id?: string | null
          assigned_provider_id?: string | null
          assigned_trauma_bay?: string | null
          at_hospital_at?: string | null
          at_risk?: boolean
          breathing?: boolean | null
          cancelled_at?: string | null
          completed_at?: string | null
          conscious?: boolean | null
          coverage?: string
          created_at?: string
          destination_hospital_id?: string | null
          device_id?: string | null
          en_route_at?: string | null
          escalated_at?: string | null
          escalation_level?: number
          eta_minutes?: number | null
          first_contact_acknowledged_at?: string | null
          handover_at?: string | null
          handover_notes?: string | null
          handover_status?: string
          hospital_acceptance_status?: string
          hospital_accepted_by?: string | null
          hospital_admission_status?: string | null
          hospital_decision_at?: string | null
          id?: string
          incident_number?: string
          last_eta_update?: string | null
          manually_logged?: boolean
          notes?: string | null
          patient_collected_at?: string | null
          patient_name_cached?: string | null
          patient_user_id?: string | null
          pre_arrival_notes?: string | null
          priority_boost?: boolean
          provider_latitude?: number | null
          provider_location_updated_at?: string | null
          provider_longitude?: number | null
          resolved_at?: string | null
          severity?: string
          status?: string
          tracking_token?: string
          trauma_team_prepared?: boolean
          triage_assigned_at?: string | null
          triage_bay?: string | null
          triage_nurse?: string | null
          triage_priority?: string | null
          triggered_by_role?: string | null
          triggered_by_user_id?: string | null
          user_id?: string
          voice_note_audio_url?: string | null
          voice_note_transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holarchelp_incidents_assigned_ambulance_id_fkey"
            columns: ["assigned_ambulance_id"]
            isOneToOne: false
            referencedRelation: "ambulances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holarchelp_incidents_destination_hospital_id_fkey"
            columns: ["destination_hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holarchelp_incidents_destination_hospital_id_fkey"
            columns: ["destination_hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holarchelp_incidents_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      holarchelp_insurance_providers: {
        Row: {
          admin_email: string | null
          admin_full_name: string | null
          admin_phone: string | null
          approved_at: string | null
          base_address: string | null
          city: string | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          credential_score: number | null
          directors: Json | null
          id: string
          insurance_type: string
          license_file_mime: string | null
          license_file_path: string | null
          license_file_size_bytes: number | null
          owner_id: string
          ownership: string | null
          registration_number: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["holarchelp_provider_status"]
          updated_at: string
        }
        Insert: {
          admin_email?: string | null
          admin_full_name?: string | null
          admin_phone?: string | null
          approved_at?: string | null
          base_address?: string | null
          city?: string | null
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          credential_score?: number | null
          directors?: Json | null
          id?: string
          insurance_type?: string
          license_file_mime?: string | null
          license_file_path?: string | null
          license_file_size_bytes?: number | null
          owner_id: string
          ownership?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["holarchelp_provider_status"]
          updated_at?: string
        }
        Update: {
          admin_email?: string | null
          admin_full_name?: string | null
          admin_phone?: string | null
          approved_at?: string | null
          base_address?: string | null
          city?: string | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          credential_score?: number | null
          directors?: Json | null
          id?: string
          insurance_type?: string
          license_file_mime?: string | null
          license_file_path?: string | null
          license_file_size_bytes?: number | null
          owner_id?: string
          ownership?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["holarchelp_provider_status"]
          updated_at?: string
        }
        Relationships: []
      }
      holarchelp_locations: {
        Row: {
          accuracy: number | null
          id: string
          incident_id: string
          latitude: number
          longitude: number
          recorded_at: string
        }
        Insert: {
          accuracy?: number | null
          id?: string
          incident_id: string
          latitude: number
          longitude: number
          recorded_at?: string
        }
        Update: {
          accuracy?: number | null
          id?: string
          incident_id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_locations_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      holarchelp_messaging_log: {
        Row: {
          channel: string
          cost: string | null
          created_at: string
          error_message: string | null
          escalation_level: number | null
          id: string
          incident_id: string | null
          metadata: Json | null
          provider_message_id: string | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          status: string
          user_id: string
        }
        Insert: {
          channel: string
          cost?: string | null
          created_at?: string
          error_message?: string | null
          escalation_level?: number | null
          id?: string
          incident_id?: string | null
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string
          user_id: string
        }
        Update: {
          channel?: string
          cost?: string | null
          created_at?: string
          error_message?: string | null
          escalation_level?: number | null
          id?: string
          incident_id?: string | null
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      holarchelp_pharmacies: {
        Row: {
          accepting_patients: boolean
          address: string | null
          admin_email: string | null
          admin_full_name: string | null
          admin_phone: string | null
          approved_at: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          credential_score: number | null
          directors: Json | null
          dispatch_priority: number
          id: string
          latitude: number | null
          license_file_mime: string | null
          license_file_path: string | null
          license_file_size_bytes: number | null
          longitude: number | null
          name: string
          owner_id: string
          registration_number: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["holarchelp_provider_status"]
          tier: Database["public"]["Enums"]["holarchelp_hospital_tier"]
          updated_at: string
        }
        Insert: {
          accepting_patients?: boolean
          address?: string | null
          admin_email?: string | null
          admin_full_name?: string | null
          admin_phone?: string | null
          approved_at?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          credential_score?: number | null
          directors?: Json | null
          dispatch_priority?: number
          id?: string
          latitude?: number | null
          license_file_mime?: string | null
          license_file_path?: string | null
          license_file_size_bytes?: number | null
          longitude?: number | null
          name: string
          owner_id: string
          registration_number?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["holarchelp_provider_status"]
          tier?: Database["public"]["Enums"]["holarchelp_hospital_tier"]
          updated_at?: string
        }
        Update: {
          accepting_patients?: boolean
          address?: string | null
          admin_email?: string | null
          admin_full_name?: string | null
          admin_phone?: string | null
          approved_at?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          credential_score?: number | null
          directors?: Json | null
          dispatch_priority?: number
          id?: string
          latitude?: number | null
          license_file_mime?: string | null
          license_file_path?: string | null
          license_file_size_bytes?: number | null
          longitude?: number | null
          name?: string
          owner_id?: string
          registration_number?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["holarchelp_provider_status"]
          tier?: Database["public"]["Enums"]["holarchelp_hospital_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      holarchelp_provider_locations: {
        Row: {
          accuracy: number | null
          created_at: string
          heading: number | null
          id: string
          incident_id: string
          latitude: number
          longitude: number
          provider_id: string
          provider_kind: string
          recorded_at: string
          simulated: boolean
          speed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          incident_id: string
          latitude: number
          longitude: number
          provider_id: string
          provider_kind: string
          recorded_at?: string
          simulated?: boolean
          speed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          incident_id?: string
          latitude?: number
          longitude?: number
          provider_id?: string
          provider_kind?: string
          recorded_at?: string
          simulated?: boolean
          speed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holarchelp_provider_locations_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      holarchelp_telematics_pings: {
        Row: {
          accuracy_m: number | null
          battery: number | null
          created_at: string
          crew_member_id: string | null
          heading: number | null
          id: string
          incident_id: string | null
          lat: number
          lng: number
          provider_id: string
          recorded_at: string
          speed_kph: number | null
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          accuracy_m?: number | null
          battery?: number | null
          created_at?: string
          crew_member_id?: string | null
          heading?: number | null
          id?: string
          incident_id?: string | null
          lat: number
          lng: number
          provider_id: string
          recorded_at?: string
          speed_kph?: number | null
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          accuracy_m?: number | null
          battery?: number | null
          created_at?: string
          crew_member_id?: string | null
          heading?: number | null
          id?: string
          incident_id?: string | null
          lat?: number
          lng?: number
          provider_id?: string
          recorded_at?: string
          speed_kph?: number | null
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holarchelp_telematics_pings_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_ambulance_members"
            referencedColumns: ["id"]
          },
        ]
      }
      holarchelp_telematics_stops: {
        Row: {
          arrived_at: string
          created_at: string
          crew_member_id: string | null
          departed_at: string | null
          dwell_seconds: number | null
          id: string
          incident_id: string | null
          lat: number
          lng: number
          place_label: string
          provider_id: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          arrived_at: string
          created_at?: string
          crew_member_id?: string | null
          departed_at?: string | null
          dwell_seconds?: number | null
          id?: string
          incident_id?: string | null
          lat: number
          lng: number
          place_label?: string
          provider_id: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          arrived_at?: string
          created_at?: string
          crew_member_id?: string | null
          departed_at?: string | null
          dwell_seconds?: number | null
          id?: string
          incident_id?: string | null
          lat?: number
          lng?: number
          place_label?: string
          provider_id?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holarchelp_telematics_stops_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_ambulance_members"
            referencedColumns: ["id"]
          },
        ]
      }
      holarchelp_telematics_trips: {
        Row: {
          attendant_member_id: string | null
          avg_speed_kph: number | null
          created_at: string
          crew_member_id: string | null
          distance_m: number | null
          end_lat: number | null
          end_lng: number | null
          ended_at: string | null
          id: string
          idle_seconds: number | null
          max_speed_kph: number | null
          provider_id: string
          returned_home: boolean | null
          start_lat: number | null
          start_lng: number | null
          started_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          attendant_member_id?: string | null
          avg_speed_kph?: number | null
          created_at?: string
          crew_member_id?: string | null
          distance_m?: number | null
          end_lat?: number | null
          end_lng?: number | null
          ended_at?: string | null
          id?: string
          idle_seconds?: number | null
          max_speed_kph?: number | null
          provider_id: string
          returned_home?: boolean | null
          start_lat?: number | null
          start_lng?: number | null
          started_at: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          attendant_member_id?: string | null
          avg_speed_kph?: number | null
          created_at?: string
          crew_member_id?: string | null
          distance_m?: number | null
          end_lat?: number | null
          end_lng?: number | null
          ended_at?: string | null
          id?: string
          idle_seconds?: number | null
          max_speed_kph?: number | null
          provider_id?: string
          returned_home?: boolean | null
          start_lat?: number | null
          start_lng?: number | null
          started_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holarchelp_telematics_trips_attendant_member_id_fkey"
            columns: ["attendant_member_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_ambulance_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holarchelp_telematics_trips_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_ambulance_members"
            referencedColumns: ["id"]
          },
        ]
      }
      holarchelp_voice_clip_settings: {
        Row: {
          default_clip_path: string | null
          id: number
          updated_at: string
        }
        Insert: {
          default_clip_path?: string | null
          id?: number
          updated_at?: string
        }
        Update: {
          default_clip_path?: string | null
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      holarchelp_voice_notes: {
        Row: {
          audio_url: string
          created_at: string
          duration_seconds: number | null
          id: string
          incident_id: string
          provider_id: string | null
          transcript: string | null
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          incident_id: string
          provider_id?: string | null
          transcript?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          incident_id?: string
          provider_id?: string | null
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holarchelp_voice_notes_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_admissions: {
        Row: {
          admission_date: string
          codes: Json
          created_at: string
          created_by: string | null
          diagnosis: string | null
          discharge_date: string | null
          doctor_id: string | null
          document_id: string | null
          hospital: string | null
          hospital_provider_id: string | null
          id: string
          patient_id: string
          procedure_description: string | null
          source: string
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          admission_date?: string
          codes?: Json
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          discharge_date?: string | null
          doctor_id?: string | null
          document_id?: string | null
          hospital?: string | null
          hospital_provider_id?: string | null
          id?: string
          patient_id: string
          procedure_description?: string | null
          source?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          admission_date?: string
          codes?: Json
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          discharge_date?: string | null
          doctor_id?: string | null
          document_id?: string | null
          hospital?: string | null
          hospital_provider_id?: string | null
          id?: string
          patient_id?: string
          procedure_description?: string | null
          source?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_admissions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_admissions_hospital_provider_id_fkey"
            columns: ["hospital_provider_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_admissions_hospital_provider_id_fkey"
            columns: ["hospital_provider_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_admissions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_attending_doctors: {
        Row: {
          admission_id: string
          assigned_at: string
          created_at: string
          doctor_id: string | null
          doctor_name: string
          id: string
          is_primary: boolean
          specialty: string | null
          unassigned_at: string | null
          updated_at: string
        }
        Insert: {
          admission_id: string
          assigned_at?: string
          created_at?: string
          doctor_id?: string | null
          doctor_name: string
          id?: string
          is_primary?: boolean
          specialty?: string | null
          unassigned_at?: string | null
          updated_at?: string
        }
        Update: {
          admission_id?: string
          assigned_at?: string
          created_at?: string
          doctor_id?: string | null
          doctor_name?: string
          id?: string
          is_primary?: boolean
          specialty?: string | null
          unassigned_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_attending_doctors_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "hospital_inpatient_admissions"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_beds: {
        Row: {
          bed_number: string
          created_at: string
          id: string
          notes: string | null
          status: string
          updated_at: string
          ward_id: string
        }
        Insert: {
          bed_number: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          ward_id: string
        }
        Update: {
          bed_number?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_beds_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "hospital_wards"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_doctor_affiliations: {
        Row: {
          created_at: string
          department: string | null
          doctor_id: string
          hospital_id: string
          id: string
          is_active: boolean
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          doctor_id: string
          hospital_id: string
          id?: string
          is_active?: boolean
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          doctor_id?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_doctor_affiliations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_doctor_affiliations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_doctor_affiliations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_inpatient_admissions: {
        Row: {
          admitted_at: string
          bed_number: string | null
          created_at: string
          created_by: string | null
          discharged_at: string | null
          hospital_id: string
          id: string
          incident_id: string | null
          is_sample: boolean
          patient_id: string | null
          patient_name: string
          patient_user_id: string | null
          reason: string | null
          source: string
          status: string
          updated_at: string
          ward_id: string | null
        }
        Insert: {
          admitted_at?: string
          bed_number?: string | null
          created_at?: string
          created_by?: string | null
          discharged_at?: string | null
          hospital_id: string
          id?: string
          incident_id?: string | null
          is_sample?: boolean
          patient_id?: string | null
          patient_name: string
          patient_user_id?: string | null
          reason?: string | null
          source?: string
          status?: string
          updated_at?: string
          ward_id?: string | null
        }
        Update: {
          admitted_at?: string
          bed_number?: string | null
          created_at?: string
          created_by?: string | null
          discharged_at?: string | null
          hospital_id?: string
          id?: string
          incident_id?: string | null
          is_sample?: boolean
          patient_id?: string | null
          patient_name?: string
          patient_user_id?: string | null
          reason?: string | null
          source?: string
          status?: string
          updated_at?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_inpatient_admissions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_inpatient_admissions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_inpatient_admissions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_inpatient_admissions_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "hospital_wards"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_inpatient_vitals: {
        Row: {
          admission_id: string
          bp_diastolic: number | null
          bp_systolic: number | null
          created_at: string
          heart_rate: number | null
          id: string
          notes: string | null
          recorded_at: string
          recorded_by: string | null
          recorded_by_name: string | null
          respiratory_rate: number | null
          spo2: number | null
          temperature_c: number | null
        }
        Insert: {
          admission_id: string
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          heart_rate?: number | null
          id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          recorded_by_name?: string | null
          respiratory_rate?: number | null
          spo2?: number | null
          temperature_c?: number | null
        }
        Update: {
          admission_id?: string
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          heart_rate?: number | null
          id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          recorded_by_name?: string | null
          respiratory_rate?: number | null
          spo2?: number | null
          temperature_c?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_inpatient_vitals_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "hospital_inpatient_admissions"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_nurse_assignments: {
        Row: {
          admission_id: string
          assigned_at: string
          care_role: string
          care_tasks: Json
          created_at: string
          id: string
          nurse_id: string | null
          nurse_name: string
          released_at: string | null
          shift_id: string | null
          updated_at: string
        }
        Insert: {
          admission_id: string
          assigned_at?: string
          care_role?: string
          care_tasks?: Json
          created_at?: string
          id?: string
          nurse_id?: string | null
          nurse_name: string
          released_at?: string | null
          shift_id?: string | null
          updated_at?: string
        }
        Update: {
          admission_id?: string
          assigned_at?: string
          care_role?: string
          care_tasks?: Json
          created_at?: string
          id?: string
          nurse_id?: string | null
          nurse_name?: string
          released_at?: string | null
          shift_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_nurse_assignments_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "hospital_inpatient_admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_nurse_assignments_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "hospital_nurses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_nurse_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "hospital_staff_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_nurses: {
        Row: {
          about_me: string | null
          clinical_areas: string[] | null
          created_at: string
          created_by: string | null
          department: string | null
          email: string | null
          employment_start_date: string | null
          employment_status: string | null
          full_name: string
          hospital_id: string
          id: string
          languages: string[] | null
          linked_user_id: string | null
          mobile_number: string | null
          nurse_registration_number: string | null
          nursing_category: string | null
          pending_payload: Json | null
          position: string | null
          preferred_name: string | null
          professional_title: string | null
          registration_authority: string | null
          registration_expiry: string | null
          reporting_manager: string | null
          role_title: string | null
          scope_of_practice: string | null
          specialisations: string[] | null
          staff_id: string | null
          status: string
          updated_at: string
          ward_id: string | null
          years_experience: number | null
        }
        Insert: {
          about_me?: string | null
          clinical_areas?: string[] | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          employment_start_date?: string | null
          employment_status?: string | null
          full_name: string
          hospital_id: string
          id?: string
          languages?: string[] | null
          linked_user_id?: string | null
          mobile_number?: string | null
          nurse_registration_number?: string | null
          nursing_category?: string | null
          pending_payload?: Json | null
          position?: string | null
          preferred_name?: string | null
          professional_title?: string | null
          registration_authority?: string | null
          registration_expiry?: string | null
          reporting_manager?: string | null
          role_title?: string | null
          scope_of_practice?: string | null
          specialisations?: string[] | null
          staff_id?: string | null
          status?: string
          updated_at?: string
          ward_id?: string | null
          years_experience?: number | null
        }
        Update: {
          about_me?: string | null
          clinical_areas?: string[] | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          employment_start_date?: string | null
          employment_status?: string | null
          full_name?: string
          hospital_id?: string
          id?: string
          languages?: string[] | null
          linked_user_id?: string | null
          mobile_number?: string | null
          nurse_registration_number?: string | null
          nursing_category?: string | null
          pending_payload?: Json | null
          position?: string | null
          preferred_name?: string | null
          professional_title?: string | null
          registration_authority?: string | null
          registration_expiry?: string | null
          reporting_manager?: string | null
          role_title?: string | null
          scope_of_practice?: string | null
          specialisations?: string[] | null
          staff_id?: string | null
          status?: string
          updated_at?: string
          ward_id?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_nurses_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_nurses_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_nurses_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_nurses_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "hospital_wards"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_staff_shifts: {
        Row: {
          clocked_in_at: string | null
          clocked_out_at: string | null
          created_at: string
          doctor_id: string | null
          ends_at: string
          hospital_id: string
          id: string
          is_sample: boolean
          notes: string | null
          nurse_id: string | null
          rest_ack_at: string | null
          rest_ack_by: string | null
          rest_ack_note: string | null
          shift_type: string
          staff_name: string
          staff_role: string
          starts_at: string
          status: string
          updated_at: string
          ward_id: string | null
        }
        Insert: {
          clocked_in_at?: string | null
          clocked_out_at?: string | null
          created_at?: string
          doctor_id?: string | null
          ends_at: string
          hospital_id: string
          id?: string
          is_sample?: boolean
          notes?: string | null
          nurse_id?: string | null
          rest_ack_at?: string | null
          rest_ack_by?: string | null
          rest_ack_note?: string | null
          shift_type?: string
          staff_name: string
          staff_role: string
          starts_at: string
          status?: string
          updated_at?: string
          ward_id?: string | null
        }
        Update: {
          clocked_in_at?: string | null
          clocked_out_at?: string | null
          created_at?: string
          doctor_id?: string | null
          ends_at?: string
          hospital_id?: string
          id?: string
          is_sample?: boolean
          notes?: string | null
          nurse_id?: string | null
          rest_ack_at?: string | null
          rest_ack_by?: string | null
          rest_ack_note?: string | null
          shift_type?: string
          staff_name?: string
          staff_role?: string
          starts_at?: string
          status?: string
          updated_at?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_staff_shifts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_staff_shifts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_staff_shifts_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "hospital_nurses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_staff_shifts_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "hospital_wards"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_ward_transfers: {
        Row: {
          admission_id: string
          created_at: string
          from_bed_number: string | null
          from_ward_id: string | null
          id: string
          moved_by: string | null
          moved_by_name: string | null
          reason: string | null
          to_bed_number: string | null
          to_ward_id: string | null
        }
        Insert: {
          admission_id: string
          created_at?: string
          from_bed_number?: string | null
          from_ward_id?: string | null
          id?: string
          moved_by?: string | null
          moved_by_name?: string | null
          reason?: string | null
          to_bed_number?: string | null
          to_ward_id?: string | null
        }
        Update: {
          admission_id?: string
          created_at?: string
          from_bed_number?: string | null
          from_ward_id?: string | null
          id?: string
          moved_by?: string | null
          moved_by_name?: string | null
          reason?: string | null
          to_bed_number?: string | null
          to_ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_ward_transfers_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "hospital_inpatient_admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_ward_transfers_from_ward_id_fkey"
            columns: ["from_ward_id"]
            isOneToOne: false
            referencedRelation: "hospital_wards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_ward_transfers_to_ward_id_fkey"
            columns: ["to_ward_id"]
            isOneToOne: false
            referencedRelation: "hospital_wards"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_wards: {
        Row: {
          bed_capacity: number
          created_at: string
          hospital_id: string
          id: string
          is_active: boolean
          is_sample: boolean
          name: string
          notes: string | null
          updated_at: string
          ward_type: string
        }
        Insert: {
          bed_capacity?: number
          created_at?: string
          hospital_id: string
          id?: string
          is_active?: boolean
          is_sample?: boolean
          name: string
          notes?: string | null
          updated_at?: string
          ward_type?: string
        }
        Update: {
          bed_capacity?: number
          created_at?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          is_sample?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
          ward_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_wards_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_wards_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      image_comparisons: {
        Row: {
          ai_analysis: string | null
          analyzed_at: string | null
          comparison_type: string | null
          created_at: string | null
          doctor_id: string
          id: string
          image_labels: string[] | null
          image_urls: string[]
          patient_id: string | null
        }
        Insert: {
          ai_analysis?: string | null
          analyzed_at?: string | null
          comparison_type?: string | null
          created_at?: string | null
          doctor_id: string
          id?: string
          image_labels?: string[] | null
          image_urls: string[]
          patient_id?: string | null
        }
        Update: {
          ai_analysis?: string | null
          analyzed_at?: string | null
          comparison_type?: string | null
          created_at?: string | null
          doctor_id?: string
          id?: string
          image_labels?: string[] | null
          image_urls?: string[]
          patient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_comparisons_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_clinical_notes: {
        Row: {
          admission_id: string | null
          created_at: string | null
          id: string
          incident_id: string | null
          note_text: string | null
          note_type: string | null
          patient_user_id: string | null
          relevant_allergies: string[] | null
          relevant_conditions: string[] | null
          staff_user_id: string | null
          suggested_context: string[] | null
          updated_at: string | null
        }
        Insert: {
          admission_id?: string | null
          created_at?: string | null
          id?: string
          incident_id?: string | null
          note_text?: string | null
          note_type?: string | null
          patient_user_id?: string | null
          relevant_allergies?: string[] | null
          relevant_conditions?: string[] | null
          staff_user_id?: string | null
          suggested_context?: string[] | null
          updated_at?: string | null
        }
        Update: {
          admission_id?: string | null
          created_at?: string | null
          id?: string
          incident_id?: string | null
          note_text?: string | null
          note_type?: string | null
          patient_user_id?: string | null
          relevant_allergies?: string[] | null
          relevant_conditions?: string[] | null
          staff_user_id?: string | null
          suggested_context?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_clinical_notes_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_clinical_notes_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_generated_reports: {
        Row: {
          admission_id: string | null
          auto_filled_sections: string[] | null
          generated_at: string | null
          generated_by: string | null
          id: string
          incident_id: string | null
          last_updated: string | null
          manual_sections: string[] | null
          patient_user_id: string | null
          report_content: string | null
          template_id: string | null
        }
        Insert: {
          admission_id?: string | null
          auto_filled_sections?: string[] | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          incident_id?: string | null
          last_updated?: string | null
          manual_sections?: string[] | null
          patient_user_id?: string | null
          report_content?: string | null
          template_id?: string | null
        }
        Update: {
          admission_id?: string | null
          auto_filled_sections?: string[] | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          incident_id?: string | null
          last_updated?: string | null
          manual_sections?: string[] | null
          patient_user_id?: string | null
          report_content?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_generated_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_generated_reports_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_generated_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "incident_report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_report_templates: {
        Row: {
          auto_fill_fields: string[] | null
          created_at: string | null
          id: string
          required_fields: string[] | null
          template_name: string
          template_sections: string[]
        }
        Insert: {
          auto_fill_fields?: string[] | null
          created_at?: string | null
          id?: string
          required_fields?: string[] | null
          template_name: string
          template_sections: string[]
        }
        Update: {
          auto_fill_fields?: string[] | null
          created_at?: string | null
          id?: string
          required_fields?: string[] | null
          template_name?: string
          template_sections?: string[]
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          description: string
          doctor_id: string
          due_date: string
          id: string
          invoice_number: string
          paid_at: string | null
          patient_id: string
          session_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          doctor_id: string
          due_date: string
          id?: string
          invoice_number: string
          paid_at?: string | null
          patient_id: string
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          doctor_id?: string
          due_date?: string
          id?: string
          invoice_number?: string
          paid_at?: string | null
          patient_id?: string
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_order_deduplication: {
        Row: {
          alert_sent: boolean | null
          created_at: string | null
          current_order_id: string | null
          duplicate_order_id: string | null
          id: string
          test_name: string
          time_difference_minutes: number | null
        }
        Insert: {
          alert_sent?: boolean | null
          created_at?: string | null
          current_order_id?: string | null
          duplicate_order_id?: string | null
          id?: string
          test_name: string
          time_difference_minutes?: number | null
        }
        Update: {
          alert_sent?: boolean | null
          created_at?: string | null
          current_order_id?: string | null
          duplicate_order_id?: string | null
          id?: string
          test_name?: string
          time_difference_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_order_deduplication_current_order_id_fkey"
            columns: ["current_order_id"]
            isOneToOne: false
            referencedRelation: "patient_lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_order_deduplication_duplicate_order_id_fkey"
            columns: ["duplicate_order_id"]
            isOneToOne: false
            referencedRelation: "patient_lab_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_order_templates: {
        Row: {
          condition_name: string
          created_at: string | null
          id: string
          notes: string | null
          recommended_labs: string[]
          urgency: string | null
        }
        Insert: {
          condition_name: string
          created_at?: string | null
          id?: string
          notes?: string | null
          recommended_labs: string[]
          urgency?: string | null
        }
        Update: {
          condition_name?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          recommended_labs?: string[]
          urgency?: string | null
        }
        Relationships: []
      }
      login_events: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          last_seen_at: string
          session_key: string
          started_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          last_seen_at?: string
          session_key: string
          started_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          last_seen_at?: string
          session_key?: string
          started_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meal_plan_foods: {
        Row: {
          created_at: string
          energy_kj: number | null
          food_group: string
          grams: number
          id: string
          name: string
          plan_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          energy_kj?: number | null
          food_group: string
          grams?: number
          id?: string
          name: string
          plan_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          energy_kj?: number | null
          food_group?: string
          grams?: number
          id?: string
          name?: string
          plan_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_foods_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_slot_instructions: {
        Row: {
          created_at: string
          energy_unit: string
          id: string
          instruction_kind: string
          instruction_text: string | null
          plan_id: string
          slot_key: string
          target_energy: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          energy_unit?: string
          id?: string
          instruction_kind?: string
          instruction_text?: string | null
          plan_id: string
          slot_key: string
          target_energy?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          energy_unit?: string
          id?: string
          instruction_kind?: string
          instruction_text?: string | null
          plan_id?: string
          slot_key?: string
          target_energy?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_slot_instructions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_slot_items: {
        Row: {
          created_at: string
          day_of_week: number
          food_group: string
          food_id: string | null
          food_name: string
          grams: number
          id: string
          plan_id: string
          slot_key: string
          unit_multiplier: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          food_group: string
          food_id?: string | null
          food_name: string
          grams?: number
          id?: string
          plan_id: string
          slot_key: string
          unit_multiplier?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          food_group?: string
          food_id?: string | null
          food_name?: string
          grams?: number
          id?: string
          plan_id?: string
          slot_key?: string
          unit_multiplier?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_slot_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_slot_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          patient_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          patient_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_adherence: {
        Row: {
          auto_approved_at: string | null
          confidence_score: number | null
          contact_alerts_sent: Json
          created_at: string
          id: string
          missed_alert_sent_at: string | null
          patient_id: string
          prescription_id: string
          proof_url: string | null
          reconciliation_note: string | null
          scheduled_date: string
          status: string
          tablet_count_detected: number | null
          tablet_count_expected: number | null
          taken_alert_sent_at: string | null
          taken_at: string | null
        }
        Insert: {
          auto_approved_at?: string | null
          confidence_score?: number | null
          contact_alerts_sent?: Json
          created_at?: string
          id?: string
          missed_alert_sent_at?: string | null
          patient_id: string
          prescription_id: string
          proof_url?: string | null
          reconciliation_note?: string | null
          scheduled_date: string
          status?: string
          tablet_count_detected?: number | null
          tablet_count_expected?: number | null
          taken_alert_sent_at?: string | null
          taken_at?: string | null
        }
        Update: {
          auto_approved_at?: string | null
          confidence_score?: number | null
          contact_alerts_sent?: Json
          created_at?: string
          id?: string
          missed_alert_sent_at?: string | null
          patient_id?: string
          prescription_id?: string
          proof_url?: string | null
          reconciliation_note?: string | null
          scheduled_date?: string
          status?: string
          tablet_count_detected?: number | null
          tablet_count_expected?: number | null
          taken_alert_sent_at?: string | null
          taken_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_adherence_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          patient_id: string
          recipient_id: string
          sender_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          patient_id: string
          recipient_id: string
          sender_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          patient_id?: string
          recipient_id?: string
          sender_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_backup_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_read: boolean
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nurse_certifications: {
        Row: {
          created_at: string
          expires_on: string | null
          id: string
          issuer: string | null
          name: string
          nurse_id: string
          obtained_on: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          expires_on?: string | null
          id?: string
          issuer?: string | null
          name: string
          nurse_id: string
          obtained_on?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          expires_on?: string | null
          id?: string
          issuer?: string | null
          name?: string
          nurse_id?: string
          obtained_on?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nurse_certifications_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "hospital_nurses"
            referencedColumns: ["id"]
          },
        ]
      }
      nurse_clinical_permissions: {
        Row: {
          id: string
          notes: string | null
          nurse_id: string
          permission_key: string
          status: string
          updated_at: string
        }
        Insert: {
          id?: string
          notes?: string | null
          nurse_id: string
          permission_key: string
          status?: string
          updated_at?: string
        }
        Update: {
          id?: string
          notes?: string | null
          nurse_id?: string
          permission_key?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nurse_clinical_permissions_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "hospital_nurses"
            referencedColumns: ["id"]
          },
        ]
      }
      nurse_pending_vulas: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          claimed_at: string | null
          claimed_user_id: string | null
          hospital_nurse_id: string
          id: string
          reason: string
          reference_id: string | null
          vulas_count: number
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          claimed_at?: string | null
          claimed_user_id?: string | null
          hospital_nurse_id: string
          id?: string
          reason: string
          reference_id?: string | null
          vulas_count?: number
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          claimed_at?: string | null
          claimed_user_id?: string | null
          hospital_nurse_id?: string
          id?: string
          reason?: string
          reference_id?: string | null
          vulas_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "nurse_pending_vulas_claimed_user_id_fkey"
            columns: ["claimed_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurse_pending_vulas_hospital_nurse_id_fkey"
            columns: ["hospital_nurse_id"]
            isOneToOne: false
            referencedRelation: "hospital_nurses"
            referencedColumns: ["id"]
          },
        ]
      }
      nurse_record_ratings: {
        Row: {
          admission_id: string
          comment: string | null
          created_at: string
          id: string
          nurse_id: string
          patient_user_id: string
          rating: number
          record_id: string
          record_table: string
          updated_at: string
        }
        Insert: {
          admission_id: string
          comment?: string | null
          created_at?: string
          id?: string
          nurse_id: string
          patient_user_id: string
          rating: number
          record_id: string
          record_table: string
          updated_at?: string
        }
        Update: {
          admission_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          nurse_id?: string
          patient_user_id?: string
          rating?: number
          record_id?: string
          record_table?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nurse_record_ratings_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "hospital_admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurse_record_ratings_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "hospital_nurses"
            referencedColumns: ["id"]
          },
        ]
      }
      paramedic_shift_partners: {
        Row: {
          created_at: string
          id: string
          role: string
          shift_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          shift_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          shift_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paramedic_shift_partners_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "paramedic_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      paramedic_shifts: {
        Row: {
          ambulance_id: string
          created_at: string
          current_incident_id: string | null
          ended_at: string | null
          id: string
          provider_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ambulance_id: string
          created_at?: string
          current_incident_id?: string | null
          ended_at?: string | null
          id?: string
          provider_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ambulance_id?: string
          created_at?: string
          current_incident_id?: string | null
          ended_at?: string | null
          id?: string
          provider_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paramedic_shifts_ambulance_id_fkey"
            columns: ["ambulance_id"]
            isOneToOne: false
            referencedRelation: "ambulances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paramedic_shifts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_ambulance_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paramedic_shifts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_ambulance_providers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_activity_logs: {
        Row: {
          action_type: string
          admission_id: string | null
          created_at: string
          details: string | null
          hospital_id: string | null
          id: string
          occurred_at: string
          patient_id: string | null
          patient_user_id: string | null
          staff_name: string | null
          staff_role: string | null
          staff_user_id: string | null
          ward_id: string | null
        }
        Insert: {
          action_type: string
          admission_id?: string | null
          created_at?: string
          details?: string | null
          hospital_id?: string | null
          id?: string
          occurred_at?: string
          patient_id?: string | null
          patient_user_id?: string | null
          staff_name?: string | null
          staff_role?: string | null
          staff_user_id?: string | null
          ward_id?: string | null
        }
        Update: {
          action_type?: string
          admission_id?: string | null
          created_at?: string
          details?: string | null
          hospital_id?: string | null
          id?: string
          occurred_at?: string
          patient_id?: string | null
          patient_user_id?: string | null
          staff_name?: string | null
          staff_role?: string | null
          staff_user_id?: string | null
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_activity_logs_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "hospital_inpatient_admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_activity_logs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_activity_logs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_activity_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_activity_logs_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "hospital_wards"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          admission_id: string | null
          alert_type: string
          created_at: string | null
          description: string | null
          dismissed_at: string | null
          expires_at: string | null
          id: string
          incident_id: string | null
          patient_user_id: string | null
          related_data: Json | null
          severity: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          admission_id?: string | null
          alert_type: string
          created_at?: string | null
          description?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          incident_id?: string | null
          patient_user_id?: string | null
          related_data?: Json | null
          severity?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          admission_id?: string | null
          alert_type?: string
          created_at?: string | null
          description?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          incident_id?: string | null
          patient_user_id?: string | null
          related_data?: Json | null
          severity?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_alerts_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_allergies: {
        Row: {
          allergen: string
          allergen_type: string | null
          created_at: string | null
          date_reported: string | null
          id: string
          patient_user_id: string
          reaction_description: string | null
          severity: string
          updated_at: string | null
        }
        Insert: {
          allergen: string
          allergen_type?: string | null
          created_at?: string | null
          date_reported?: string | null
          id?: string
          patient_user_id: string
          reaction_description?: string | null
          severity: string
          updated_at?: string | null
        }
        Update: {
          allergen?: string
          allergen_type?: string | null
          created_at?: string | null
          date_reported?: string | null
          id?: string
          patient_user_id?: string
          reaction_description?: string | null
          severity?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_allergies_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_context_access_log: {
        Row: {
          access_type: string | null
          accessed_at: string | null
          admission_id: string | null
          hospital_id: string | null
          id: string
          incident_id: string | null
          patient_user_id: string | null
          staff_user_id: string | null
        }
        Insert: {
          access_type?: string | null
          accessed_at?: string | null
          admission_id?: string | null
          hospital_id?: string | null
          id?: string
          incident_id?: string | null
          patient_user_id?: string | null
          staff_user_id?: string | null
        }
        Update: {
          access_type?: string | null
          accessed_at?: string | null
          admission_id?: string | null
          hospital_id?: string | null
          id?: string
          incident_id?: string | null
          patient_user_id?: string | null
          staff_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_context_access_log_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_context_access_log_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_current_medications: {
        Row: {
          created_at: string | null
          dosage: string | null
          end_date: string | null
          frequency: string | null
          id: string
          indication: string | null
          medication_name: string
          notes: string | null
          patient_user_id: string
          pharmacy_name: string | null
          pharmacy_phone: string | null
          route: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dosage?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          indication?: string | null
          medication_name: string
          notes?: string | null
          patient_user_id: string
          pharmacy_name?: string | null
          pharmacy_phone?: string | null
          route?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dosage?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          indication?: string | null
          medication_name?: string
          notes?: string | null
          patient_user_id?: string
          pharmacy_name?: string | null
          pharmacy_phone?: string | null
          route?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_current_medications_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_disc_profiles: {
        Row: {
          conscientiousness: number
          conscientiousness_rationale: string | null
          created_at: string
          dominance: number
          dominance_rationale: string | null
          generated_at: string
          id: string
          influence: number
          influence_rationale: string | null
          last_session_id: string | null
          patient_id: string
          primary_trait: string | null
          secondary_trait: string | null
          sessions_analyzed: number
          steadiness: number
          steadiness_rationale: string | null
          updated_at: string
        }
        Insert: {
          conscientiousness?: number
          conscientiousness_rationale?: string | null
          created_at?: string
          dominance?: number
          dominance_rationale?: string | null
          generated_at?: string
          id?: string
          influence?: number
          influence_rationale?: string | null
          last_session_id?: string | null
          patient_id: string
          primary_trait?: string | null
          secondary_trait?: string | null
          sessions_analyzed?: number
          steadiness?: number
          steadiness_rationale?: string | null
          updated_at?: string
        }
        Update: {
          conscientiousness?: number
          conscientiousness_rationale?: string | null
          created_at?: string
          dominance?: number
          dominance_rationale?: string | null
          generated_at?: string
          id?: string
          influence?: number
          influence_rationale?: string | null
          last_session_id?: string | null
          patient_id?: string
          primary_trait?: string | null
          secondary_trait?: string | null
          sessions_analyzed?: number
          steadiness?: number
          steadiness_rationale?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_disc_profiles_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_emotional_insights: {
        Row: {
          created_at: string
          entry_id: string | null
          generated_at: string
          id: string
          metaphysical_note: string | null
          patient_id: string | null
          patient_user_id: string
          source_entry_count: number
          summation: string | null
          theme: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entry_id?: string | null
          generated_at?: string
          id?: string
          metaphysical_note?: string | null
          patient_id?: string | null
          patient_user_id: string
          source_entry_count?: number
          summation?: string | null
          theme?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entry_id?: string | null
          generated_at?: string
          id?: string
          metaphysical_note?: string | null
          patient_id?: string | null
          patient_user_id?: string
          source_entry_count?: number
          summation?: string | null
          theme?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_emotional_insights_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "patient_emotional_journal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_emotional_insights_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_emotional_journal: {
        Row: {
          body: string
          created_at: string
          entry_date: string
          font_key: string | null
          id: string
          patient_user_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          entry_date?: string
          font_key?: string | null
          id?: string
          patient_user_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          entry_date?: string
          font_key?: string | null
          id?: string
          patient_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_hidden_doctors: {
        Row: {
          doctor_id: string
          hidden_at: string
          id: string
          patient_user_id: string
        }
        Insert: {
          doctor_id: string
          hidden_at?: string
          id?: string
          patient_user_id: string
        }
        Update: {
          doctor_id?: string
          hidden_at?: string
          id?: string
          patient_user_id?: string
        }
        Relationships: []
      }
      patient_history_timelines: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          patient_id: string
          source_fingerprint: string
          timeline: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          patient_id: string
          source_fingerprint: string
          timeline?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          patient_id?: string
          source_fingerprint?: string
          timeline?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_history_timelines_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_imaging: {
        Row: {
          body_region: string | null
          created_at: string | null
          dicom_url: string | null
          findings_summary: string | null
          id: string
          imaging_date: string
          imaging_facility: string | null
          imaging_type: string
          patient_user_id: string
          pdf_report_url: string | null
          radiologist_name: string | null
          report_text: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          body_region?: string | null
          created_at?: string | null
          dicom_url?: string | null
          findings_summary?: string | null
          id?: string
          imaging_date: string
          imaging_facility?: string | null
          imaging_type: string
          patient_user_id: string
          pdf_report_url?: string | null
          radiologist_name?: string | null
          report_text?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          body_region?: string | null
          created_at?: string | null
          dicom_url?: string | null
          findings_summary?: string | null
          id?: string
          imaging_date?: string
          imaging_facility?: string | null
          imaging_type?: string
          patient_user_id?: string
          pdf_report_url?: string | null
          radiologist_name?: string | null
          report_text?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_imaging_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_invitations: {
        Row: {
          created_at: string
          doctor_id: string
          expires_at: string
          id: string
          patient_email: string
          patient_id: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          expires_at?: string
          id?: string
          patient_email: string
          patient_id?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          expires_at?: string
          id?: string
          patient_email?: string
          patient_id?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_invitations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_invoice_lines: {
        Row: {
          description: string
          id: string
          invoice_id: string | null
          line_total: number | null
          quantity: number | null
          source_id: string | null
          source_type: string
          unit_cost: number | null
        }
        Insert: {
          description: string
          id?: string
          invoice_id?: string | null
          line_total?: number | null
          quantity?: number | null
          source_id?: string | null
          source_type: string
          unit_cost?: number | null
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string | null
          line_total?: number | null
          quantity?: number | null
          source_id?: string | null
          source_type?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "patient_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_invoices: {
        Row: {
          admission_id: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          hospital_id: string | null
          id: string
          invoice_number: string
          issued_date: string | null
          paid_amount: number | null
          patient_id: string | null
          procedure_name: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
        }
        Insert: {
          admission_id?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          hospital_id?: string | null
          id?: string
          invoice_number: string
          issued_date?: string | null
          paid_amount?: number | null
          patient_id?: string | null
          procedure_name?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
        }
        Update: {
          admission_id?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          hospital_id?: string | null
          id?: string
          invoice_number?: string
          issued_date?: string | null
          paid_amount?: number | null
          patient_id?: string | null
          procedure_name?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_invoices_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "hospital_inpatient_admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_invoices_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_invoices_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_lab_orders: {
        Row: {
          admission_id: string | null
          created_at: string | null
          id: string
          incident_id: string | null
          lab_tests: string[]
          notes: string | null
          order_date: string | null
          ordered_by: string | null
          patient_user_id: string | null
          status: string | null
          urgency: string | null
        }
        Insert: {
          admission_id?: string | null
          created_at?: string | null
          id?: string
          incident_id?: string | null
          lab_tests: string[]
          notes?: string | null
          order_date?: string | null
          ordered_by?: string | null
          patient_user_id?: string | null
          status?: string | null
          urgency?: string | null
        }
        Update: {
          admission_id?: string | null
          created_at?: string | null
          id?: string
          incident_id?: string | null
          lab_tests?: string[]
          notes?: string | null
          order_date?: string | null
          ordered_by?: string | null
          patient_user_id?: string | null
          status?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_lab_orders_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_lab_orders_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_lab_results: {
        Row: {
          attachment_url: string | null
          created_at: string | null
          id: string
          lab_date: string
          lab_facility: string | null
          normal_range_max: number | null
          normal_range_min: number | null
          notes: string | null
          patient_user_id: string
          result_value: number | null
          status: string | null
          test_name: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string | null
          id?: string
          lab_date: string
          lab_facility?: string | null
          normal_range_max?: number | null
          normal_range_min?: number | null
          notes?: string | null
          patient_user_id: string
          result_value?: number | null
          status?: string | null
          test_name: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string | null
          id?: string
          lab_date?: string
          lab_facility?: string | null
          normal_range_max?: number | null
          normal_range_min?: number | null
          notes?: string | null
          patient_user_id?: string
          result_value?: number | null
          status?: string | null
          test_name?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_lab_results_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_medical_history: {
        Row: {
          condition_name: string
          created_at: string | null
          diagnosed_date: string | null
          id: string
          notes: string | null
          patient_user_id: string
          severity: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          condition_name: string
          created_at?: string | null
          diagnosed_date?: string | null
          id?: string
          notes?: string | null
          patient_user_id: string
          severity?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          condition_name?: string
          created_at?: string | null
          diagnosed_date?: string | null
          id?: string
          notes?: string | null
          patient_user_id?: string
          severity?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_medical_history_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_medication_prescriptions: {
        Row: {
          admission_id: string | null
          created_at: string | null
          dosage: string | null
          frequency: string | null
          id: string
          incident_id: string | null
          medication_name: string
          patient_user_id: string | null
          prescribed_at: string | null
          prescribed_by: string | null
          safety_blocks: string[] | null
          safety_check_passed: boolean | null
          safety_warnings: string[] | null
          status: string | null
        }
        Insert: {
          admission_id?: string | null
          created_at?: string | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          incident_id?: string | null
          medication_name: string
          patient_user_id?: string | null
          prescribed_at?: string | null
          prescribed_by?: string | null
          safety_blocks?: string[] | null
          safety_check_passed?: boolean | null
          safety_warnings?: string[] | null
          status?: string | null
        }
        Update: {
          admission_id?: string | null
          created_at?: string | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          incident_id?: string | null
          medication_name?: string
          patient_user_id?: string | null
          prescribed_at?: string | null
          prescribed_by?: string | null
          safety_blocks?: string[] | null
          safety_check_passed?: boolean | null
          safety_warnings?: string[] | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_medication_prescriptions_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_medication_prescriptions_prescribed_by_fkey"
            columns: ["prescribed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_profile_shares: {
        Row: {
          can_view_live_tracking: boolean
          can_view_profile: boolean
          created_at: string
          id: string
          linked_contact_id: string | null
          owner_user_id: string
          relationship: string | null
          shared_with_email: string | null
          shared_with_first_name: string | null
          shared_with_last_name: string | null
          shared_with_user_id: string | null
          shared_with_username: string | null
          source: string
          updated_at: string
          view_scopes: Json
        }
        Insert: {
          can_view_live_tracking?: boolean
          can_view_profile?: boolean
          created_at?: string
          id?: string
          linked_contact_id?: string | null
          owner_user_id: string
          relationship?: string | null
          shared_with_email?: string | null
          shared_with_first_name?: string | null
          shared_with_last_name?: string | null
          shared_with_user_id?: string | null
          shared_with_username?: string | null
          source?: string
          updated_at?: string
          view_scopes?: Json
        }
        Update: {
          can_view_live_tracking?: boolean
          can_view_profile?: boolean
          created_at?: string
          id?: string
          linked_contact_id?: string | null
          owner_user_id?: string
          relationship?: string | null
          shared_with_email?: string | null
          shared_with_first_name?: string | null
          shared_with_last_name?: string | null
          shared_with_user_id?: string | null
          shared_with_username?: string | null
          source?: string
          updated_at?: string
          view_scopes?: Json
        }
        Relationships: []
      }
      patient_relationship_evidence: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          quote: string
          session_date: string
          session_id: string | null
          signal_label: string
          source: string
          supports_pattern: number | null
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          quote: string
          session_date?: string
          session_id?: string | null
          signal_label: string
          source?: string
          supports_pattern?: number | null
          version?: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          quote?: string
          session_date?: string
          session_id?: string | null
          signal_label?: string
          source?: string
          supports_pattern?: number | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_relationship_evidence_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_relationship_evidence_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_relationship_profile_history: {
        Row: {
          completed_at: string | null
          confidence: string | null
          created_at: string
          id: string
          patient_id: string
          pattern: number | null
          responses: Json
          status: string
          version: string
        }
        Insert: {
          completed_at?: string | null
          confidence?: string | null
          created_at?: string
          id?: string
          patient_id: string
          pattern?: number | null
          responses?: Json
          status: string
          version?: string
        }
        Update: {
          completed_at?: string | null
          confidence?: string | null
          created_at?: string
          id?: string
          patient_id?: string
          pattern?: number | null
          responses?: Json
          status?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_relationship_profile_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_relationship_profiles: {
        Row: {
          completed_at: string | null
          confidence: string | null
          created_at: string
          id: string
          patient_id: string
          pattern: number | null
          responses: Json
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          completed_at?: string | null
          confidence?: string | null
          created_at?: string
          id?: string
          patient_id: string
          pattern?: number | null
          responses?: Json
          status?: string
          updated_at?: string
          version?: string
        }
        Update: {
          completed_at?: string | null
          confidence?: string | null
          created_at?: string
          id?: string
          patient_id?: string
          pattern?: number | null
          responses?: Json
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_relationship_profiles_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_rewards: {
        Row: {
          awarded_at: string
          awarded_by: string
          created_at: string
          id: string
          lollipops_count: number
          patient_id: string
          reward_type: string
          session_id: string | null
          visit_category: string
        }
        Insert: {
          awarded_at?: string
          awarded_by: string
          created_at?: string
          id?: string
          lollipops_count?: number
          patient_id: string
          reward_type?: string
          session_id?: string | null
          visit_category: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string
          created_at?: string
          id?: string
          lollipops_count?: number
          patient_id?: string
          reward_type?: string
          session_id?: string | null
          visit_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_rewards_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_rewards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_risk_factors: {
        Row: {
          id: string
          identified_at: string | null
          patient_user_id: string | null
          reason: string | null
          risk_factor: string
          risk_score: number | null
        }
        Insert: {
          id?: string
          identified_at?: string | null
          patient_user_id?: string | null
          reason?: string | null
          risk_factor: string
          risk_score?: number | null
        }
        Update: {
          id?: string
          identified_at?: string | null
          patient_user_id?: string | null
          reason?: string | null
          risk_factor?: string
          risk_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_risk_factors_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_completed_at: string | null
          longest_streak: number
          next_due_at: string | null
          patient_id: string
          streak_config_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_completed_at?: string | null
          longest_streak?: number
          next_due_at?: string | null
          patient_id: string
          streak_config_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_completed_at?: string | null
          longest_streak?: number
          next_due_at?: string | null
          patient_id?: string
          streak_config_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_streaks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_streaks_streak_config_id_fkey"
            columns: ["streak_config_id"]
            isOneToOne: false
            referencedRelation: "streak_config"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_weigh_ins: {
        Row: {
          created_at: string
          id: string
          kg_lost: number
          patient_id: string
          previous_weight_kg: number | null
          recorded_at: string
          recorded_by: string
          updated_at: string
          vulas_awarded: number
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          kg_lost?: number
          patient_id: string
          previous_weight_kg?: number | null
          recorded_at?: string
          recorded_by: string
          updated_at?: string
          vulas_awarded?: number
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          kg_lost?: number
          patient_id?: string
          previous_weight_kg?: number | null
          recorded_at?: string
          recorded_by?: string
          updated_at?: string
          vulas_awarded?: number
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "patient_weigh_ins_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          allergies_structured: Json | null
          blood_type: string | null
          chronic_medications: string | null
          claims_email: string | null
          conditions_diagnoses: Json | null
          created_at: string
          current_medications: Json | null
          dob: string | null
          email: string | null
          emergency_can_view_live_tracking: boolean | null
          emergency_can_view_profile: boolean | null
          emergency_contact_email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          emergency_contacts: Json | null
          employer: string | null
          family_history: Json | null
          first_name: string | null
          gender: string | null
          general_practitioner: string | null
          height_cm: number | null
          id: string
          id_passport_number: string | null
          is_chronic: boolean | null
          is_sample: boolean
          last_name: string | null
          marital_status: string | null
          medical_aid: string | null
          medical_aid_number: string | null
          medical_insurance_product: string | null
          name: string
          next_of_kin_email: string | null
          next_of_kin_members: Json | null
          next_of_kin_name: string | null
          next_of_kin_phone: string | null
          next_of_kin_relationship: string | null
          nok_can_view_live_tracking: boolean | null
          nok_can_view_profile: boolean | null
          notes: string | null
          occupation: string | null
          organ_donor: boolean | null
          organ_donor_organs: Json | null
          patient_user_id: string | null
          pharmacies: Json | null
          pharmacy_email: string | null
          pharmacy_name: string | null
          phone: string | null
          physical_address: string | null
          postal_address: string | null
          preferred_hospitals: Json
          preferred_language: string | null
          primary_member: string | null
          referred_by: string | null
          reporting_to_email: string | null
          same_as_physical: boolean | null
          status: string
          surgeries: Json | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          allergies_structured?: Json | null
          blood_type?: string | null
          chronic_medications?: string | null
          claims_email?: string | null
          conditions_diagnoses?: Json | null
          created_at?: string
          current_medications?: Json | null
          dob?: string | null
          email?: string | null
          emergency_can_view_live_tracking?: boolean | null
          emergency_can_view_profile?: boolean | null
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          emergency_contacts?: Json | null
          employer?: string | null
          family_history?: Json | null
          first_name?: string | null
          gender?: string | null
          general_practitioner?: string | null
          height_cm?: number | null
          id?: string
          id_passport_number?: string | null
          is_chronic?: boolean | null
          is_sample?: boolean
          last_name?: string | null
          marital_status?: string | null
          medical_aid?: string | null
          medical_aid_number?: string | null
          medical_insurance_product?: string | null
          name: string
          next_of_kin_email?: string | null
          next_of_kin_members?: Json | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relationship?: string | null
          nok_can_view_live_tracking?: boolean | null
          nok_can_view_profile?: boolean | null
          notes?: string | null
          occupation?: string | null
          organ_donor?: boolean | null
          organ_donor_organs?: Json | null
          patient_user_id?: string | null
          pharmacies?: Json | null
          pharmacy_email?: string | null
          pharmacy_name?: string | null
          phone?: string | null
          physical_address?: string | null
          postal_address?: string | null
          preferred_hospitals?: Json
          preferred_language?: string | null
          primary_member?: string | null
          referred_by?: string | null
          reporting_to_email?: string | null
          same_as_physical?: boolean | null
          status?: string
          surgeries?: Json | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          allergies_structured?: Json | null
          blood_type?: string | null
          chronic_medications?: string | null
          claims_email?: string | null
          conditions_diagnoses?: Json | null
          created_at?: string
          current_medications?: Json | null
          dob?: string | null
          email?: string | null
          emergency_can_view_live_tracking?: boolean | null
          emergency_can_view_profile?: boolean | null
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          emergency_contacts?: Json | null
          employer?: string | null
          family_history?: Json | null
          first_name?: string | null
          gender?: string | null
          general_practitioner?: string | null
          height_cm?: number | null
          id?: string
          id_passport_number?: string | null
          is_chronic?: boolean | null
          is_sample?: boolean
          last_name?: string | null
          marital_status?: string | null
          medical_aid?: string | null
          medical_aid_number?: string | null
          medical_insurance_product?: string | null
          name?: string
          next_of_kin_email?: string | null
          next_of_kin_members?: Json | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relationship?: string | null
          nok_can_view_live_tracking?: boolean | null
          nok_can_view_profile?: boolean | null
          notes?: string | null
          occupation?: string | null
          organ_donor?: boolean | null
          organ_donor_organs?: Json | null
          patient_user_id?: string | null
          pharmacies?: Json | null
          pharmacy_email?: string | null
          pharmacy_name?: string | null
          phone?: string | null
          physical_address?: string | null
          postal_address?: string | null
          preferred_hospitals?: Json
          preferred_language?: string | null
          primary_member?: string | null
          referred_by?: string | null
          reporting_to_email?: string | null
          same_as_physical?: boolean | null
          status?: string
          surgeries?: Json | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string
          id: string
          paypal_transaction_id: string | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description: string
          id?: string
          paypal_transaction_id?: string | null
          status?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string
          id?: string
          paypal_transaction_id?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invited_email: string
          invited_role: string
          practice_id: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_email: string
          invited_role?: string
          practice_id: string
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          invited_role?: string
          practice_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_invitations_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_members: {
        Row: {
          doctor_id: string
          id: string
          joined_at: string
          practice_id: string
          role: string
        }
        Insert: {
          doctor_id: string
          id?: string
          joined_at?: string
          practice_id: string
          role?: string
        }
        Update: {
          doctor_id?: string
          id?: string
          joined_at?: string
          practice_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_members_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_partners: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          mobile_number: string | null
          registration_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          mobile_number?: string | null
          registration_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          mobile_number?: string | null
          registration_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      practices: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      prescription_pill_references: {
        Row: {
          baseline_pattern_summary: string | null
          created_at: string
          dosage_snapshot: string
          id: string
          intake_method: string | null
          medication_snapshot: string
          observed_description: string | null
          packaging_image_url: string | null
          patient_id: string
          prescription_id: string
          reference_image_url: string
          updated_at: string
        }
        Insert: {
          baseline_pattern_summary?: string | null
          created_at?: string
          dosage_snapshot: string
          id?: string
          intake_method?: string | null
          medication_snapshot: string
          observed_description?: string | null
          packaging_image_url?: string | null
          patient_id: string
          prescription_id: string
          reference_image_url: string
          updated_at?: string
        }
        Update: {
          baseline_pattern_summary?: string | null
          created_at?: string
          dosage_snapshot?: string
          id?: string
          intake_method?: string | null
          medication_snapshot?: string
          observed_description?: string | null
          packaging_image_url?: string | null
          patient_id?: string
          prescription_id?: string
          reference_image_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_pill_references_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_pill_references_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: true
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_renewal_requests: {
        Row: {
          created_at: string
          id: string
          original_doctor_id: string | null
          patient_comment: string | null
          patient_user_id: string
          prescription_id: string
          requested_doctor_id: string
          status: string
          todo_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          original_doctor_id?: string | null
          patient_comment?: string | null
          patient_user_id: string
          prescription_id: string
          requested_doctor_id: string
          status?: string
          todo_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          original_doctor_id?: string | null
          patient_comment?: string | null
          patient_user_id?: string
          prescription_id?: string
          requested_doctor_id?: string
          status?: string
          todo_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_renewal_requests_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          alert_contacts_on_taken: boolean
          approved_medication_id: string | null
          created_at: string
          doctor_id: string
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          instructions: string | null
          is_chronic: boolean
          medication: string
          missed_alert_after_minutes: number
          patient_id: string
          quantity_per_dose: number
          refill_reminder_days: number | null
          refills_remaining: number | null
          reminder_times: string[] | null
          reminders_enabled: boolean
          session_id: string | null
          skip_notify_contact: Json | null
          skip_notify_target: string | null
          source: string
          start_date: string
          status: string
          updated_at: string
          with_food: string | null
        }
        Insert: {
          alert_contacts_on_taken?: boolean
          approved_medication_id?: string | null
          created_at?: string
          doctor_id: string
          dosage: string
          end_date?: string | null
          frequency: string
          id?: string
          instructions?: string | null
          is_chronic?: boolean
          medication: string
          missed_alert_after_minutes?: number
          patient_id: string
          quantity_per_dose?: number
          refill_reminder_days?: number | null
          refills_remaining?: number | null
          reminder_times?: string[] | null
          reminders_enabled?: boolean
          session_id?: string | null
          skip_notify_contact?: Json | null
          skip_notify_target?: string | null
          source?: string
          start_date?: string
          status?: string
          updated_at?: string
          with_food?: string | null
        }
        Update: {
          alert_contacts_on_taken?: boolean
          approved_medication_id?: string | null
          created_at?: string
          doctor_id?: string
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          is_chronic?: boolean
          medication?: string
          missed_alert_after_minutes?: number
          patient_id?: string
          quantity_per_dose?: number
          refill_reminder_days?: number | null
          refills_remaining?: number | null
          reminder_times?: string[] | null
          reminders_enabled?: boolean
          session_id?: string | null
          skip_notify_contact?: Json | null
          skip_notify_target?: string | null
          source?: string
          start_date?: string
          status?: string
          updated_at?: string
          with_food?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_approved_med_fk"
            columns: ["approved_medication_id"]
            isOneToOne: false
            referencedRelation: "approved_daily_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config: {
        Row: {
          billing_cycle: string
          created_at: string
          id: string
          name: string
          price: number
          role: string
          savings: number | null
          updated_at: string
        }
        Insert: {
          billing_cycle: string
          created_at?: string
          id?: string
          name: string
          price: number
          role: string
          savings?: number | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          id?: string
          name?: string
          price?: number
          role?: string
          savings?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      procedure_kit_items: {
        Row: {
          id: string
          kit_id: string | null
          quantity: number
          stock_item_id: string | null
        }
        Insert: {
          id?: string
          kit_id?: string | null
          quantity?: number
          stock_item_id?: string | null
        }
        Update: {
          id?: string
          kit_id?: string | null
          quantity?: number
          stock_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedure_kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "procedure_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_kit_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_kits: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          hospital_id: string | null
          id: string
          is_active: boolean | null
          kit_name: string
          procedure_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hospital_id?: string | null
          id?: string
          is_active?: boolean | null
          kit_name: string
          procedure_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hospital_id?: string | null
          id?: string
          is_active?: boolean | null
          kit_name?: string
          procedure_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedure_kits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_kits_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_kits_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_stock_usage: {
        Row: {
          admission_id: string | null
          id: string
          invoiced: boolean | null
          line_total: number | null
          procedure_name: string
          quantity_used: number
          recorded_by: string | null
          recorded_by_name: string | null
          stock_item_id: string | null
          unit_cost_at_time: number | null
          used_at: string | null
        }
        Insert: {
          admission_id?: string | null
          id?: string
          invoiced?: boolean | null
          line_total?: number | null
          procedure_name: string
          quantity_used: number
          recorded_by?: string | null
          recorded_by_name?: string | null
          stock_item_id?: string | null
          unit_cost_at_time?: number | null
          used_at?: string | null
        }
        Update: {
          admission_id?: string | null
          id?: string
          invoiced?: boolean | null
          line_total?: number | null
          procedure_name?: string
          quantity_used?: number
          recorded_by?: string | null
          recorded_by_name?: string | null
          stock_item_id?: string | null
          unit_cost_at_time?: number | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedure_stock_usage_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "hospital_inpatient_admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_stock_usage_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_stock_usage_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_view_log: {
        Row: {
          id: string
          owner_id: string | null
          patient_id: string
          screen: string | null
          viewed_at: string | null
          viewer_id: string
        }
        Insert: {
          id?: string
          owner_id?: string | null
          patient_id: string
          screen?: string | null
          viewed_at?: string | null
          viewer_id: string
        }
        Update: {
          id?: string
          owner_id?: string | null
          patient_id?: string
          screen?: string | null
          viewed_at?: string | null
          viewer_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about_me: string | null
          auto_email_certificate_to_employer: boolean | null
          auto_email_invoice_to_insurance: boolean | null
          auto_email_prescription_to_pharmacy: boolean | null
          avatar_url: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_account_type: string | null
          bank_name: string | null
          bank_swift_code: string | null
          chronic_med_notification_frequency: string | null
          country: string | null
          created_at: string
          credential_score: number | null
          credential_score_updated_at: string | null
          doctor_number: string | null
          full_name: string | null
          holarchelp_enabled: boolean
          id: string
          inactive_threshold_months: number | null
          logo_url: string | null
          mailbox_alias: string | null
          mailbox_id: string
          mfa_required: boolean
          mobile_number: string | null
          narration_voice: string | null
          notify_contacts_on_missed_meds: boolean
          notify_contacts_on_taken_meds: boolean
          practice_address: string | null
          practice_color: string | null
          practice_number: string | null
          preferred_language: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          round_table_enabled: boolean | null
          signature_bold: boolean | null
          signature_color: string | null
          signature_font: string | null
          signature_font_size: number | null
          signature_italic: boolean | null
          signature_render_url: string | null
          signature_url: string | null
          specialty: string | null
          status: string | null
          tour_completed_at: string | null
          tour_skipped_at: string | null
          updated_at: string
          v2_demo: boolean
        }
        Insert: {
          about_me?: string | null
          auto_email_certificate_to_employer?: boolean | null
          auto_email_invoice_to_insurance?: boolean | null
          auto_email_prescription_to_pharmacy?: boolean | null
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_name?: string | null
          bank_swift_code?: string | null
          chronic_med_notification_frequency?: string | null
          country?: string | null
          created_at?: string
          credential_score?: number | null
          credential_score_updated_at?: string | null
          doctor_number?: string | null
          full_name?: string | null
          holarchelp_enabled?: boolean
          id: string
          inactive_threshold_months?: number | null
          logo_url?: string | null
          mailbox_alias?: string | null
          mailbox_id?: string
          mfa_required?: boolean
          mobile_number?: string | null
          narration_voice?: string | null
          notify_contacts_on_missed_meds?: boolean
          notify_contacts_on_taken_meds?: boolean
          practice_address?: string | null
          practice_color?: string | null
          practice_number?: string | null
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          round_table_enabled?: boolean | null
          signature_bold?: boolean | null
          signature_color?: string | null
          signature_font?: string | null
          signature_font_size?: number | null
          signature_italic?: boolean | null
          signature_render_url?: string | null
          signature_url?: string | null
          specialty?: string | null
          status?: string | null
          tour_completed_at?: string | null
          tour_skipped_at?: string | null
          updated_at?: string
          v2_demo?: boolean
        }
        Update: {
          about_me?: string | null
          auto_email_certificate_to_employer?: boolean | null
          auto_email_invoice_to_insurance?: boolean | null
          auto_email_prescription_to_pharmacy?: boolean | null
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_name?: string | null
          bank_swift_code?: string | null
          chronic_med_notification_frequency?: string | null
          country?: string | null
          created_at?: string
          credential_score?: number | null
          credential_score_updated_at?: string | null
          doctor_number?: string | null
          full_name?: string | null
          holarchelp_enabled?: boolean
          id?: string
          inactive_threshold_months?: number | null
          logo_url?: string | null
          mailbox_alias?: string | null
          mailbox_id?: string
          mfa_required?: boolean
          mobile_number?: string | null
          narration_voice?: string | null
          notify_contacts_on_missed_meds?: boolean
          notify_contacts_on_taken_meds?: boolean
          practice_address?: string | null
          practice_color?: string | null
          practice_number?: string | null
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          round_table_enabled?: boolean | null
          signature_bold?: boolean | null
          signature_color?: string | null
          signature_font?: string | null
          signature_font_size?: number | null
          signature_italic?: boolean | null
          signature_render_url?: string | null
          signature_url?: string | null
          specialty?: string | null
          status?: string | null
          tour_completed_at?: string | null
          tour_skipped_at?: string | null
          updated_at?: string
          v2_demo?: boolean
        }
        Relationships: []
      }
      programme_adherence: {
        Row: {
          completed: boolean
          created_at: string
          entry_date: string
          id: string
          kind: string
          patient_id: string
          slot_key: string
          updated_at: string
          vulas_awarded: number
        }
        Insert: {
          completed?: boolean
          created_at?: string
          entry_date?: string
          id?: string
          kind: string
          patient_id: string
          slot_key?: string
          updated_at?: string
          vulas_awarded?: number
        }
        Update: {
          completed?: boolean
          created_at?: string
          entry_date?: string
          id?: string
          kind?: string
          patient_id?: string
          slot_key?: string
          updated_at?: string
          vulas_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "programme_adherence_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_adherence: {
        Row: {
          admission_id: string | null
          checklist_completion_percent: number | null
          created_at: string | null
          followed_yes: boolean | null
          id: string
          incident_id: string | null
          protocol_code: string | null
          protocol_id: string | null
          reason_not_followed: string | null
          recommended_yes: boolean | null
          staff_user_id: string | null
        }
        Insert: {
          admission_id?: string | null
          checklist_completion_percent?: number | null
          created_at?: string | null
          followed_yes?: boolean | null
          id?: string
          incident_id?: string | null
          protocol_code?: string | null
          protocol_id?: string | null
          reason_not_followed?: string | null
          recommended_yes?: boolean | null
          staff_user_id?: string | null
        }
        Update: {
          admission_id?: string | null
          checklist_completion_percent?: number | null
          created_at?: string | null
          followed_yes?: boolean | null
          id?: string
          incident_id?: string | null
          protocol_code?: string | null
          protocol_id?: string | null
          reason_not_followed?: string | null
          recommended_yes?: boolean | null
          staff_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_adherence_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_adherence_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_compliance_scores: {
        Row: {
          admission_id: string | null
          checklist_items_completed: number | null
          checklist_items_total: number | null
          compliance_percent: number | null
          compliant: boolean | null
          created_at: string | null
          id: string
          incident_id: string | null
          notes: string | null
          protocol_id: string | null
        }
        Insert: {
          admission_id?: string | null
          checklist_items_completed?: number | null
          checklist_items_total?: number | null
          compliance_percent?: number | null
          compliant?: boolean | null
          created_at?: string | null
          id?: string
          incident_id?: string | null
          notes?: string | null
          protocol_id?: string | null
        }
        Update: {
          admission_id?: string | null
          checklist_items_completed?: number | null
          checklist_items_total?: number | null
          compliance_percent?: number | null
          compliant?: boolean | null
          created_at?: string | null
          id?: string
          incident_id?: string | null
          notes?: string | null
          protocol_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_compliance_scores_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_approval_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          provider_id: string
          provider_kind: string
          token: string
          used_action: string | null
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          provider_id: string
          provider_kind: string
          token?: string
          used_action?: string | null
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          provider_id?: string
          provider_kind?: string
          token?: string
          used_action?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
      purchase_order_lines: {
        Row: {
          id: string
          line_total: number | null
          purchase_order_id: string | null
          quantity_ordered: number
          quantity_received: number | null
          stock_item_id: string | null
          unit_cost: number | null
        }
        Insert: {
          id?: string
          line_total?: number | null
          purchase_order_id?: string | null
          quantity_ordered: number
          quantity_received?: number | null
          stock_item_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          id?: string
          line_total?: number | null
          purchase_order_id?: string | null
          quantity_ordered?: number
          quantity_received?: number | null
          stock_item_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          expected_delivery_date: string | null
          hospital_id: string | null
          id: string
          notes: string | null
          order_date: string | null
          ordered_by: string | null
          po_number: string
          status: string | null
          supplier_id: string | null
          total_amount: number | null
        }
        Insert: {
          created_at?: string | null
          expected_delivery_date?: string | null
          hospital_id?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          ordered_by?: string | null
          po_number: string
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
        }
        Update: {
          created_at?: string | null
          expected_delivery_date?: string | null
          hospital_id?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          ordered_by?: string | null
          po_number?: string
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_metrics: {
        Row: {
          hospital_id: string | null
          id: string
          measured_at: string | null
          measurement_period: string | null
          metric_name: string
          metric_value: number | null
          target_value: number | null
        }
        Insert: {
          hospital_id?: string | null
          id?: string
          measured_at?: string | null
          measurement_period?: string | null
          metric_name: string
          metric_value?: number | null
          target_value?: number | null
        }
        Update: {
          hospital_id?: string | null
          id?: string
          measured_at?: string | null
          measurement_period?: string | null
          metric_name?: string
          metric_value?: number | null
          target_value?: number | null
        }
        Relationships: []
      }
      referral_doctors: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          practice_number: string | null
          referral_count: number | null
          specialty: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          practice_number?: string | null
          referral_count?: number | null
          specialty?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          practice_number?: string | null
          referral_count?: number | null
          specialty?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      round_table_messages: {
        Row: {
          content: string
          created_at: string
          doctor_id: string
          doctor_name: string
          edited_at: string | null
          id: string
          topic_id: string
        }
        Insert: {
          content: string
          created_at?: string
          doctor_id: string
          doctor_name: string
          edited_at?: string | null
          id?: string
          topic_id: string
        }
        Update: {
          content?: string
          created_at?: string
          doctor_id?: string
          doctor_name?: string
          edited_at?: string | null
          id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_table_messages_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "round_table_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      round_table_notes: {
        Row: {
          content: string
          created_at: string
          doctor_id: string
          doctor_name: string
          id: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          doctor_id: string
          doctor_name: string
          id?: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          doctor_id?: string
          doctor_name?: string
          id?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_table_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      round_table_reads: {
        Row: {
          doctor_id: string
          id: string
          note_id: string
          read_at: string
        }
        Insert: {
          doctor_id: string
          id?: string
          note_id: string
          read_at?: string
        }
        Update: {
          doctor_id?: string
          id?: string
          note_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_table_reads_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "round_table_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      round_table_topics: {
        Row: {
          body: string
          created_at: string
          doctor_id: string
          doctor_name: string
          id: string
          patient_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          doctor_id: string
          doctor_name: string
          id?: string
          patient_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          doctor_id?: string
          doctor_name?: string
          id?: string
          patient_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_table_topics_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      service_prices: {
        Row: {
          color: string | null
          created_at: string
          currency: string
          default_price: number
          id: string
          is_first_consultation: boolean
          service_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          currency?: string
          default_price?: number
          id?: string
          is_first_consultation?: boolean
          service_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          currency?: string
          default_price?: number
          id?: string
          is_first_consultation?: boolean
          service_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_drawings: {
        Row: {
          canvas_data: Json
          created_at: string
          doctor_id: string
          id: string
          is_current: boolean
          patient_id: string
          session_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          canvas_data?: Json
          created_at?: string
          doctor_id: string
          id?: string
          is_current?: boolean
          patient_id: string
          session_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          canvas_data?: Json
          created_at?: string
          doctor_id?: string
          id?: string
          is_current?: boolean
          patient_id?: string
          session_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_drawings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_drawings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          action_points: Json | null
          ai_diagnosis: string | null
          ai_findings_note: string | null
          audio_url: string | null
          created_at: string
          duration_minutes: number | null
          elapsed_seconds: number | null
          ended_at: string | null
          external_doctor_name: string | null
          external_doctor_practice: string | null
          external_doctor_specialty: string | null
          id: string
          notes: string | null
          patient_id: string
          paused_at: string | null
          private_notes: string | null
          started_at: string
          status: string
          summary: string | null
          title: string | null
          transcript: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_points?: Json | null
          ai_diagnosis?: string | null
          ai_findings_note?: string | null
          audio_url?: string | null
          created_at?: string
          duration_minutes?: number | null
          elapsed_seconds?: number | null
          ended_at?: string | null
          external_doctor_name?: string | null
          external_doctor_practice?: string | null
          external_doctor_specialty?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          paused_at?: string | null
          private_notes?: string | null
          started_at?: string
          status?: string
          summary?: string | null
          title?: string | null
          transcript?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_points?: Json | null
          ai_diagnosis?: string | null
          ai_findings_note?: string | null
          audio_url?: string | null
          created_at?: string
          duration_minutes?: number | null
          elapsed_seconds?: number | null
          ended_at?: string | null
          external_doctor_name?: string | null
          external_doctor_practice?: string | null
          external_doctor_specialty?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          paused_at?: string | null
          private_notes?: string | null
          started_at?: string
          status?: string
          summary?: string | null
          title?: string | null
          transcript?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      sidebar_preferences: {
        Row: {
          hidden_items: string[]
          item_order: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          hidden_items?: string[]
          item_order?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          hidden_items?: string[]
          item_order?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_count_reconciliation: {
        Row: {
          applied: boolean | null
          applied_at: string | null
          applied_by: string | null
          count_date: string | null
          counted_by: string | null
          created_at: string | null
          hospital_id: string | null
          id: string
          physical_count: number
          stock_item_id: string | null
          system_quantity: number
          variance: number | null
          variance_reason: string | null
        }
        Insert: {
          applied?: boolean | null
          applied_at?: string | null
          applied_by?: string | null
          count_date?: string | null
          counted_by?: string | null
          created_at?: string | null
          hospital_id?: string | null
          id?: string
          physical_count: number
          stock_item_id?: string | null
          system_quantity: number
          variance?: number | null
          variance_reason?: string | null
        }
        Update: {
          applied?: boolean | null
          applied_at?: string | null
          applied_by?: string | null
          count_date?: string | null
          counted_by?: string | null
          created_at?: string | null
          hospital_id?: string | null
          id?: string
          physical_count?: number
          stock_item_id?: string | null
          system_quantity?: number
          variance?: number | null
          variance_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_count_reconciliation_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_count_reconciliation_counted_by_fkey"
            columns: ["counted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_count_reconciliation_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_count_reconciliation_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_count_reconciliation_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          category: string
          created_at: string | null
          hospital_id: string | null
          id: string
          is_active: boolean | null
          item_code: string | null
          item_name: string
          reorder_quantity: number | null
          reorder_threshold: number | null
          unit_cost: number | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          hospital_id?: string | null
          id?: string
          is_active?: boolean | null
          item_code?: string | null
          item_name: string
          reorder_quantity?: number | null
          reorder_threshold?: number | null
          unit_cost?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          hospital_id?: string | null
          id?: string
          is_active?: boolean | null
          item_code?: string | null
          item_name?: string
          reorder_quantity?: number | null
          reorder_threshold?: number | null
          unit_cost?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          hospital_id: string | null
          id: string
          last_counted_at: string | null
          location_name: string
          quantity_on_hand: number
          stock_item_id: string | null
          updated_at: string | null
        }
        Insert: {
          hospital_id?: string | null
          id?: string
          last_counted_at?: string | null
          location_name?: string
          quantity_on_hand?: number
          stock_item_id?: string | null
          updated_at?: string | null
        }
        Update: {
          hospital_id?: string | null
          id?: string
          last_counted_at?: string | null
          location_name?: string
          quantity_on_hand?: number
          stock_item_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_requisitions: {
        Row: {
          fulfilled_at: string | null
          fulfilled_by: string | null
          hospital_id: string | null
          id: string
          notes: string | null
          quantity_fulfilled: number | null
          quantity_requested: number
          requested_at: string | null
          requested_by: string | null
          requested_by_name: string | null
          requesting_location: string
          status: string | null
          stock_item_id: string | null
          urgency: string | null
        }
        Insert: {
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          hospital_id?: string | null
          id?: string
          notes?: string | null
          quantity_fulfilled?: number | null
          quantity_requested: number
          requested_at?: string | null
          requested_by?: string | null
          requested_by_name?: string | null
          requesting_location: string
          status?: string | null
          stock_item_id?: string | null
          urgency?: string | null
        }
        Update: {
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          hospital_id?: string | null
          id?: string
          notes?: string | null
          quantity_fulfilled?: number | null
          quantity_requested?: number
          requested_at?: string | null
          requested_by?: string | null
          requested_by_name?: string | null
          requesting_location?: string
          status?: string | null
          stock_item_id?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_requisitions_fulfilled_by_fkey"
            columns: ["fulfilled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_requisitions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_requisitions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "holarchelp_hospitals_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_requisitions_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_requisitions_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_config: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          lollipops_awarded: number
          streak_interval_months: number
          streak_name: string
          updated_at: string
          visit_category: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          lollipops_awarded?: number
          streak_interval_months?: number
          streak_name: string
          updated_at?: string
          visit_category: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          lollipops_awarded?: number
          streak_interval_months?: number
          streak_name?: string
          updated_at?: string
          visit_category?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          accepted_terms_at: string | null
          billing_cycle: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_trial: boolean | null
          paypal_subscription_id: string | null
          plan_type: string
          status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_terms_at?: string | null
          billing_cycle: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_trial?: boolean | null
          paypal_subscription_id?: string | null
          plan_type: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_terms_at?: string | null
          billing_cycle?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_trial?: boolean | null
          paypal_subscription_id?: string | null
          plan_type?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          payment_terms: string | null
          supplier_name: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          payment_terms?: string | null
          supplier_name: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          payment_terms?: string | null
          supplier_name?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          description: string | null
          font_family: string | null
          footer_template_id: string | null
          header_footer_template_id: string | null
          header_template_id: string | null
          id: string
          is_default: boolean | null
          logo_position: Json | null
          logo_url: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          description?: string | null
          font_family?: string | null
          footer_template_id?: string | null
          header_footer_template_id?: string | null
          header_template_id?: string | null
          id?: string
          is_default?: boolean | null
          logo_position?: Json | null
          logo_url?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          description?: string | null
          font_family?: string | null
          footer_template_id?: string | null
          header_footer_template_id?: string | null
          header_template_id?: string | null
          id?: string
          is_default?: boolean | null
          logo_position?: Json | null
          logo_url?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_footer_template_id_fkey"
            columns: ["footer_template_id"]
            isOneToOne: false
            referencedRelation: "header_footer_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_header_footer_template_id_fkey"
            columns: ["header_footer_template_id"]
            isOneToOne: false
            referencedRelation: "header_footer_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_header_template_id_fkey"
            columns: ["header_template_id"]
            isOneToOne: false
            referencedRelation: "header_footer_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          assigned_to_user_id: string | null
          assignee: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          document_id: string | null
          due_date: string | null
          id: string
          is_auto_executed: boolean | null
          patient_id: string | null
          priority: string
          proof_url: string | null
          session_id: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
          user_id: string
          vulas_reward: number
        }
        Insert: {
          assigned_to_user_id?: string | null
          assignee?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          id?: string
          is_auto_executed?: boolean | null
          patient_id?: string | null
          priority?: string
          proof_url?: string | null
          session_id?: string | null
          status?: string
          task_type?: string
          title: string
          updated_at?: string
          user_id: string
          vulas_reward?: number
        }
        Update: {
          assigned_to_user_id?: string | null
          assignee?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          id?: string
          is_auto_executed?: boolean | null
          patient_id?: string | null
          priority?: string
          proof_url?: string | null
          session_id?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
          user_id?: string
          vulas_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "todos_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_guidelines: {
        Row: {
          alternate_options: string[] | null
          condition_name: string
          contraindicated_medications: string[]
          contraindicated_reasons: Json | null
          created_at: string | null
          evidence_level: string | null
          id: string
          notes: string | null
          recommended_medications: string[]
        }
        Insert: {
          alternate_options?: string[] | null
          condition_name: string
          contraindicated_medications: string[]
          contraindicated_reasons?: Json | null
          created_at?: string | null
          evidence_level?: string | null
          id?: string
          notes?: string | null
          recommended_medications: string[]
        }
        Update: {
          alternate_options?: string[] | null
          condition_name?: string
          contraindicated_medications?: string[]
          contraindicated_reasons?: Json | null
          created_at?: string | null
          evidence_level?: string | null
          id?: string
          notes?: string | null
          recommended_medications?: string[]
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          message: string | null
          recipient_email: string
          recipient_id: string | null
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          message?: string | null
          recipient_email: string
          recipient_id?: string | null
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          message?: string | null
          recipient_email?: string
          recipient_id?: string | null
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_screen_tips_seen: {
        Row: {
          seen_at: string
          tip_id: string
          user_id: string
        }
        Insert: {
          seen_at?: string
          tip_id: string
          user_id: string
        }
        Update: {
          seen_at?: string
          tip_id?: string
          user_id?: string
        }
        Relationships: []
      }
      vendor_invoices: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          paid_amount: number | null
          paid_date: string | null
          purchase_order_id: string | null
          status: string | null
          supplier_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          paid_amount?: number | null
          paid_date?: string | null
          purchase_order_id?: string | null
          status?: string | null
          supplier_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          paid_amount?: number | null
          paid_date?: string | null
          purchase_order_id?: string | null
          status?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_ratings: {
        Row: {
          communication_rating: number | null
          created_at: string | null
          expertise_rating: number | null
          id: string
          professionalism_rating: number | null
          rated_user_id: string
          rater_id: string
          rater_role: string
          rating: number
          session_id: string
        }
        Insert: {
          communication_rating?: number | null
          created_at?: string | null
          expertise_rating?: number | null
          id?: string
          professionalism_rating?: number | null
          rated_user_id: string
          rater_id: string
          rater_role: string
          rating: number
          session_id: string
        }
        Update: {
          communication_rating?: number | null
          created_at?: string | null
          expertise_rating?: number | null
          id?: string
          professionalism_rating?: number | null
          rated_user_id?: string
          rater_id?: string
          rater_role?: string
          rating?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      vula_adherence_configs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          lollipops_awarded: number
          medication_category: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          lollipops_awarded?: number
          medication_category: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          lollipops_awarded?: number
          medication_category?: string
          updated_at?: string
        }
        Relationships: []
      }
      vula_partner_apps: {
        Row: {
          app_store_url: string | null
          category: string | null
          created_at: string
          creator: string | null
          google_play_url: string | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          logo_url: string | null
          name: string
          partner_code: string | null
          signup_url: string | null
        }
        Insert: {
          app_store_url?: string | null
          category?: string | null
          created_at?: string
          creator?: string | null
          google_play_url?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          logo_url?: string | null
          name: string
          partner_code?: string | null
          signup_url?: string | null
        }
        Update: {
          app_store_url?: string | null
          category?: string | null
          created_at?: string
          creator?: string | null
          google_play_url?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          logo_url?: string | null
          name?: string
          partner_code?: string | null
          signup_url?: string | null
        }
        Relationships: []
      }
      vula_transfers: {
        Row: {
          amount: number
          created_at: string
          id: string
          partner_app_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          partner_app_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          partner_app_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vula_transfers_partner_app_id_fkey"
            columns: ["partner_app_id"]
            isOneToOne: false
            referencedRelation: "vula_partner_apps"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      blood_bank_providers_public: {
        Row: {
          address: string | null
          approved_at: string | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          owner_id: string | null
          registration_number: string | null
          state: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          owner_id?: string | null
          registration_number?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          owner_id?: string | null
          registration_number?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      doctor_busy_slots: {
        Row: {
          doctor_id: string | null
          end_time: string | null
          start_time: string | null
        }
        Insert: {
          doctor_id?: string | null
          end_time?: string | null
          start_time?: string | null
        }
        Update: {
          doctor_id?: string | null
          end_time?: string | null
          start_time?: string | null
        }
        Relationships: []
      }
      holarchelp_ambulance_providers_public: {
        Row: {
          accepting_patients: boolean | null
          approved_at: string | null
          at_capacity: boolean | null
          base_address: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          credential_score: number | null
          credential_score_updated_at: string | null
          dispatch_priority: number | null
          fleet_size: number | null
          id: string | null
          latitude: number | null
          longitude: number | null
          owner_id: string | null
          ownership: string | null
          registration_number: string | null
          sos_voice_clip_path: string | null
          state: string | null
          status:
            | Database["public"]["Enums"]["holarchelp_provider_status"]
            | null
          subscription_status:
            | Database["public"]["Enums"]["holarchelp_subscription_status"]
            | null
          tier: Database["public"]["Enums"]["holarchelp_ambulance_tier"] | null
          updated_at: string | null
        }
        Insert: {
          accepting_patients?: boolean | null
          approved_at?: string | null
          at_capacity?: boolean | null
          base_address?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          credential_score?: number | null
          credential_score_updated_at?: string | null
          dispatch_priority?: number | null
          fleet_size?: number | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          owner_id?: string | null
          ownership?: string | null
          registration_number?: string | null
          sos_voice_clip_path?: string | null
          state?: string | null
          status?:
            | Database["public"]["Enums"]["holarchelp_provider_status"]
            | null
          subscription_status?:
            | Database["public"]["Enums"]["holarchelp_subscription_status"]
            | null
          tier?: Database["public"]["Enums"]["holarchelp_ambulance_tier"] | null
          updated_at?: string | null
        }
        Update: {
          accepting_patients?: boolean | null
          approved_at?: string | null
          at_capacity?: boolean | null
          base_address?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          credential_score?: number | null
          credential_score_updated_at?: string | null
          dispatch_priority?: number | null
          fleet_size?: number | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          owner_id?: string | null
          ownership?: string | null
          registration_number?: string | null
          sos_voice_clip_path?: string | null
          state?: string | null
          status?:
            | Database["public"]["Enums"]["holarchelp_provider_status"]
            | null
          subscription_status?:
            | Database["public"]["Enums"]["holarchelp_subscription_status"]
            | null
          tier?: Database["public"]["Enums"]["holarchelp_ambulance_tier"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      holarchelp_hospitals_public: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          credential_score: number | null
          id: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          ownership: string | null
          status:
            | Database["public"]["Enums"]["holarchelp_provider_status"]
            | null
          tier: Database["public"]["Enums"]["holarchelp_hospital_tier"] | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          credential_score?: number | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          ownership?: string | null
          status?:
            | Database["public"]["Enums"]["holarchelp_provider_status"]
            | null
          tier?: Database["public"]["Enums"]["holarchelp_hospital_tier"] | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          credential_score?: number | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          ownership?: string | null
          status?:
            | Database["public"]["Enums"]["holarchelp_provider_status"]
            | null
          tier?: Database["public"]["Enums"]["holarchelp_hospital_tier"] | null
        }
        Relationships: []
      }
      holarchelp_pharmacies_public: {
        Row: {
          accepting_patients: boolean | null
          address: string | null
          approved_at: string | null
          city: string | null
          country: string | null
          created_at: string | null
          credential_score: number | null
          dispatch_priority: number | null
          id: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          owner_id: string | null
          registration_number: string | null
          status:
            | Database["public"]["Enums"]["holarchelp_provider_status"]
            | null
          tier: Database["public"]["Enums"]["holarchelp_hospital_tier"] | null
          updated_at: string | null
        }
        Insert: {
          accepting_patients?: boolean | null
          address?: string | null
          approved_at?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          credential_score?: number | null
          dispatch_priority?: number | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          owner_id?: string | null
          registration_number?: string | null
          status?:
            | Database["public"]["Enums"]["holarchelp_provider_status"]
            | null
          tier?: Database["public"]["Enums"]["holarchelp_hospital_tier"] | null
          updated_at?: string | null
        }
        Update: {
          accepting_patients?: boolean | null
          address?: string | null
          approved_at?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          credential_score?: number | null
          dispatch_priority?: number | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          owner_id?: string | null
          registration_number?: string | null
          status?:
            | Database["public"]["Enums"]["holarchelp_provider_status"]
            | null
          tier?: Database["public"]["Enums"]["holarchelp_hospital_tier"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _is_amb_provider_admin_for_vehicle: {
        Args: { _ambulance_id: string }
        Returns: boolean
      }
      acknowledge_alert: {
        Args: { p_alert_id: string; p_staff_user_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      admin_country_list: {
        Args: never
        Returns: {
          country: string
          users: number
        }[]
      }
      admin_user_performance: {
        Args: { _country?: string; _from?: string; _to?: string }
        Returns: {
          activated: boolean
          appointments_count: number
          checkins_count: number
          country: string
          documents_count: number
          email: string
          full_name: string
          incidents_count: number
          last_active: string
          last_sign_in: string
          login_days: number
          minutes_active: number
          prescriptions_count: number
          returned: boolean
          role: string
          sessions_count: number
          signed_up: string
          user_id: string
        }[]
      }
      approve_blood_donation: { Args: { _donation_id: string }; Returns: Json }
      assistant_of_doctor: {
        Args: { _assistant: string; _doctor: string }
        Returns: boolean
      }
      award_doctor_checkin: {
        Args: { _note?: string; _patient_user_id: string }
        Returns: Json
      }
      biolog_can_view: { Args: { _owner: string }; Returns: boolean }
      calculate_hospital_compliance_metrics: {
        Args: { p_hospital_id: string; p_period_days?: number }
        Returns: {
          compliance_rate: number
          metric_name: string
          status: string
          target_rate: number
        }[]
      }
      calculate_patient_risk_score: {
        Args: { p_incident_id?: string; p_patient_id: string }
        Returns: {
          escalation_reason: string
          escalation_required: boolean
          risk_factors: string[]
          risk_level: string
          total_risk_score: number
        }[]
      }
      calculate_protocol_compliance_score: {
        Args: { p_incident_id: string }
        Returns: {
          compliance_percent: number
          compliant: boolean
          items_completed: number
          items_total: number
          protocol_id: string
          protocol_name: string
        }[]
      }
      can_access_admission: {
        Args: { _admission_id: string }
        Returns: boolean
      }
      can_access_holarchelp_incident: {
        Args: { _incident_id: string }
        Returns: boolean
      }
      can_access_patient_clinical: {
        Args: { _patient_user_id: string }
        Returns: boolean
      }
      can_edit_admission: { Args: { _admission_id: string }; Returns: boolean }
      can_log_patient_activity: {
        Args: { _hospital_id: string; _patient_id: string }
        Returns: boolean
      }
      can_manage_patient_programme: {
        Args: { _patient_id: string }
        Returns: boolean
      }
      can_see_ward: {
        Args: { _hospital_id: string; _user_id: string; _ward_id: string }
        Returns: boolean
      }
      can_upload_holarchelp_incident: {
        Args: { _incident_id: string }
        Returns: boolean
      }
      can_view_inpatient_admission: {
        Args: { _admission_id: string }
        Returns: boolean
      }
      can_view_patient_programme: {
        Args: { _patient_id: string }
        Returns: boolean
      }
      can_view_patient_record: {
        Args: { _patient_id: string }
        Returns: boolean
      }
      check_allergy_conflicts: {
        Args: { p_medication_name: string; p_patient_id: string }
        Returns: {
          allergen: string
          has_conflict: boolean
          reaction: string
          recommendation: string
          severity: string
        }[]
      }
      check_drug_interactions: {
        Args: { p_new_medication: string; p_patient_id: string }
        Returns: {
          clinical_effect: string
          existing_medication: string
          has_interaction: boolean
          recommendation: string
          severity: string
        }[]
      }
      check_duplicate_labs: {
        Args: {
          p_incident_id: string
          p_lab_tests: string[]
          p_patient_id: string
        }
        Returns: {
          duplicate_count: number
          last_order_date: string
          test_name: string
          time_since_last_minutes: number
        }[]
      }
      check_medication_interaction: {
        Args: { p_drug_1: string; p_drug_2: string }
        Returns: {
          clinical_effect: string
          description: string
          has_interaction: boolean
          recommendation: string
          severity: string
        }[]
      }
      check_provider_duplicate: {
        Args: { _city: string; _name: string; _reg_no: string; _type: string }
        Returns: Json
      }
      country_from_dial_code: { Args: { _phone: string }; Returns: string }
      create_allergy_alert: {
        Args: {
          p_admission_id?: string
          p_allergen: string
          p_incident_id?: string
          p_medication_name: string
          p_patient_id: string
          p_reaction: string
          p_severity: string
        }
        Returns: string
      }
      create_critical_lab_alert: {
        Args: {
          p_admission_id?: string
          p_incident_id?: string
          p_normal_max: number
          p_patient_id: string
          p_test_name: string
          p_unit: string
          p_value: number
        }
        Returns: string
      }
      create_doctor_invite_notification: {
        Args: {
          _description: string
          _doctor_id: string
          _reference_id: string
          _title: string
        }
        Returns: undefined
      }
      create_interaction_alert: {
        Args: {
          p_admission_id?: string
          p_clinical_effect: string
          p_drug_1: string
          p_drug_2: string
          p_incident_id?: string
          p_patient_id: string
          p_severity: string
        }
        Returns: string
      }
      current_verified_email: { Args: never; Returns: string }
      doctor_had_access_at: {
        Args: { _created_at: string; _patient_id: string }
        Returns: boolean
      }
      doctor_has_access_request_from: {
        Args: { patient_id: string }
        Returns: boolean
      }
      end_login_event: { Args: { _session_key: string }; Returns: undefined }
      forecast_stock_demand: {
        Args: { p_lookback_days?: number; p_stock_item_id: string }
        Returns: {
          avg_monthly_consumption: number
          suggested_reorder_quantity: number
        }[]
      }
      generate_documentation_suggestions: {
        Args: { p_incident_id: string; p_patient_user_id: string }
        Returns: {
          priority: string
          suggestion_id: string
          suggestion_text: string
          suggestion_type: string
        }[]
      }
      generate_incident_report: {
        Args: {
          p_generated_by: string
          p_incident_id: string
          p_patient_user_id: string
          p_template_id: string
        }
        Returns: string
      }
      generate_procedure_invoice: {
        Args: {
          p_admission_id: string
          p_created_by: string
          p_hospital_id: string
          p_invoice_number: string
          p_patient_id: string
          p_procedure_name: string
        }
        Returns: string
      }
      get_budget_vs_actual: {
        Args: { p_budget_period: string; p_hospital_id: string }
        Returns: {
          actual_spend: number
          allocated_amount: number
          category: string
          department_budget_id: string
          department_name: string
          percent_used: number
          remaining: number
        }[]
      }
      get_doctor_invite_card: {
        Args: { _doctor_id: string }
        Returns: {
          avatar_url: string
          doctor_number: string
          full_name: string
          id: string
          practice_number: string
          specialty: string
        }[]
      }
      get_emergency_patient_context: {
        Args: { _incident_id: string }
        Returns: Json
      }
      get_incident_clinical_context: {
        Args: { p_patient_id: string }
        Returns: {
          abnormal_labs: string[]
          active_conditions: string[]
          critical_allergies: string[]
          current_medications: string[]
          suggested_monitoring: string[]
        }[]
      }
      get_low_stock_items: {
        Args: { p_hospital_id: string }
        Returns: {
          category: string
          item_name: string
          quantity_on_hand: number
          reorder_quantity: number
          reorder_threshold: number
          stock_item_id: string
        }[]
      }
      get_my_profile_views: {
        Args: never
        Returns: {
          id: string
          screen: string
          viewed_at: string
          viewer_id: string
          viewer_name: string
          viewer_role: string
        }[]
      }
      get_patient_active_alerts: {
        Args: { p_patient_id: string }
        Returns: {
          acknowledged: boolean
          alert_type: string
          created_at: string
          description: string
          id: string
          related_data: Json
          severity: string
          title: string
        }[]
      }
      get_patient_context: {
        Args: { p_patient_user_id: string }
        Returns: {
          allergies: Json
          current_medications: Json
          drug_interactions: Json
          medical_history: Json
          recent_imaging: Json
          recent_labs: Json
        }[]
      }
      get_patient_document_alias: {
        Args: { _patient_id: string }
        Returns: string
      }
      get_recommended_labs: {
        Args: { p_patient_id: string }
        Returns: {
          condition_name: string
          recommended_labs: string[]
          urgency: string
        }[]
      }
      get_recommended_protocols: {
        Args: { p_patient_id: string }
        Returns: {
          checklist_items: string[]
          contraindicated_meds: string[]
          matching_conditions: string[]
          priority_level: string
          protocol_code: string
          protocol_id: string
          protocol_name: string
          recommended_medications: string[]
        }[]
      }
      get_seeded_profile_names: {
        Args: { _emails: string[] }
        Returns: {
          email: string
          full_name: string
        }[]
      }
      get_stock_variance_report: {
        Args: { p_days?: number; p_hospital_id: string }
        Returns: {
          count_date: string
          item_name: string
          physical_count: number
          system_quantity: number
          variance: number
        }[]
      }
      get_treatment_options: {
        Args: { p_condition_name: string; p_patient_id: string }
        Returns: {
          alternate_options: string[]
          blocking_reason: string
          condition: string
          contraindicated_meds: string[]
          evidence_level: string
          recommended_meds: string[]
          safe_for_patient: boolean
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_users_admin: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          last_sign_in_at: string
          role: string
          status: string
          user_id: string
        }[]
      }
      has_profile_share: {
        Args: { _live_tracking?: boolean; _owner: string; _viewer: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      haversine_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      holarchelp_accept_incident: {
        Args: { _incident_id: string; _provider_id: string }
        Returns: Json
      }
      holarchelp_ack_tracking: { Args: { _token: string }; Returns: undefined }
      holarchelp_approve_ambulance: {
        Args: { _provider_id: string }
        Returns: undefined
      }
      holarchelp_approve_blood_bank: {
        Args: { _provider_id: string }
        Returns: undefined
      }
      holarchelp_approve_hospital: {
        Args: { _hospital_id: string }
        Returns: undefined
      }
      holarchelp_approve_insurer: {
        Args: { _provider_id: string }
        Returns: undefined
      }
      holarchelp_approve_pharmacy: {
        Args: { _provider_id: string }
        Returns: undefined
      }
      holarchelp_auto_assign_incident: {
        Args: { _incident_id: string }
        Returns: Json
      }
      holarchelp_cancel_transport: {
        Args: { _incident_id: string; _reason?: string }
        Returns: Json
      }
      holarchelp_crew_acknowledge: {
        Args: { _incident_id: string }
        Returns: undefined
      }
      holarchelp_dispatcher_assign: {
        Args: {
          _destination_hospital_id?: string
          _incident_id: string
          _shift_id: string
        }
        Returns: undefined
      }
      holarchelp_dispatcher_assign_vehicle: {
        Args: { _ambulance_id: string; _incident_id: string }
        Returns: Json
      }
      holarchelp_eligible_paramedics: {
        Args: { _provider_ids: string[] }
        Returns: {
          ambulance_id: string
          provider_id: string
          user_id: string
        }[]
      }
      holarchelp_end_shift: { Args: never; Returns: Json }
      holarchelp_generate_incident_number: { Args: never; Returns: string }
      holarchelp_get_incident_offers: {
        Args: { _incident_id: string }
        Returns: {
          accepting_patients: boolean
          distance_km: number
          name: string
          ownership: string
          provider_id: string
          provider_kind: string
          response: string
        }[]
      }
      holarchelp_get_incident_providers_public: {
        Args: { _incident_id: string }
        Returns: {
          display_name: string
          id: string
          kind: string
        }[]
      }
      holarchelp_get_tracking_incident: {
        Args: { _token: string }
        Returns: {
          created_at: string
          full_name: string
          id: string
          resolved_at: string
          status: string
        }[]
      }
      holarchelp_get_tracking_locations: {
        Args: { _limit?: number; _token: string }
        Returns: {
          accuracy: number
          latitude: number
          longitude: number
          recorded_at: string
        }[]
      }
      holarchelp_paramedic_accept:
        | {
            Args: { _ambulance_id: string; _incident_id: string }
            Returns: Json
          }
        | {
            Args: {
              _ambulance_id: string
              _destination_hospital_id?: string
              _incident_id: string
            }
            Returns: Json
          }
      holarchelp_patient_change_provider: {
        Args: { _incident_id: string; _provider_id: string }
        Returns: Json
      }
      holarchelp_patient_pick_provider: {
        Args: { _incident_id: string; _kind: string; _provider_id: string }
        Returns: Json
      }
      holarchelp_provider_accountability: {
        Args: never
        Returns: {
          accepts: number
          avg_arr_min: number
          avg_rating: number
          cancels: number
          country: string
          critical_cancels: number
          dispatch_priority: number
          flags: number
          name: string
          provider_id: string
          provider_type: string
          stalled: number
          status: string
          tier: string
        }[]
      }
      holarchelp_reject_provider: {
        Args: { _kind: string; _provider_id: string; _reason?: string }
        Returns: undefined
      }
      holarchelp_release_incident: {
        Args: { _incident_id: string; _reason?: string }
        Returns: Json
      }
      holarchelp_set_destination_hospital: {
        Args: { _hospital_id: string; _incident_id: string }
        Returns: Json
      }
      holarchelp_set_dispatcher_on_duty: {
        Args: { _on: boolean; _provider_id: string }
        Returns: undefined
      }
      holarchelp_set_incident_status: {
        Args: { _incident_id: string; _payload?: Json; _status: string }
        Returns: Json
      }
      holarchelp_start_shift: { Args: { _ambulance_id: string }; Returns: Json }
      holarchelp_start_shifts_bulk: { Args: { _payload: Json }; Returns: Json }
      holarchelp_update_provider_location: {
        Args: { _incident_id: string; _lat: number; _lng: number }
        Returns: undefined
      }
      holarchelp_user_enabled: { Args: { _uid: string }; Returns: boolean }
      hospital_of_ward: { Args: { _ward_id: string }; Returns: string }
      hospital_shift_clock: {
        Args: { _action: string; _shift_id: string }
        Returns: Json
      }
      hospital_transfer_patient: {
        Args: {
          _admission_id: string
          _reason?: string
          _to_bed: string
          _to_ward_id: string
        }
        Returns: Json
      }
      is_ambulance_admin: {
        Args: { _provider_id: string; _user_id: string }
        Returns: boolean
      }
      is_ambulance_role: {
        Args: { _provider_id: string; _role: string; _user_id: string }
        Returns: boolean
      }
      is_ambulance_staff: {
        Args: { _provider_id: string; _user_id: string }
        Returns: boolean
      }
      is_hospital_admin: {
        Args: { _hospital_id: string; _user_id: string }
        Returns: boolean
      }
      is_hospital_nurse: {
        Args: { _hospital_id: string; _user_id: string }
        Returns: boolean
      }
      is_hospital_role: {
        Args: { _hospital_id: string; _role: string; _user_id: string }
        Returns: boolean
      }
      is_hospital_staff: {
        Args: { _hospital_id: string; _user_id: string }
        Returns: boolean
      }
      is_nurse_record_admin: { Args: { _nurse_id: string }; Returns: boolean }
      is_own_nurse_record: { Args: { _nurse_id: string }; Returns: boolean }
      is_paramedic: { Args: { _user_id: string }; Returns: boolean }
      is_practice_assistant: { Args: { _user_id: string }; Returns: boolean }
      is_practice_member: {
        Args: { _practice_id: string; _user_id: string }
        Returns: boolean
      }
      is_practice_owner: {
        Args: { _practice_id: string; _user_id: string }
        Returns: boolean
      }
      link_admission_to_patient: {
        Args: { p_admission_id: string; p_patient_user_id: string }
        Returns: {
          admission_id: string
          message: string
          success: boolean
        }[]
      }
      name_match_score: { Args: { _name: string; _q: string }; Returns: number }
      norm_lang: { Args: { _v: string }; Returns: string }
      norm_text: { Args: { _t: string }; Returns: string }
      nurse_record_hospital: { Args: { _nurse_id: string }; Returns: string }
      nurse_ward_id: {
        Args: { _hospital_id: string; _user_id: string }
        Returns: string
      }
      patient_admitted_at_my_hospital: {
        Args: { _patient_id: string }
        Returns: boolean
      }
      process_provider_approval: {
        Args: { _action: string; _token: string }
        Returns: Json
      }
      provider_has_offer_on_incident: {
        Args: { _incident_id: string; _user_id: string }
        Returns: boolean
      }
      record_login_event: {
        Args: { _session_key: string; _user_agent?: string }
        Returns: undefined
      }
      record_procedure_stock_usage: {
        Args: {
          p_admission_id: string
          p_procedure_name: string
          p_quantity: number
          p_recorded_by: string
          p_recorded_by_name: string
          p_stock_item_id: string
        }
        Returns: string
      }
      search_doctor_profiles: {
        Args: { _language?: string; _name?: string; _specialty?: string }
        Returns: {
          about_me: string
          avatar_url: string
          doctor_number: string
          full_name: string
          id: string
          mobile_number: string
          practice_address: string
          practice_number: string
          preferred_language: string
          specialty: string
        }[]
      }
      search_patients_for_hospital: {
        Args: { p_hospital_id: string; p_query: string }
        Returns: {
          admission_id: string
          admission_status: string
          email: string
          full_name: string
          id: string
          incident_id: string
          incident_number: string
          phone: string
          user_id: string
        }[]
      }
      search_providers: {
        Args: { _language?: string; _name?: string; _specialty?: string }
        Returns: {
          about_me: string
          address: string
          avatar_url: string
          full_name: string
          id: string
          kind: string
          ownership: string
          phone: string
          preferred_language: string
          registration: string
          specialty: string
          stars: number
        }[]
      }
      seed_default_header_footer_template: {
        Args: { _user_id: string }
        Returns: undefined
      }
      shares_practice: {
        Args: { _user_a: string; _user_b: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      storage_object_path: {
        Args: { _bucket: string; _url: string }
        Returns: string
      }
      touch_login_event: { Args: { _session_key: string }; Returns: undefined }
      user_can_access_patient_rt: {
        Args: { _patient_id: string }
        Returns: boolean
      }
      user_owns_provider_license_path: {
        Args: { _path: string }
        Returns: boolean
      }
      validate_medication_safety: {
        Args: {
          p_admission_id?: string
          p_incident_id?: string
          p_medication_name: string
          p_patient_id: string
          p_prescribed_by: string
        }
        Returns: {
          blocks: string[]
          check_summary: string
          is_safe: boolean
          warnings: string[]
        }[]
      }
    }
    Enums: {
      access_permission:
        | "patient_info"
        | "calendar"
        | "session_summaries"
        | "prescription_history"
      holarchelp_ambulance_tier: "tier_1" | "tier_2" | "tier_3" | "tier_4"
      holarchelp_hospital_tier: "tier_1" | "tier_2" | "tier_3"
      holarchelp_provider_status:
        | "pending"
        | "approved"
        | "rejected"
        | "suspended"
      holarchelp_subscription_status:
        | "inactive"
        | "active"
        | "past_due"
        | "cancelled"
      invitation_status: "pending" | "accepted" | "declined" | "expired"
      user_role:
        | "doctor"
        | "patient"
        | "admin"
        | "hospital_staff"
        | "ambulance_staff"
        | "blood_bank"
        | "pharmacy_staff"
        | "nurse"
        | "insurer_staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_permission: [
        "patient_info",
        "calendar",
        "session_summaries",
        "prescription_history",
      ],
      holarchelp_ambulance_tier: ["tier_1", "tier_2", "tier_3", "tier_4"],
      holarchelp_hospital_tier: ["tier_1", "tier_2", "tier_3"],
      holarchelp_provider_status: [
        "pending",
        "approved",
        "rejected",
        "suspended",
      ],
      holarchelp_subscription_status: [
        "inactive",
        "active",
        "past_due",
        "cancelled",
      ],
      invitation_status: ["pending", "accepted", "declined", "expired"],
      user_role: [
        "doctor",
        "patient",
        "admin",
        "hospital_staff",
        "ambulance_staff",
        "blood_bank",
        "pharmacy_staff",
        "nurse",
        "insurer_staff",
      ],
    },
  },
} as const
