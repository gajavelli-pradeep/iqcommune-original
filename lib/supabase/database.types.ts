// Auto-generate this file with:
//   pnpm supabase gen types typescript --linked > lib/supabase/database.types.ts
// Placeholder types until Supabase project is linked.

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
          consent_operational: boolean;
          consent_nosell: boolean;
          consent_employer: boolean;
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
          consent_operational?: boolean;
          consent_nosell?: boolean;
          consent_employer?: boolean;
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
          consent_operational?: boolean;
          consent_nosell?: boolean;
          consent_employer?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      session_requests: {
        Row: {
          id: string;
          name: string;
          org: string;
          email: string;
          phone: string | null;
          topic: string;
          audience_type: string;
          group_size: string;
          min_commit: number;
          venue: string | null;
          preferred_dates: string;
          status: string;
          assigned_to: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          org: string;
          email: string;
          phone?: string | null;
          topic: string;
          audience_type: string;
          group_size: string;
          min_commit: number;
          venue?: string | null;
          preferred_dates: string;
          status?: string;
          assigned_to?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          org?: string;
          email?: string;
          phone?: string | null;
          topic?: string;
          audience_type?: string;
          group_size?: string;
          min_commit?: number;
          venue?: string | null;
          preferred_dates?: string;
          status?: string;
          assigned_to?: string | null;
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
          payment_method: string | null;
          paid_at: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          practitioner_id: string;
          invoice_ref: string;
          gross_amount: number;
          net_amount: number;
          payment_method?: string | null;
          paid_at?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          session_id?: string;
          practitioner_id?: string;
          invoice_ref?: string;
          gross_amount?: number;
          net_amount?: number;
          payment_method?: string | null;
          paid_at?: string | null;
          status?: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
