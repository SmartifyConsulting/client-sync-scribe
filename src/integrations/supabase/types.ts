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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      advisor_access_requests: {
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
      app_integrations_catalog: {
        Row: {
          category: Database["public"]["Enums"]["integration_category"]
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          portal_url: string
          required_fields: Json
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["integration_category"]
          created_at?: string
          display_order?: number
          id: string
          is_active?: boolean
          name: string
          portal_url: string
          required_fields?: Json
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["integration_category"]
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          portal_url?: string
          required_fields?: Json
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
            referencedRelation: "clients"
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
            referencedRelation: "clients"
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
      broker_client_access: {
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
      broker_integration_credentials: {
        Row: {
          broker_user_id: string
          created_at: string
          encrypted_credentials: string | null
          id: string
          integration_id: string
          is_enabled: boolean
          status: Database["public"]["Enums"]["integration_status"]
          updated_at: string
          username: string | null
        }
        Insert: {
          broker_user_id: string
          created_at?: string
          encrypted_credentials?: string | null
          id?: string
          integration_id: string
          is_enabled?: boolean
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          username?: string | null
        }
        Update: {
          broker_user_id?: string
          created_at?: string
          encrypted_credentials?: string | null
          id?: string
          integration_id?: string
          is_enabled?: boolean
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_integration_credentials_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "app_integrations_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_security_settings: {
        Row: {
          broker_user_id: string
          created_at: string
          password_protector_hash: string | null
          updated_at: string
        }
        Insert: {
          broker_user_id: string
          created_at?: string
          password_protector_hash?: string | null
          updated_at?: string
        }
        Update: {
          broker_user_id?: string
          created_at?: string
          password_protector_hash?: string | null
          updated_at?: string
        }
        Relationships: []
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
      client_financial_profiles: {
        Row: {
          ai_summary: string | null
          ai_summary_updated_at: string | null
          assets_liabilities: Json
          car_insurance: Json | null
          cash_flow: Json
          created_at: string
          estate: Json
          extracted_at: string | null
          extracted_from_session_id: string | null
          general_notes: string | null
          goals_risk: Json
          investments: Json
          patient_id: string
          risk_portfolio: Json
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          ai_summary?: string | null
          ai_summary_updated_at?: string | null
          assets_liabilities?: Json
          car_insurance?: Json | null
          cash_flow?: Json
          created_at?: string
          estate?: Json
          extracted_at?: string | null
          extracted_from_session_id?: string | null
          general_notes?: string | null
          goals_risk?: Json
          investments?: Json
          patient_id: string
          risk_portfolio?: Json
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          ai_summary?: string | null
          ai_summary_updated_at?: string | null
          assets_liabilities?: Json
          car_insurance?: Json | null
          cash_flow?: Json
          created_at?: string
          estate?: Json
          extracted_at?: string | null
          extracted_from_session_id?: string | null
          general_notes?: string | null
          goals_risk?: Json
          investments?: Json
          patient_id?: string
          risk_portfolio?: Json
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_financial_profiles_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_hidden_advisors: {
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
      client_history_timelines: {
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
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invitations: {
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
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_life_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_date: string
          event_type: string
          id: string
          notes: string | null
          patient_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type: string
          id?: string
          notes?: string | null
          patient_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type?: string
          id?: string
          notes?: string | null
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_life_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profile_shares: {
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
      clients: {
        Row: {
          address: string | null
          allergies: string | null
          allergies_structured: Json | null
          blood_type: string | null
          business_name: string | null
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
          employer_years: string | null
          family_history: Json | null
          first_name: string | null
          gender: string | null
          general_practitioner: string | null
          height_cm: number | null
          highest_education: string | null
          id: string
          id_passport_number: string | null
          industry: string | null
          is_chronic: boolean | null
          is_sample: boolean
          last_name: string | null
          maiden_name: string | null
          marital_regime: string | null
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
          religion: string | null
          reporting_to_email: string | null
          same_as_physical: boolean | null
          self_employed: string | null
          smoker: string | null
          smoker_quantity: string | null
          status: string
          surgeries: Json | null
          tax_reference_number: string | null
          title: string | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          allergies_structured?: Json | null
          blood_type?: string | null
          business_name?: string | null
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
          employer_years?: string | null
          family_history?: Json | null
          first_name?: string | null
          gender?: string | null
          general_practitioner?: string | null
          height_cm?: number | null
          highest_education?: string | null
          id?: string
          id_passport_number?: string | null
          industry?: string | null
          is_chronic?: boolean | null
          is_sample?: boolean
          last_name?: string | null
          maiden_name?: string | null
          marital_regime?: string | null
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
          religion?: string | null
          reporting_to_email?: string | null
          same_as_physical?: boolean | null
          self_employed?: string | null
          smoker?: string | null
          smoker_quantity?: string | null
          status?: string
          surgeries?: Json | null
          tax_reference_number?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          allergies_structured?: Json | null
          blood_type?: string | null
          business_name?: string | null
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
          employer_years?: string | null
          family_history?: Json | null
          first_name?: string | null
          gender?: string | null
          general_practitioner?: string | null
          height_cm?: number | null
          highest_education?: string | null
          id?: string
          id_passport_number?: string | null
          industry?: string | null
          is_chronic?: boolean | null
          is_sample?: boolean
          last_name?: string | null
          maiden_name?: string | null
          marital_regime?: string | null
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
          religion?: string | null
          reporting_to_email?: string | null
          same_as_physical?: boolean | null
          self_employed?: string | null
          smoker?: string | null
          smoker_quantity?: string | null
          status?: string
          surgeries?: Json | null
          tax_reference_number?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
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
      documents: {
        Row: {
          ai_analysis: string | null
          ai_analyzed_at: string | null
          attachments: Json
          content: string
          created_at: string
          document_kind: string | null
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
          document_kind?: string | null
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
          document_kind?: string | null
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
            referencedRelation: "clients"
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
            referencedRelation: "clients"
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
            referencedRelation: "clients"
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
      payment_history: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string
          id: string
          payfast_payment_id: string | null
          paypal_transaction_id: string | null
          provider: string | null
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
          payfast_payment_id?: string | null
          paypal_transaction_id?: string | null
          provider?: string | null
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
          payfast_payment_id?: string | null
          paypal_transaction_id?: string | null
          provider?: string | null
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
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          currency: string
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
          currency?: string
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
          currency?: string
          id?: string
          name?: string
          price?: number
          role?: string
          savings?: number | null
          updated_at?: string
        }
        Relationships: []
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
      referral_partners: {
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
            referencedRelation: "clients"
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
            referencedRelation: "clients"
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
          amount: number | null
          billing_cycle: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_trial: boolean | null
          payfast_token: string | null
          paypal_subscription_id: string | null
          plan_type: string
          pricing_id: string | null
          provider: string | null
          status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_terms_at?: string | null
          amount?: number | null
          billing_cycle: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_trial?: boolean | null
          payfast_token?: string | null
          paypal_subscription_id?: string | null
          plan_type: string
          pricing_id?: string | null
          provider?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_terms_at?: string | null
          amount?: number | null
          billing_cycle?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_trial?: boolean | null
          payfast_token?: string | null
          paypal_subscription_id?: string | null
          plan_type?: string
          pricing_id?: string | null
          provider?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
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
          application_id: string | null
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
          owner_role: string | null
          patient_id: string | null
          priority: string
          product: string | null
          proof_url: string | null
          recommendation_id: string | null
          session_id: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
          user_id: string
          vulas_reward: number
          workflow_id: string | null
          workflow_stage: string | null
        }
        Insert: {
          application_id?: string | null
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
          owner_role?: string | null
          patient_id?: string | null
          priority?: string
          product?: string | null
          proof_url?: string | null
          recommendation_id?: string | null
          session_id?: string | null
          status?: string
          task_type?: string
          title: string
          updated_at?: string
          user_id: string
          vulas_reward?: number
          workflow_id?: string | null
          workflow_stage?: string | null
        }
        Update: {
          application_id?: string | null
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
          owner_role?: string | null
          patient_id?: string | null
          priority?: string
          product?: string | null
          proof_url?: string | null
          recommendation_id?: string | null
          session_id?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
          user_id?: string
          vulas_reward?: number
          workflow_id?: string | null
          workflow_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "todos_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "wealth_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "wealth_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "wealth_workflows"
            referencedColumns: ["id"]
          },
        ]
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
      wealth_applications: {
        Row: {
          commission_amount: number | null
          created_at: string
          id: string
          issued_at: string | null
          monthly_premium: number | null
          product: string | null
          provider: string | null
          recommendation_id: string | null
          review_date: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          workflow_id: string
        }
        Insert: {
          commission_amount?: number | null
          created_at?: string
          id?: string
          issued_at?: string | null
          monthly_premium?: number | null
          product?: string | null
          provider?: string | null
          recommendation_id?: string | null
          review_date?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          workflow_id: string
        }
        Update: {
          commission_amount?: number | null
          created_at?: string
          id?: string
          issued_at?: string | null
          monthly_premium?: number | null
          product?: string | null
          provider?: string | null
          recommendation_id?: string | null
          review_date?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wealth_applications_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "wealth_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wealth_applications_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "wealth_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      wealth_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          details: string | null
          id: string
          patient_id: string
          record_id: string | null
          record_type: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          patient_id: string
          record_id?: string | null
          record_type?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          patient_id?: string
          record_id?: string | null
          record_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wealth_audit_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      wealth_claims: {
        Row: {
          application_id: string | null
          attachment_path: string | null
          claim_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          patient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          attachment_path?: string | null
          claim_type: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          patient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          attachment_path?: string | null
          claim_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          patient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wealth_claims_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "wealth_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wealth_claims_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      wealth_client_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string | null
          expires_at: string
          first_name: string
          id: string
          last_name: string
          owner_user_id: string
          patient_id: string
          phone: string | null
          status: string
          token_hash: string
          workflow_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          first_name: string
          id?: string
          last_name: string
          owner_user_id: string
          patient_id: string
          phone?: string | null
          status?: string
          token_hash: string
          workflow_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          first_name?: string
          id?: string
          last_name?: string
          owner_user_id?: string
          patient_id?: string
          phone?: string | null
          status?: string
          token_hash?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wealth_client_invites_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wealth_client_invites_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "wealth_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      wealth_compliance_checks: {
        Row: {
          bank_validation_completed_at: string | null
          bank_validation_required: boolean
          bank_validation_status: string
          created_at: string
          declarations_completed_at: string | null
          declarations_status: string
          health_disclosure_status: string
          id: string
          kyc_fica_completed_at: string | null
          kyc_fica_status: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          bank_validation_completed_at?: string | null
          bank_validation_required?: boolean
          bank_validation_status?: string
          created_at?: string
          declarations_completed_at?: string | null
          declarations_status?: string
          health_disclosure_status?: string
          id?: string
          kyc_fica_completed_at?: string | null
          kyc_fica_status?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          bank_validation_completed_at?: string | null
          bank_validation_required?: boolean
          bank_validation_status?: string
          created_at?: string
          declarations_completed_at?: string | null
          declarations_status?: string
          health_disclosure_status?: string
          id?: string
          kyc_fica_completed_at?: string | null
          kyc_fica_status?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wealth_compliance_checks_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: true
            referencedRelation: "wealth_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      wealth_kyc_checks: {
        Row: {
          aml_result: string | null
          created_at: string
          decided_at: string | null
          id: string
          patient_id: string
          pep_result: string | null
          provider: string
          raw: Json | null
          session_id: string | null
          session_url: string | null
          status: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          aml_result?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          patient_id: string
          pep_result?: string | null
          provider?: string
          raw?: Json | null
          session_id?: string | null
          session_url?: string | null
          status?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          aml_result?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          patient_id?: string
          pep_result?: string | null
          provider?: string
          raw?: Json | null
          session_id?: string | null
          session_url?: string | null
          status?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wealth_kyc_checks_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "wealth_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      wealth_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          patient_id: string
          read_at: string | null
          recommendation_id: string | null
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          patient_id: string
          read_at?: string | null
          recommendation_id?: string | null
          sender_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          patient_id?: string
          read_at?: string | null
          recommendation_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wealth_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wealth_messages_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "wealth_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      wealth_portfolio_holdings: {
        Row: {
          asset_value: number | null
          category: string
          created_at: string
          disability_cover: number | null
          dread_cover: number | null
          id: string
          life_cover: number | null
          parties: string | null
          patient_id: string
          policy_number: string
          premium: number | null
          premium_frequency: string | null
          product: string | null
          provider: string
          raw: Json
          reference: string | null
          source: string
          start_date: string | null
          status: string | null
          synced_at: string
        }
        Insert: {
          asset_value?: number | null
          category?: string
          created_at?: string
          disability_cover?: number | null
          dread_cover?: number | null
          id?: string
          life_cover?: number | null
          parties?: string | null
          patient_id: string
          policy_number: string
          premium?: number | null
          premium_frequency?: string | null
          product?: string | null
          provider: string
          raw?: Json
          reference?: string | null
          source?: string
          start_date?: string | null
          status?: string | null
          synced_at?: string
        }
        Update: {
          asset_value?: number | null
          category?: string
          created_at?: string
          disability_cover?: number | null
          dread_cover?: number | null
          id?: string
          life_cover?: number | null
          parties?: string | null
          patient_id?: string
          policy_number?: string
          premium?: number | null
          premium_frequency?: string | null
          product?: string | null
          provider?: string
          raw?: Json
          reference?: string | null
          source?: string
          start_date?: string | null
          status?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wealth_portfolio_holdings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      wealth_practice_info: {
        Row: {
          business_logo_path: string | null
          complaints_address: string | null
          compliance_email: string | null
          compliance_fax: string | null
          compliance_officer: string | null
          compliance_phone: string | null
          conflict_policy: string | null
          created_at: string
          directors: string | null
          email_primary: string | null
          email_secondary: string | null
          experience_years: number | null
          firm_address: string | null
          firm_phone: string | null
          firm_website: string | null
          fsb_licence: string | null
          fsca_categories: string[]
          fsp_legal_status: string | null
          fsp_logo_path: string | null
          fsp_name: string | null
          id_number: string | null
          phone: string | null
          pi_cover: boolean | null
          planner_name: string | null
          planner_status: string | null
          postal_address: string | null
          product_suppliers: Json
          qualification: string | null
          registration_number: string | null
          remuneration_basis: string | null
          shareholding_statement: string | null
          title: string | null
          top_suppliers: Json
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          business_logo_path?: string | null
          complaints_address?: string | null
          compliance_email?: string | null
          compliance_fax?: string | null
          compliance_officer?: string | null
          compliance_phone?: string | null
          conflict_policy?: string | null
          created_at?: string
          directors?: string | null
          email_primary?: string | null
          email_secondary?: string | null
          experience_years?: number | null
          firm_address?: string | null
          firm_phone?: string | null
          firm_website?: string | null
          fsb_licence?: string | null
          fsca_categories?: string[]
          fsp_legal_status?: string | null
          fsp_logo_path?: string | null
          fsp_name?: string | null
          id_number?: string | null
          phone?: string | null
          pi_cover?: boolean | null
          planner_name?: string | null
          planner_status?: string | null
          postal_address?: string | null
          product_suppliers?: Json
          qualification?: string | null
          registration_number?: string | null
          remuneration_basis?: string | null
          shareholding_statement?: string | null
          title?: string | null
          top_suppliers?: Json
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          business_logo_path?: string | null
          complaints_address?: string | null
          compliance_email?: string | null
          compliance_fax?: string | null
          compliance_officer?: string | null
          compliance_phone?: string | null
          conflict_policy?: string | null
          created_at?: string
          directors?: string | null
          email_primary?: string | null
          email_secondary?: string | null
          experience_years?: number | null
          firm_address?: string | null
          firm_phone?: string | null
          firm_website?: string | null
          fsb_licence?: string | null
          fsca_categories?: string[]
          fsp_legal_status?: string | null
          fsp_logo_path?: string | null
          fsp_name?: string | null
          id_number?: string | null
          phone?: string | null
          pi_cover?: boolean | null
          planner_name?: string | null
          planner_status?: string | null
          postal_address?: string | null
          product_suppliers?: Json
          qualification?: string | null
          registration_number?: string | null
          remuneration_basis?: string | null
          shareholding_statement?: string | null
          title?: string | null
          top_suppliers?: Json
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wealth_quote_specs: {
        Row: {
          created_at: string
          created_by: string
          id: string
          insurers: string[]
          product_type: string
          updated_at: string
          variations: Json
          workflow_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          insurers?: string[]
          product_type: string
          updated_at?: string
          variations?: Json
          workflow_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          insurers?: string[]
          product_type?: string
          updated_at?: string
          variations?: Json
          workflow_id?: string
        }
        Relationships: []
      }
      wealth_quotes: {
        Row: {
          ai_rank: number | null
          ai_reason: string | null
          broker_overridden: boolean
          commentary: string | null
          cover_amount: number | null
          cover_type: string | null
          created_at: string
          created_by: string
          excess: number | null
          id: string
          insurer: string
          method: string
          monthly_premium: number
          product: string
          rank: number | null
          selected: boolean
          updated_at: string
          workflow_id: string
        }
        Insert: {
          ai_rank?: number | null
          ai_reason?: string | null
          broker_overridden?: boolean
          commentary?: string | null
          cover_amount?: number | null
          cover_type?: string | null
          created_at?: string
          created_by?: string
          excess?: number | null
          id?: string
          insurer: string
          method: string
          monthly_premium: number
          product: string
          rank?: number | null
          selected?: boolean
          updated_at?: string
          workflow_id: string
        }
        Update: {
          ai_rank?: number | null
          ai_reason?: string | null
          broker_overridden?: boolean
          commentary?: string | null
          cover_amount?: number | null
          cover_type?: string | null
          created_at?: string
          created_by?: string
          excess?: number | null
          id?: string
          insurer?: string
          method?: string
          monthly_premium?: number
          product?: string
          rank?: number | null
          selected?: boolean
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wealth_quotes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "wealth_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      wealth_recommendations: {
        Row: {
          created_at: string
          created_by: string | null
          decided_at: string | null
          decision_reason: string | null
          id: string
          presented_at: string | null
          quote_expires_at: string | null
          roa_document_id: string | null
          status: string
          summary: string | null
          supersedes_id: string | null
          title: string | null
          updated_at: string
          version: number
          workflow_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decision_reason?: string | null
          id?: string
          presented_at?: string | null
          quote_expires_at?: string | null
          roa_document_id?: string | null
          status?: string
          summary?: string | null
          supersedes_id?: string | null
          title?: string | null
          updated_at?: string
          version?: number
          workflow_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decision_reason?: string | null
          id?: string
          presented_at?: string | null
          quote_expires_at?: string | null
          roa_document_id?: string | null
          status?: string
          summary?: string | null
          supersedes_id?: string | null
          title?: string | null
          updated_at?: string
          version?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wealth_recommendations_roa_document_id_fkey"
            columns: ["roa_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wealth_recommendations_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "wealth_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wealth_recommendations_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "wealth_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      wealth_signed_documents: {
        Row: {
          content_hash: string
          content_html: string
          created_at: string
          doc_type: string
          id: string
          patient_id: string
          seal_hash: string
          signature_image: string
          signed_at: string
          signer_ip: string | null
          signer_name: string
          signer_user_id: string
          title: string
          user_agent: string | null
          version: number
          workflow_id: string
        }
        Insert: {
          content_hash: string
          content_html: string
          created_at?: string
          doc_type: string
          id?: string
          patient_id: string
          seal_hash: string
          signature_image: string
          signed_at?: string
          signer_ip?: string | null
          signer_name: string
          signer_user_id: string
          title: string
          user_agent?: string | null
          version?: number
          workflow_id: string
        }
        Update: {
          content_hash?: string
          content_html?: string
          created_at?: string
          doc_type?: string
          id?: string
          patient_id?: string
          seal_hash?: string
          signature_image?: string
          signed_at?: string
          signer_ip?: string | null
          signer_name?: string
          signer_user_id?: string
          title?: string
          user_agent?: string | null
          version?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wealth_signed_documents_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "wealth_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      wealth_targets: {
        Row: {
          annual_commission_target: number
          annual_policies_target: number
          annual_premium_target: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          annual_commission_target?: number
          annual_policies_target?: number
          annual_premium_target?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          annual_commission_target?: number
          annual_policies_target?: number
          annual_premium_target?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      wealth_team_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          owner_user_id: string
          role: Database["public"]["Enums"]["user_role"]
          status: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name: string
          id?: string
          owner_user_id: string
          role: Database["public"]["Enums"]["user_role"]
          status?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          owner_user_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          token_hash?: string
        }
        Relationships: []
      }
      wealth_workflow_stage_defs: {
        Row: {
          dependencies: string[]
          label: string
          next_stages: string[]
          owner_role: string
          position: number
          required_documents: string[]
          required_info: string[]
          stage: string
        }
        Insert: {
          dependencies?: string[]
          label: string
          next_stages?: string[]
          owner_role: string
          position: number
          required_documents?: string[]
          required_info?: string[]
          stage: string
        }
        Update: {
          dependencies?: string[]
          label?: string
          next_stages?: string[]
          owner_role?: string
          position?: number
          required_documents?: string[]
          required_info?: string[]
          stage?: string
        }
        Relationships: []
      }
      wealth_workflow_transitions: {
        Row: {
          actor_type: string
          actor_user_id: string | null
          created_at: string
          decision: string | null
          from_stage: string | null
          id: string
          reason: string | null
          related_record_id: string | null
          related_record_type: string | null
          to_stage: string
          workflow_id: string
        }
        Insert: {
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          decision?: string | null
          from_stage?: string | null
          id?: string
          reason?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          to_stage: string
          workflow_id: string
        }
        Update: {
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          decision?: string | null
          from_stage?: string | null
          id?: string
          reason?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          to_stage?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wealth_workflow_transitions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "wealth_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      wealth_workflows: {
        Row: {
          annual_review_appointment_id: string | null
          blockers: Json
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          consultation_session_id: string | null
          created_at: string
          current_stage: string
          cycle_number: number
          id: string
          next_review_date: string | null
          owner_user_id: string
          patient_id: string
          paused_at: string | null
          paused_by: string | null
          practice_id: string | null
          previous_workflow_id: string | null
          status: string
          total_paused_seconds: number
          updated_at: string
        }
        Insert: {
          annual_review_appointment_id?: string | null
          blockers?: Json
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          consultation_session_id?: string | null
          created_at?: string
          current_stage?: string
          cycle_number?: number
          id?: string
          next_review_date?: string | null
          owner_user_id?: string
          patient_id: string
          paused_at?: string | null
          paused_by?: string | null
          practice_id?: string | null
          previous_workflow_id?: string | null
          status?: string
          total_paused_seconds?: number
          updated_at?: string
        }
        Update: {
          annual_review_appointment_id?: string | null
          blockers?: Json
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          consultation_session_id?: string | null
          created_at?: string
          current_stage?: string
          cycle_number?: number
          id?: string
          next_review_date?: string | null
          owner_user_id?: string
          patient_id?: string
          paused_at?: string | null
          paused_by?: string | null
          practice_id?: string | null
          previous_workflow_id?: string | null
          status?: string
          total_paused_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wealth_workflows_consultation_session_id_fkey"
            columns: ["consultation_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wealth_workflows_current_stage_fkey"
            columns: ["current_stage"]
            isOneToOne: false
            referencedRelation: "wealth_workflow_stage_defs"
            referencedColumns: ["stage"]
          },
          {
            foreignKeyName: "wealth_workflows_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wealth_workflows_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wealth_workflows_previous_workflow_id_fkey"
            columns: ["previous_workflow_id"]
            isOneToOne: false
            referencedRelation: "wealth_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
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
      is_hospital_member: { Args: { _hospital_id: string }; Returns: boolean }
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
      wealth_apply_stage: {
        Args: {
          _actor: string
          _blockers: Json
          _decision: string
          _reason: string
          _rid: string
          _rtype: string
          _stage: string
          _workflow_id: string
        }
        Returns: undefined
      }
      wealth_assert_access: {
        Args: { _workflow_id: string }
        Returns: Record<string, unknown>
      }
      wealth_audit: {
        Args: {
          _action: string
          _details: string
          _id: string
          _patient: string
          _type: string
        }
        Returns: undefined
      }
      wealth_blockers: {
        Args: { _target_stage: string; _workflow_id: string }
        Returns: Json
      }
      wealth_cancel_workflow: {
        Args: { _reason: string; _workflow_id: string }
        Returns: undefined
      }
      wealth_derive_stage: { Args: { _workflow_id: string }; Returns: Json }
      wealth_financials_verify: {
        Args: { _patient_id: string }
        Returns: boolean
      }
      wealth_has_doc: { Args: { _kind: string; _wf: string }; Returns: boolean }
      wealth_is_party: {
        Args: { _patient: string; _uid: string }
        Returns: boolean
      }
      wealth_is_workflow_owner: {
        Args: { _uid: string; _wf: string }
        Returns: boolean
      }
      wealth_is_workflow_party: {
        Args: { _uid: string; _wf: string }
        Returns: boolean
      }
      wealth_messages_mark_read: {
        Args: { _patient: string }
        Returns: undefined
      }
      wealth_onboarding_refresh: {
        Args: { _workflow_id: string }
        Returns: boolean
      }
      wealth_present_recommendation: {
        Args: { _recommendation_id: string }
        Returns: Json
      }
      wealth_record_decision: {
        Args: {
          _decision: string
          _reason?: string
          _recommendation_id: string
        }
        Returns: Json
      }
      wealth_refresh: {
        Args: { _rid?: string; _rtype?: string; _workflow_id: string }
        Returns: Json
      }
      wealth_send_reminder: { Args: { _todo_id: string }; Returns: boolean }
      wealth_set_workflow_paused: {
        Args: { _paused: boolean; _workflow_id: string }
        Returns: Json
      }
      wealth_start_annual_review: {
        Args: {
          _appointment_id?: string
          _session_id?: string
          _workflow_id: string
        }
        Returns: string
      }
      wealth_start_workflow: {
        Args: { _patient_id: string; _session_id?: string }
        Returns: string
      }
      wealth_transition: {
        Args: { _reason?: string; _to_stage: string; _workflow_id: string }
        Returns: Json
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
      integration_category:
        | "insurance"
        | "crm_planning"
        | "industry_portal"
        | "financial_service_provider"
      integration_status: "configured" | "pending" | "inactive"
      invitation_status: "pending" | "accepted" | "declined" | "expired"
      user_role:
        | "broker"
        | "client"
        | "admin"
        | "hospital_staff"
        | "ambulance_staff"
        | "blood_bank"
        | "pharmacy_staff"
        | "nurse"
        | "insurer_staff"
        | "referral_agent"
        | "fsp"
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
      integration_category: [
        "insurance",
        "crm_planning",
        "industry_portal",
        "financial_service_provider",
      ],
      integration_status: ["configured", "pending", "inactive"],
      invitation_status: ["pending", "accepted", "declined", "expired"],
      user_role: [
        "broker",
        "client",
        "admin",
        "hospital_staff",
        "ambulance_staff",
        "blood_bank",
        "pharmacy_staff",
        "nurse",
        "insurer_staff",
        "referral_agent",
        "fsp",
      ],
    },
  },
} as const
