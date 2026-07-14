// Auto-generate this file with:
//   pnpm supabase gen types typescript --linked > lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      admin_invites: {
        Row: {
          id: string;
          email: string;
          role: string;
          token_hash: string;
          status: string;
          invited_by: string;
          created_at: string;
          expires_at: string;
          accepted_at: string | null;
          created_user_id: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          role?: string;
          token_hash: string;
          status?: string;
          invited_by: string;
          created_at?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_user_id?: string | null;
        };
        Update: {
          email?: string;
          role?: string;
          token_hash?: string;
          status?: string;
          invited_by?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_user_id?: string | null;
        };
        Relationships: [];
      };
      admin_credentials: {
        Row: {
          user_id: string;
          password_cipher: string;
          set_by: string;
          set_at: string;
        };
        Insert: {
          user_id: string;
          password_cipher: string;
          set_by: string;
          set_at?: string;
        };
        Update: {
          password_cipher?: string;
          set_by?: string;
          set_at?: string;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      gallery_photos: {
        Row: {
          id: string;
          storage_path: string;
          caption_top_left: string | null;
          caption_bottom_right: string | null;
          sort_order: number;
          published: boolean;
          created_at: string;
          updated_at: string;
          source_submission_id: string | null;
        };
        Insert: {
          id?: string;
          storage_path: string;
          caption_top_left?: string | null;
          caption_bottom_right?: string | null;
          sort_order?: number;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
          source_submission_id?: string | null;
        };
        Update: {
          storage_path?: string;
          caption_top_left?: string | null;
          caption_bottom_right?: string | null;
          sort_order?: number;
          published?: boolean;
          updated_at?: string;
          source_submission_id?: string | null;
        };
        Relationships: [];
      };
      practitioners: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          role: string;
          org: string | null;
          city: string;
          state: string | null;
          experience: string;
          modules: string[];
          teach_freq: string | null;
          why: string | null;
          upi_id: string | null;
          bank_name: string | null;
          bank_account: string | null;
          ifsc: string | null;
          pay_to_family: boolean;
          family_name: string | null;
          family_relation: string | null;
          family_upi: string | null;
          family_bank: string | null;
          family_ifsc: string | null;
          pan_gst: string | null;
          communication_address: string | null;
          tshirt_size: string | null;
          status: string;
          prev_status: string | null;
          prev_active_status: string | null;
          ref_code: string | null;
          avg_rating: number;
          feedback_count: number;
          under_review_at: string | null;
          screened_at: string | null;
          agreement_sent_at: string | null;
          empanelled_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          role: string;
          org?: string | null;
          city: string;
          state?: string | null;
          experience: string;
          modules: string[];
          teach_freq?: string | null;
          why?: string | null;
          upi_id?: string | null;
          bank_name?: string | null;
          bank_account?: string | null;
          ifsc?: string | null;
          pay_to_family?: boolean;
          family_name?: string | null;
          family_relation?: string | null;
          family_upi?: string | null;
          family_bank?: string | null;
          family_ifsc?: string | null;
          pan_gst?: string | null;
          communication_address?: string | null;
          tshirt_size?: string | null;
          prev_status?: string | null;
          prev_active_status?: string | null;
          status?: string;
          ref_code?: string | null;
          avg_rating?: number;
          feedback_count?: number;
          under_review_at?: string | null;
          screened_at?: string | null;
          agreement_sent_at?: string | null;
          empanelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          role?: string;
          org?: string | null;
          city?: string;
          state?: string | null;
          experience?: string;
          modules?: string[];
          teach_freq?: string | null;
          why?: string | null;
          upi_id?: string | null;
          bank_name?: string | null;
          bank_account?: string | null;
          ifsc?: string | null;
          pay_to_family?: boolean;
          family_name?: string | null;
          family_relation?: string | null;
          family_upi?: string | null;
          family_bank?: string | null;
          family_ifsc?: string | null;
          pan_gst?: string | null;
          communication_address?: string | null;
          tshirt_size?: string | null;
          prev_status?: string | null;
          prev_active_status?: string | null;
          status?: string;
          ref_code?: string | null;
          avg_rating?: number;
          feedback_count?: number;
          under_review_at?: string | null;
          screened_at?: string | null;
          agreement_sent_at?: string | null;
          empanelled_at?: string | null;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      session_feedback: {
        Row: {
          id: string;
          session_id: string;
          practitioner_id: string;
          overall_rating: number | null;
          subsections: Json | null;
          comments: string | null;
          collected_by: string | null;
          collected_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          practitioner_id: string;
          overall_rating?: number | null;
          subsections?: Json | null;
          comments?: string | null;
          collected_by?: string | null;
          collected_at?: string;
          updated_at?: string;
        };
        Update: {
          overall_rating?: number | null;
          subsections?: Json | null;
          comments?: string | null;
          collected_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_feedback_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_feedback_practitioner_id_fkey";
            columns: ["practitioner_id"];
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          }
        ];
      };
      session_requests: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          city: string | null;
          state: string | null;
          org: string | null;
          org_name: string | null;
          topic: string;
          audience_type: string;
          group_size: string | null;
          min_commit: number | null;
          venue: string | null;
          preferred_dates: string | null;
          notes: string | null;
          spoc_declaration: boolean;
          status: string;
          assigned_to: string | null;
          created_at: string;
          updated_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          city?: string | null;
          state?: string | null;
          org?: string | null;
          org_name?: string | null;
          topic: string;
          audience_type: string;
          group_size?: string | null;
          min_commit?: number | null;
          venue?: string | null;
          preferred_dates?: string | null;
          notes?: string | null;
          spoc_declaration?: boolean;
          status?: string;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          name?: string;
          email?: string;
          phone?: string | null;
          city?: string | null;
          state?: string | null;
          org?: string | null;
          org_name?: string | null;
          topic?: string;
          audience_type?: string;
          group_size?: string | null;
          min_commit?: number | null;
          venue?: string | null;
          preferred_dates?: string | null;
          notes?: string | null;
          spoc_declaration?: boolean;
          status?: string;
          assigned_to?: string | null;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "session_requests_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          }
        ];
      };
      sessions: {
        Row: {
          id: string;
          ref_code: string;
          module: string;
          practitioner_id: string;
          session_date: string;
          start_time: string;
          end_time: string;
          venue: string;
          audience_type: string;
          participants: number;
          payout_amount: number;
          tds_applicable: boolean;
          tds_rate: number | null;
          consent_status: string;
          status: string;
          request_id: string | null;
          created_at: string;
          updated_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          ref_code: string;
          module: string;
          practitioner_id: string;
          session_date: string;
          start_time: string;
          end_time: string;
          venue: string;
          audience_type: string;
          participants: number;
          payout_amount: number;
          tds_applicable?: boolean;
          tds_rate?: number | null;
          consent_status?: string;
          status?: string;
          request_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          ref_code?: string;
          module?: string;
          practitioner_id?: string;
          session_date?: string;
          start_time?: string;
          end_time?: string;
          venue?: string;
          audience_type?: string;
          participants?: number;
          payout_amount?: number;
          tds_applicable?: boolean;
          tds_rate?: number | null;
          consent_status?: string;
          status?: string;
          request_id?: string | null;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          }
        ];
      };
      agreements: {
        Row: {
          id: string;
          practitioner_id: string;
          ref_code: string;
          module: string;
          signed_at: string | null;
          signature_method: string | null;
          signature_data: string | null;
          signer_ip: string | null;
          status: string;
          storage_path: string | null;
          created_at: string;
          updated_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          practitioner_id: string;
          ref_code: string;
          module: string;
          signed_at?: string | null;
          signature_method?: string | null;
          signature_data?: string | null;
          signer_ip?: string | null;
          status?: string;
          storage_path?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          practitioner_id?: string;
          ref_code?: string;
          module?: string;
          signed_at?: string | null;
          signature_method?: string | null;
          signature_data?: string | null;
          signer_ip?: string | null;
          status?: string;
          storage_path?: string | null;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agreements_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          }
        ];
      };
      payouts: {
        Row: {
          id: string;
          session_id: string;
          practitioner_id: string;
          invoice_ref: string;
          gross_amount: number;
          net_amount: number;
          tds_rate: number | null;
          payment_method: string | null;
          pay_to: string | null;
          paid_at: string | null;
          status: string;
          created_at: string;
          updated_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          practitioner_id: string;
          invoice_ref: string;
          gross_amount: number;
          net_amount: number;
          tds_rate?: number | null;
          payment_method?: string | null;
          pay_to?: string | null;
          paid_at?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          session_id?: string;
          practitioner_id?: string;
          invoice_ref?: string;
          gross_amount?: number;
          net_amount?: number;
          tds_rate?: number | null;
          payment_method?: string | null;
          pay_to?: string | null;
          paid_at?: string | null;
          status?: string;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payouts_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payouts_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          }
        ];
      };
      confirmations: {
        Row: {
          id: string;
          ref_code: string;
          session_id: string;
          practitioner_id: string;
          session_ref: string;
          gross_amount: number;
          tds_rate: number;
          gst_rate: number;
          net_amount: number;
          snapshot: Json;
          consent_link: string | null;
          signed_at: string | null;
          signature_method: string | null;
          signature_data: string | null;
          signer_ip: string | null;
          storage_path: string | null;
          status: string;
          email_status: string;
          email_last_attempt_at: string | null;
          issued_on: string;
          created_at: string;
          updated_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          ref_code: string;
          session_id: string;
          practitioner_id: string;
          session_ref: string;
          gross_amount: number;
          tds_rate?: number;
          gst_rate?: number;
          net_amount: number;
          snapshot: Json;
          consent_link?: string | null;
          signed_at?: string | null;
          signature_method?: string | null;
          signature_data?: string | null;
          signer_ip?: string | null;
          storage_path?: string | null;
          status?: string;
          email_status?: string;
          email_last_attempt_at?: string | null;
          issued_on?: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          ref_code?: string;
          session_id?: string;
          practitioner_id?: string;
          session_ref?: string;
          gross_amount?: number;
          tds_rate?: number;
          gst_rate?: number;
          net_amount?: number;
          snapshot?: Json;
          consent_link?: string | null;
          signed_at?: string | null;
          signature_method?: string | null;
          signature_data?: string | null;
          signer_ip?: string | null;
          storage_path?: string | null;
          status?: string;
          email_status?: string;
          email_last_attempt_at?: string | null;
          issued_on?: string;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "confirmations_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "confirmations_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          }
        ];
      };
      onboarding_tokens: {
        Row: {
          id: string;
          practitioner_id: string;
          token: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          practitioner_id: string;
          token: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          practitioner_id?: string;
          token?: string;
          expires_at?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_tokens_practitioner_id_fkey";
            columns: ["practitioner_id"];
            isOneToOne: false;
            referencedRelation: "practitioners";
            referencedColumns: ["id"];
          }
        ];
      };
      photo_submissions: {
        Row: {
          id: string;
          practitioner_ref: string;
          session_ref: string;
          module: string;
          city: string;
          state: string;
          org: string | null;
          submitted_at: string;
          expiry_date: string;
          photo_count: number;
          storage_keys: string[];
          participant_consent: boolean;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practitioner_ref: string;
          session_ref: string;
          module: string;
          city: string;
          state: string;
          org?: string | null;
          submitted_at?: string;
          expiry_date: string;
          photo_count: number;
          storage_keys?: string[];
          participant_consent: boolean;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          practitioner_ref?: string;
          session_ref?: string;
          module?: string;
          city?: string;
          state?: string;
          org?: string | null;
          submitted_at?: string;
          expiry_date?: string;
          photo_count?: number;
          storage_keys?: string[];
          participant_consent?: boolean;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sent_emails: {
        Row: {
          id: string;
          idempotency_key: string;
          email_type: string;
          recipient_email: string;
          entity_id: string;
          brevo_message_id: string | null;
          status: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          idempotency_key: string;
          email_type: string;
          recipient_email: string;
          entity_id: string;
          brevo_message_id?: string | null;
          status?: string;
          sent_at?: string;
        };
        Update: {
          idempotency_key?: string;
          email_type?: string;
          recipient_email?: string;
          entity_id?: string;
          brevo_message_id?: string | null;
          status?: string;
          sent_at?: string;
        };
        Relationships: [];
      };
      admin_audit_log: {
        Row: {
          id: string;
          actor_email: string;
          actor_role: string;
          action: string;
          record_table: string;
          record_id: string;
          snapshot: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_email: string;
          actor_role?: string;
          action: string;
          record_table: string;
          record_id: string;
          snapshot?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          actor_email?: string;
          actor_role?: string;
          action?: string;
          record_table?: string;
          record_id?: string;
          snapshot?: Record<string, unknown> | null;
        };
        Relationships: [];
      };
    };
    Views: {
      practitioner_subsection_averages: {
        Row: {
          practitioner_id: string;
          content_avg: number | null;
          delivery_avg: number | null;
          engagement_avg: number | null;
          logistics_avg: number | null;
          rated_sessions: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      next_practitioner_ref: {
        Args: Record<string, never>;
        Returns: string;
      };
      purge_soft_deleted: {
        Args: { retention?: string };
        Returns: { table_name: string; purged: number }[];
      };
    };
    Enums: Record<string, never>;
  };
}
