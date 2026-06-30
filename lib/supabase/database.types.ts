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
          status: string;
          ref_code: string | null;
          avg_rating: number;
          feedback_count: number;
          created_at: string;
          updated_at: string;
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
          status?: string;
          ref_code?: string | null;
          avg_rating?: number;
          feedback_count?: number;
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
          status?: string;
          ref_code?: string | null;
          avg_rating?: number;
          feedback_count?: number;
          updated_at?: string;
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
        };
        Relationships: [];
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
          paid_at: string | null;
          status: string;
          created_at: string;
          updated_at: string | null;
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
          paid_at?: string | null;
          status?: string;
          updated_at?: string | null;
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
      super_admin_audit_log: {
        Row: {
          id: string;
          actor_email: string;
          action: string;
          record_table: string;
          record_id: string;
          snapshot: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_email: string;
          action: string;
          record_table: string;
          record_id: string;
          snapshot?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          actor_email?: string;
          action?: string;
          record_table?: string;
          record_id?: string;
          snapshot?: Record<string, unknown> | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
