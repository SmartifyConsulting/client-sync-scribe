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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
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
        ]
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
      doctor_access_requests: {
        Row: {
          created_at: string
          doctor_practice_number: string
          doctor_registration_number: string
          id: string
          patient_user_id: string
          status: Database["public"]["Enums"]["invitation_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_practice_number: string
          doctor_registration_number: string
          id?: string
          patient_user_id: string
          status?: Database["public"]["Enums"]["invitation_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_practice_number?: string
          doctor_registration_number?: string
          id?: string
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
      doctor_rewards: {
        Row: {
          awarded_at: string | null
          description: string | null
          doctor_id: string
          id: string
          moolas_count: number
          reference_id: string | null
          reward_type: string
        }
        Insert: {
          awarded_at?: string | null
          description?: string | null
          doctor_id: string
          id?: string
          moolas_count?: number
          reference_id?: string | null
          reward_type: string
        }
        Update: {
          awarded_at?: string | null
          description?: string | null
          doctor_id?: string
          id?: string
          moolas_count?: number
          reference_id?: string | null
          reward_type?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          ai_analysis: string | null
          ai_analyzed_at: string | null
          content: string
          created_at: string
          email_sent_at: string | null
          id: string
          is_draft: boolean | null
          media_type: string | null
          media_url: string | null
          name: string
          patient_id: string | null
          patient_name: string | null
          session_id: string | null
          template_id: string | null
          template_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: string | null
          ai_analyzed_at?: string | null
          content: string
          created_at?: string
          email_sent_at?: string | null
          id?: string
          is_draft?: boolean | null
          media_type?: string | null
          media_url?: string | null
          name: string
          patient_id?: string | null
          patient_name?: string | null
          session_id?: string | null
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: string | null
          ai_analyzed_at?: string | null
          content?: string
          created_at?: string
          email_sent_at?: string | null
          id?: string
          is_draft?: boolean | null
          media_type?: string | null
          media_url?: string | null
          name?: string
          patient_id?: string | null
          patient_name?: string | null
          session_id?: string | null
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
      emoticon_messages: {
        Row: {
          created_at: string | null
          emoticon: string
          id: string
          is_ai_flagged: boolean | null
          moolas_awarded: number | null
          patient_id: string
          profile_viewed: boolean | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          emoticon: string
          id?: string
          is_ai_flagged?: boolean | null
          moolas_awarded?: number | null
          patient_id: string
          profile_viewed?: boolean | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          emoticon?: string
          id?: string
          is_ai_flagged?: boolean | null
          moolas_awarded?: number | null
          patient_id?: string
          profile_viewed?: boolean | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emoticon_messages_patient_id_fkey"
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
      medication_adherence: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          prescription_id: string
          proof_url: string | null
          scheduled_date: string
          status: string
          taken_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          prescription_id: string
          proof_url?: string | null
          scheduled_date: string
          status?: string
          taken_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          prescription_id?: string
          proof_url?: string | null
          scheduled_date?: string
          status?: string
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
      moola_adherence_configs: {
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
      moola_partner_apps: {
        Row: {
          app_store_url: string | null
          created_at: string
          creator: string | null
          google_play_url: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          signup_url: string | null
        }
        Insert: {
          app_store_url?: string | null
          created_at?: string
          creator?: string | null
          google_play_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          signup_url?: string | null
        }
        Update: {
          app_store_url?: string | null
          created_at?: string
          creator?: string | null
          google_play_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          signup_url?: string | null
        }
        Relationships: []
      }
      moola_transfers: {
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
            foreignKeyName: "moola_transfers_partner_app_id_fkey"
            columns: ["partner_app_id"]
            isOneToOne: false
            referencedRelation: "moola_partner_apps"
            referencedColumns: ["id"]
          },
        ]
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
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          blood_type: string | null
          chronic_medications: string | null
          claims_email: string | null
          created_at: string
          current_medications: Json | null
          dob: string | null
          email: string | null
          employer: string | null
          family_history: Json | null
          first_name: string | null
          gender: string | null
          general_practitioner: string | null
          height_cm: number | null
          ice_contacts: Json | null
          id: string
          id_passport_number: string | null
          is_chronic: boolean | null
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
          blood_type?: string | null
          chronic_medications?: string | null
          claims_email?: string | null
          created_at?: string
          current_medications?: Json | null
          dob?: string | null
          email?: string | null
          employer?: string | null
          family_history?: Json | null
          first_name?: string | null
          gender?: string | null
          general_practitioner?: string | null
          height_cm?: number | null
          ice_contacts?: Json | null
          id?: string
          id_passport_number?: string | null
          is_chronic?: boolean | null
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
          blood_type?: string | null
          chronic_medications?: string | null
          claims_email?: string | null
          created_at?: string
          current_medications?: Json | null
          dob?: string | null
          email?: string | null
          employer?: string | null
          family_history?: Json | null
          first_name?: string | null
          gender?: string | null
          general_practitioner?: string | null
          height_cm?: number | null
          ice_contacts?: Json | null
          id?: string
          id_passport_number?: string | null
          is_chronic?: boolean | null
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
      prescriptions: {
        Row: {
          created_at: string
          doctor_id: string
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          instructions: string | null
          medication: string
          patient_id: string
          refills_remaining: number | null
          session_id: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          dosage: string
          end_date?: string | null
          frequency: string
          id?: string
          instructions?: string | null
          medication: string
          patient_id: string
          refills_remaining?: number | null
          session_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          medication?: string
          patient_id?: string
          refills_remaining?: number | null
          session_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
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
      profile_view_log: {
        Row: {
          id: string
          patient_id: string
          viewed_at: string | null
          viewer_id: string
        }
        Insert: {
          id?: string
          patient_id: string
          viewed_at?: string | null
          viewer_id: string
        }
        Update: {
          id?: string
          patient_id?: string
          viewed_at?: string | null
          viewer_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auto_email_certificate_to_employer: boolean | null
          auto_email_invoice_to_insurance: boolean | null
          auto_email_prescription_to_pharmacy: boolean | null
          avatar_url: string | null
          chronic_med_notification_frequency: string | null
          country: string | null
          created_at: string
          doctor_number: string | null
          full_name: string | null
          id: string
          inactive_threshold_months: number | null
          logo_url: string | null
          mailbox_alias: string | null
          mailbox_id: string
          mobile_number: string | null
          narration_voice: string | null
          practice_address: string | null
          practice_number: string | null
          preferred_language: string | null
          preferred_languages: string[] | null
          role: Database["public"]["Enums"]["user_role"] | null
          round_table_enabled: boolean | null
          signature_bold: boolean | null
          signature_color: string | null
          signature_font: string | null
          signature_font_size: number | null
          signature_italic: boolean | null
          signature_url: string | null
          specialty: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          auto_email_certificate_to_employer?: boolean | null
          auto_email_invoice_to_insurance?: boolean | null
          auto_email_prescription_to_pharmacy?: boolean | null
          avatar_url?: string | null
          chronic_med_notification_frequency?: string | null
          country?: string | null
          created_at?: string
          doctor_number?: string | null
          full_name?: string | null
          id: string
          inactive_threshold_months?: number | null
          logo_url?: string | null
          mailbox_alias?: string | null
          mailbox_id?: string
          mobile_number?: string | null
          narration_voice?: string | null
          practice_address?: string | null
          practice_number?: string | null
          preferred_language?: string | null
          preferred_languages?: string[] | null
          role?: Database["public"]["Enums"]["user_role"] | null
          round_table_enabled?: boolean | null
          signature_bold?: boolean | null
          signature_color?: string | null
          signature_font?: string | null
          signature_font_size?: number | null
          signature_italic?: boolean | null
          signature_url?: string | null
          specialty?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          auto_email_certificate_to_employer?: boolean | null
          auto_email_invoice_to_insurance?: boolean | null
          auto_email_prescription_to_pharmacy?: boolean | null
          avatar_url?: string | null
          chronic_med_notification_frequency?: string | null
          country?: string | null
          created_at?: string
          doctor_number?: string | null
          full_name?: string | null
          id?: string
          inactive_threshold_months?: number | null
          logo_url?: string | null
          mailbox_alias?: string | null
          mailbox_id?: string
          mobile_number?: string | null
          narration_voice?: string | null
          practice_address?: string | null
          practice_number?: string | null
          preferred_language?: string | null
          preferred_languages?: string[] | null
          role?: Database["public"]["Enums"]["user_role"] | null
          round_table_enabled?: boolean | null
          signature_bold?: boolean | null
          signature_color?: string | null
          signature_font?: string | null
          signature_font_size?: number | null
          signature_italic?: boolean | null
          signature_url?: string | null
          specialty?: string | null
          status?: string | null
          updated_at?: string
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
          audio_url: string | null
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          notes: string | null
          patient_id: string
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
          audio_url?: string | null
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          patient_id: string
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
          audio_url?: string | null
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
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
      templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          description: string | null
          font_family: string | null
          header_footer_template_id: string | null
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
          header_footer_template_id?: string | null
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
          header_footer_template_id?: string | null
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
            foreignKeyName: "templates_header_footer_template_id_fkey"
            columns: ["header_footer_template_id"]
            isOneToOne: false
            referencedRelation: "header_footer_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          document_id: string | null
          due_date: string | null
          id: string
          is_auto_executed: boolean | null
          moolas_reward: number
          patient_id: string | null
          priority: string
          proof_url: string | null
          session_id: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          id?: string
          is_auto_executed?: boolean | null
          moolas_reward?: number
          patient_id?: string | null
          priority?: string
          proof_url?: string | null
          session_id?: string | null
          status?: string
          task_type?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          id?: string
          is_auto_executed?: boolean | null
          moolas_reward?: number
          patient_id?: string | null
          priority?: string
          proof_url?: string | null
          session_id?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
          role: string
          status: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      access_permission:
        | "patient_info"
        | "calendar"
        | "session_summaries"
        | "prescription_history"
      invitation_status: "pending" | "accepted" | "declined" | "expired"
      user_role: "doctor" | "patient" | "admin"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      invitation_status: ["pending", "accepted", "declined", "expired"],
      user_role: ["doctor", "patient", "admin"],
    },
  },
} as const
