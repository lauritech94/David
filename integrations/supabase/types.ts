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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      action_center: {
        Row: {
          amount: number | null
          artist_id: string | null
          assigned_to: string | null
          attachments: Json | null
          booking_id: string | null
          budget_id: string | null
          conditions: string | null
          created_at: string
          created_by: string
          currency: string | null
          deadline: string | null
          decided_at: string | null
          decided_by: string | null
          decision_comment: string | null
          description: string | null
          id: string
          item_type: Database["public"]["Enums"]["action_item_type"]
          metadata: Json | null
          priority: Database["public"]["Enums"]["action_item_priority"]
          project_id: string | null
          requested_date: string | null
          requester_company: string | null
          requester_email: string | null
          requester_name: string | null
          status: Database["public"]["Enums"]["action_item_status"]
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          artist_id?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          booking_id?: string | null
          budget_id?: string | null
          conditions?: string | null
          created_at?: string
          created_by: string
          currency?: string | null
          deadline?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_comment?: string | null
          description?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["action_item_type"]
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["action_item_priority"]
          project_id?: string | null
          requested_date?: string | null
          requester_company?: string | null
          requester_email?: string | null
          requester_name?: string | null
          status?: Database["public"]["Enums"]["action_item_status"]
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          artist_id?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          booking_id?: string | null
          budget_id?: string | null
          conditions?: string | null
          created_at?: string
          created_by?: string
          currency?: string | null
          deadline?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_comment?: string | null
          description?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["action_item_type"]
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["action_item_priority"]
          project_id?: string | null
          requested_date?: string | null
          requester_company?: string | null
          requester_email?: string | null
          requester_name?: string | null
          status?: Database["public"]["Enums"]["action_item_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_center_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_center_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_center_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_center_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "action_center_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      action_center_comments: {
        Row: {
          action_id: string
          author_id: string
          created_at: string
          id: string
          is_system: boolean | null
          message: string
        }
        Insert: {
          action_id: string
          author_id: string
          created_at?: string
          id?: string
          is_system?: boolean | null
          message: string
        }
        Update: {
          action_id?: string
          author_id?: string
          created_at?: string
          id?: string
          is_system?: boolean | null
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_center_comments_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "action_center"
            referencedColumns: ["id"]
          },
        ]
      }
      action_center_history: {
        Row: {
          action_id: string
          changed_by: string
          changes: Json | null
          created_at: string
          event_type: string
          from_status: Database["public"]["Enums"]["action_item_status"] | null
          id: string
          to_status: Database["public"]["Enums"]["action_item_status"] | null
        }
        Insert: {
          action_id: string
          changed_by: string
          changes?: Json | null
          created_at?: string
          event_type: string
          from_status?: Database["public"]["Enums"]["action_item_status"] | null
          id?: string
          to_status?: Database["public"]["Enums"]["action_item_status"] | null
        }
        Update: {
          action_id?: string
          changed_by?: string
          changes?: Json | null
          created_at?: string
          event_type?: string
          from_status?: Database["public"]["Enums"]["action_item_status"] | null
          id?: string
          to_status?: Database["public"]["Enums"]["action_item_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "action_center_history_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "action_center"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_comments: {
        Row: {
          approval_id: string
          author_user_id: string
          body: string
          created_at: string
          id: string
        }
        Insert: {
          approval_id: string
          author_user_id: string
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          approval_id?: string
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_comments_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "approvals"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_events: {
        Row: {
          actor_user_id: string
          approval_id: string
          created_at: string
          diff: Json | null
          event_type: Database["public"]["Enums"]["approval_event_type"]
          from_status: Database["public"]["Enums"]["approval_status"] | null
          id: string
          to_status: Database["public"]["Enums"]["approval_status"] | null
        }
        Insert: {
          actor_user_id: string
          approval_id: string
          created_at?: string
          diff?: Json | null
          event_type: Database["public"]["Enums"]["approval_event_type"]
          from_status?: Database["public"]["Enums"]["approval_status"] | null
          id?: string
          to_status?: Database["public"]["Enums"]["approval_status"] | null
        }
        Update: {
          actor_user_id?: string
          approval_id?: string
          created_at?: string
          diff?: Json | null
          event_type?: Database["public"]["Enums"]["approval_event_type"]
          from_status?: Database["public"]["Enums"]["approval_status"] | null
          id?: string
          to_status?: Database["public"]["Enums"]["approval_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_events_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "approvals"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          amount: number | null
          assigned_to_user_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          metadata: Json | null
          project_id: string
          status: Database["public"]["Enums"]["approval_status"]
          title: string
          type: Database["public"]["Enums"]["approval_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          assigned_to_user_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          metadata?: Json | null
          project_id: string
          status?: Database["public"]["Enums"]["approval_status"]
          title: string
          type: Database["public"]["Enums"]["approval_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          assigned_to_user_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          title?: string
          type?: Database["public"]["Enums"]["approval_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_files: {
        Row: {
          artist_id: string
          booking_id: string | null
          category: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          public_expires_at: string | null
          public_token: string | null
          subcategory: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          artist_id: string
          booking_id?: string | null
          category: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          public_expires_at?: string | null
          public_token?: string | null
          subcategory?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          artist_id?: string
          booking_id?: string | null
          category?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          public_expires_at?: string | null
          public_token?: string | null
          subcategory?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_files_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_files_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_form_tokens: {
        Row: {
          artist_id: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          token: string
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          token?: string
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_form_tokens_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_role_bindings: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["artist_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["artist_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["artist_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_role_bindings_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_subfolders: {
        Row: {
          artist_id: string
          booking_id: string | null
          category: string
          created_at: string
          created_by: string
          id: string
          is_default: boolean | null
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          artist_id: string
          booking_id?: string | null
          category: string
          created_at?: string
          created_by: string
          id?: string
          is_default?: boolean | null
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          artist_id?: string
          booking_id?: string | null
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          is_default?: boolean | null
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_subfolders_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_subfolders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_subfolders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "artist_subfolders"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          actividad_inicio: string | null
          address: string | null
          allergies: string | null
          artist_type: string
          avatar_url: string | null
          bank_name: string | null
          brand_color: string | null
          calendar_url: string | null
          clothing_size: string | null
          company_name: string | null
          created_at: string
          created_by: string
          custom_data: Json | null
          description: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          email: string | null
          field_config: Json | null
          genre: string | null
          header_image_url: string | null
          iban: string | null
          id: string
          instagram_url: string | null
          ipi_number: string | null
          irpf_porcentaje: number | null
          irpf_type: string | null
          legal_name: string | null
          metadata: Json | null
          name: string
          nif: string | null
          notes: string | null
          phone: string | null
          pro_name: string | null
          profile_id: string | null
          shoe_size: string | null
          social_links: Json
          special_needs: string | null
          spotify_url: string | null
          stage_name: string | null
          swift_code: string | null
          tax_id: string | null
          tiktok_url: string | null
          tipo_entidad: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          actividad_inicio?: string | null
          address?: string | null
          allergies?: string | null
          artist_type?: string
          avatar_url?: string | null
          bank_name?: string | null
          brand_color?: string | null
          calendar_url?: string | null
          clothing_size?: string | null
          company_name?: string | null
          created_at?: string
          created_by: string
          custom_data?: Json | null
          description?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          email?: string | null
          field_config?: Json | null
          genre?: string | null
          header_image_url?: string | null
          iban?: string | null
          id?: string
          instagram_url?: string | null
          ipi_number?: string | null
          irpf_porcentaje?: number | null
          irpf_type?: string | null
          legal_name?: string | null
          metadata?: Json | null
          name: string
          nif?: string | null
          notes?: string | null
          phone?: string | null
          pro_name?: string | null
          profile_id?: string | null
          shoe_size?: string | null
          social_links?: Json
          special_needs?: string | null
          spotify_url?: string | null
          stage_name?: string | null
          swift_code?: string | null
          tax_id?: string | null
          tiktok_url?: string | null
          tipo_entidad?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          actividad_inicio?: string | null
          address?: string | null
          allergies?: string | null
          artist_type?: string
          avatar_url?: string | null
          bank_name?: string | null
          brand_color?: string | null
          calendar_url?: string | null
          clothing_size?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string
          custom_data?: Json | null
          description?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          email?: string | null
          field_config?: Json | null
          genre?: string | null
          header_image_url?: string | null
          iban?: string | null
          id?: string
          instagram_url?: string | null
          ipi_number?: string | null
          irpf_porcentaje?: number | null
          irpf_type?: string | null
          legal_name?: string | null
          metadata?: Json | null
          name?: string
          nif?: string | null
          notes?: string | null
          phone?: string | null
          pro_name?: string | null
          profile_id?: string | null
          shoe_size?: string | null
          social_links?: Json
          special_needs?: string | null
          spotify_url?: string | null
          stage_name?: string | null
          swift_code?: string | null
          tax_id?: string | null
          tiktok_url?: string | null
          tipo_entidad?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artists_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artists_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: []
      }
      automation_configs: {
        Row: {
          artist_ids: string[] | null
          automation_key: string
          created_at: string
          custom_settings: Json | null
          id: string
          is_enabled: boolean
          notify_channel: string
          notify_role: string | null
          trigger_days: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          artist_ids?: string[] | null
          automation_key: string
          created_at?: string
          custom_settings?: Json | null
          id?: string
          is_enabled?: boolean
          notify_channel?: string
          notify_role?: string | null
          trigger_days?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          artist_ids?: string[] | null
          automation_key?: string
          created_at?: string
          custom_settings?: Json | null
          id?: string
          is_enabled?: boolean
          notify_channel?: string
          notify_role?: string | null
          trigger_days?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_executions: {
        Row: {
          automation_key: string
          entity_id: string
          entity_type: string
          fired_at: string
          id: string
          notification_id: string | null
          workspace_id: string
        }
        Insert: {
          automation_key: string
          entity_id: string
          entity_type: string
          fired_at?: string
          id?: string
          notification_id?: string | null
          workspace_id: string
        }
        Update: {
          automation_key?: string
          entity_id?: string
          entity_type?: string
          fired_at?: string
          id?: string
          notification_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_availability_history: {
        Row: {
          actor_user_id: string
          booking_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          new_value: Json | null
          previous_value: Json | null
          request_id: string | null
          response_id: string | null
        }
        Insert: {
          actor_user_id: string
          booking_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          previous_value?: Json | null
          request_id?: string | null
          response_id?: string | null
        }
        Update: {
          actor_user_id?: string
          booking_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          previous_value?: Json | null
          request_id?: string | null
          response_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_availability_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_availability_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "booking_availability_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_availability_requests: {
        Row: {
          block_confirmation: boolean
          booking_id: string
          closed_at: string | null
          created_at: string
          deadline: string | null
          id: string
          notes: string | null
          requested_by: string
          share_token: string | null
          status: Database["public"]["Enums"]["availability_request_status"]
        }
        Insert: {
          block_confirmation?: boolean
          booking_id: string
          closed_at?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          notes?: string | null
          requested_by: string
          share_token?: string | null
          status?: Database["public"]["Enums"]["availability_request_status"]
        }
        Update: {
          block_confirmation?: boolean
          booking_id?: string
          closed_at?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          notes?: string | null
          requested_by?: string
          share_token?: string | null
          status?: Database["public"]["Enums"]["availability_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "booking_availability_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_availability_responses: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          request_id: string
          responded_at: string | null
          responder_email: string | null
          responder_name: string | null
          response_notes: string | null
          status: Database["public"]["Enums"]["availability_response_status"]
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          request_id: string
          responded_at?: string | null
          responder_email?: string | null
          responder_name?: string | null
          response_notes?: string | null
          status?: Database["public"]["Enums"]["availability_response_status"]
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          request_id?: string
          responded_at?: string | null
          responder_email?: string | null
          responder_name?: string | null
          response_notes?: string | null
          status?: Database["public"]["Enums"]["availability_response_status"]
        }
        Relationships: [
          {
            foreignKeyName: "booking_availability_responses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_availability_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "booking_availability_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_checkpoints: {
        Row: {
          booking_offer_id: string
          completed_at: string | null
          created_at: string
          dismissed_at: string | null
          due_date: string | null
          id: string
          label: string
          status: string
          type: string
        }
        Insert: {
          booking_offer_id: string
          completed_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          due_date?: string | null
          id?: string
          label: string
          status?: string
          type: string
        }
        Update: {
          booking_offer_id?: string
          completed_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          due_date?: string | null
          id?: string
          label?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_checkpoints_booking_offer_id_fkey"
            columns: ["booking_offer_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_documents: {
        Row: {
          booking_id: string
          content: string | null
          contract_token: string | null
          created_at: string
          created_by: string | null
          document_type: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          signature_image_url: string | null
          signed_at: string | null
          signer_name: string | null
          status: string
        }
        Insert: {
          booking_id: string
          content?: string | null
          contract_token?: string | null
          created_at?: string
          created_by?: string | null
          document_type?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          signature_image_url?: string | null
          signed_at?: string | null
          signer_name?: string | null
          status?: string
        }
        Update: {
          booking_id?: string
          content?: string | null
          contract_token?: string | null
          created_at?: string
          created_by?: string | null
          document_type?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          signature_image_url?: string | null
          signed_at?: string | null
          signer_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_documents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_expenses: {
        Row: {
          amount: number
          booking_id: string
          category: string | null
          created_at: string
          created_by: string | null
          description: string
          expense_date: string | null
          handler: string
          id: string
          invoice_number: string | null
          invoice_url: string | null
          irpf_percentage: number
          iva_percentage: number | null
          other_tax_label: string | null
          other_tax_percentage: number
          payer: string
          pushed_budget_item_id: string | null
          split_agency_pct: number
          split_artist_pct: number
          split_mode: string
          split_promoter_pct: number
        }
        Insert: {
          amount?: number
          booking_id: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string | null
          handler?: string
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          irpf_percentage?: number
          iva_percentage?: number | null
          other_tax_label?: string | null
          other_tax_percentage?: number
          payer?: string
          pushed_budget_item_id?: string | null
          split_agency_pct?: number
          split_artist_pct?: number
          split_mode?: string
          split_promoter_pct?: number
        }
        Update: {
          amount?: number
          booking_id?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string | null
          handler?: string
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          irpf_percentage?: number
          iva_percentage?: number | null
          other_tax_label?: string | null
          other_tax_percentage?: number
          payer?: string
          pushed_budget_item_id?: string | null
          split_agency_pct?: number
          split_artist_pct?: number
          split_mode?: string
          split_promoter_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_expenses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_expenses_pushed_budget_item_id_fkey"
            columns: ["pushed_budget_item_id"]
            isOneToOne: false
            referencedRelation: "budget_items"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_history: {
        Row: {
          booking_id: string
          changed_at: string
          changed_by: string | null
          event_type: string
          field_changed: string | null
          id: string
          metadata: Json | null
          new_value: Json | null
          previous_value: Json | null
        }
        Insert: {
          booking_id: string
          changed_at?: string
          changed_by?: string | null
          event_type: string
          field_changed?: string | null
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          previous_value?: Json | null
        }
        Update: {
          booking_id?: string
          changed_at?: string
          changed_by?: string | null
          event_type?: string
          field_changed?: string | null
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          previous_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_itinerary: {
        Row: {
          booking_id: string
          cost: number | null
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          handler: string | null
          id: string
          item_type: string
          location: string | null
          payer: string | null
          sort_order: number
          start_time: string | null
          title: string
        }
        Insert: {
          booking_id: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          handler?: string | null
          id?: string
          item_type: string
          location?: string | null
          payer?: string | null
          sort_order?: number
          start_time?: string | null
          title: string
        }
        Update: {
          booking_id?: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          handler?: string | null
          id?: string
          item_type?: string
          location?: string | null
          payer?: string | null
          sort_order?: number
          start_time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_itinerary_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_notifications: {
        Row: {
          booking_offer_id: string
          created_at: string
          id: string
          message: string
          read: boolean
          type: string
        }
        Insert: {
          booking_offer_id: string
          created_at?: string
          id?: string
          message: string
          read?: boolean
          type: string
        }
        Update: {
          booking_offer_id?: string
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_notifications_booking_offer_id_fkey"
            columns: ["booking_offer_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_offers: {
        Row: {
          adjuntos: Json | null
          anticipo_estado: string | null
          anticipo_fecha_cobro: string | null
          anticipo_fecha_esperada: string | null
          anticipo_importe: number | null
          anticipo_porcentaje: number | null
          anticipo_referencia: string | null
          anunciado: boolean | null
          artist_id: string | null
          capacidad: number | null
          ciudad: string | null
          cobro_estado: string | null
          cobro_fecha: string | null
          cobro_importe: number | null
          cobro_metodo: string | null
          cobro_notas: string | null
          cobro_referencia: string | null
          comision_beneficiario_contact_id: string | null
          comision_beneficiario_profile_id: string | null
          comision_concepto: string | null
          comision_euros: number | null
          comision_porcentaje: number | null
          condiciones: string | null
          contacto: string | null
          contratos: string | null
          created_at: string
          created_by: string
          duracion: string | null
          es_cityzen: boolean | null
          es_internacional: boolean | null
          es_privado: boolean | null
          estado: string | null
          estado_facturacion: string | null
          event_id: string | null
          fecha: string | null
          fee: number | null
          festival_ciclo: string | null
          folder_url: string | null
          formato: string | null
          gastos_estimados: number | null
          hora: string | null
          id: string
          info_comentarios: string | null
          inicio_venta: string | null
          invitaciones: number | null
          is_sold_out: boolean | null
          link_venta: string | null
          liquidacion_estado: string | null
          liquidacion_fecha_cobro: string | null
          liquidacion_fecha_esperada: string | null
          liquidacion_importe: number | null
          liquidacion_referencia: string | null
          logistica: string | null
          lugar: string | null
          notas: string | null
          oferta: string | null
          pais: string | null
          phase: string | null
          project_id: string | null
          promotor: string | null
          publico: string | null
          pvp: number | null
          sort_order: number | null
          tickets_sold: number | null
          tour_manager: string | null
          tour_manager_new: string | null
          updated_at: string
          venue: string | null
          viability_manager_approved: boolean | null
          viability_manager_at: string | null
          viability_manager_by: string | null
          viability_notes: string | null
          viability_production_approved: boolean | null
          viability_production_at: string | null
          viability_production_by: string | null
          viability_tour_manager_approved: boolean | null
          viability_tour_manager_at: string | null
          viability_tour_manager_by: string | null
        }
        Insert: {
          adjuntos?: Json | null
          anticipo_estado?: string | null
          anticipo_fecha_cobro?: string | null
          anticipo_fecha_esperada?: string | null
          anticipo_importe?: number | null
          anticipo_porcentaje?: number | null
          anticipo_referencia?: string | null
          anunciado?: boolean | null
          artist_id?: string | null
          capacidad?: number | null
          ciudad?: string | null
          cobro_estado?: string | null
          cobro_fecha?: string | null
          cobro_importe?: number | null
          cobro_metodo?: string | null
          cobro_notas?: string | null
          cobro_referencia?: string | null
          comision_beneficiario_contact_id?: string | null
          comision_beneficiario_profile_id?: string | null
          comision_concepto?: string | null
          comision_euros?: number | null
          comision_porcentaje?: number | null
          condiciones?: string | null
          contacto?: string | null
          contratos?: string | null
          created_at?: string
          created_by: string
          duracion?: string | null
          es_cityzen?: boolean | null
          es_internacional?: boolean | null
          es_privado?: boolean | null
          estado?: string | null
          estado_facturacion?: string | null
          event_id?: string | null
          fecha?: string | null
          fee?: number | null
          festival_ciclo?: string | null
          folder_url?: string | null
          formato?: string | null
          gastos_estimados?: number | null
          hora?: string | null
          id?: string
          info_comentarios?: string | null
          inicio_venta?: string | null
          invitaciones?: number | null
          is_sold_out?: boolean | null
          link_venta?: string | null
          liquidacion_estado?: string | null
          liquidacion_fecha_cobro?: string | null
          liquidacion_fecha_esperada?: string | null
          liquidacion_importe?: number | null
          liquidacion_referencia?: string | null
          logistica?: string | null
          lugar?: string | null
          notas?: string | null
          oferta?: string | null
          pais?: string | null
          phase?: string | null
          project_id?: string | null
          promotor?: string | null
          publico?: string | null
          pvp?: number | null
          sort_order?: number | null
          tickets_sold?: number | null
          tour_manager?: string | null
          tour_manager_new?: string | null
          updated_at?: string
          venue?: string | null
          viability_manager_approved?: boolean | null
          viability_manager_at?: string | null
          viability_manager_by?: string | null
          viability_notes?: string | null
          viability_production_approved?: boolean | null
          viability_production_at?: string | null
          viability_production_by?: string | null
          viability_tour_manager_approved?: boolean | null
          viability_tour_manager_at?: string | null
          viability_tour_manager_by?: string | null
        }
        Update: {
          adjuntos?: Json | null
          anticipo_estado?: string | null
          anticipo_fecha_cobro?: string | null
          anticipo_fecha_esperada?: string | null
          anticipo_importe?: number | null
          anticipo_porcentaje?: number | null
          anticipo_referencia?: string | null
          anunciado?: boolean | null
          artist_id?: string | null
          capacidad?: number | null
          ciudad?: string | null
          cobro_estado?: string | null
          cobro_fecha?: string | null
          cobro_importe?: number | null
          cobro_metodo?: string | null
          cobro_notas?: string | null
          cobro_referencia?: string | null
          comision_beneficiario_contact_id?: string | null
          comision_beneficiario_profile_id?: string | null
          comision_concepto?: string | null
          comision_euros?: number | null
          comision_porcentaje?: number | null
          condiciones?: string | null
          contacto?: string | null
          contratos?: string | null
          created_at?: string
          created_by?: string
          duracion?: string | null
          es_cityzen?: boolean | null
          es_internacional?: boolean | null
          es_privado?: boolean | null
          estado?: string | null
          estado_facturacion?: string | null
          event_id?: string | null
          fecha?: string | null
          fee?: number | null
          festival_ciclo?: string | null
          folder_url?: string | null
          formato?: string | null
          gastos_estimados?: number | null
          hora?: string | null
          id?: string
          info_comentarios?: string | null
          inicio_venta?: string | null
          invitaciones?: number | null
          is_sold_out?: boolean | null
          link_venta?: string | null
          liquidacion_estado?: string | null
          liquidacion_fecha_cobro?: string | null
          liquidacion_fecha_esperada?: string | null
          liquidacion_importe?: number | null
          liquidacion_referencia?: string | null
          logistica?: string | null
          lugar?: string | null
          notas?: string | null
          oferta?: string | null
          pais?: string | null
          phase?: string | null
          project_id?: string | null
          promotor?: string | null
          publico?: string | null
          pvp?: number | null
          sort_order?: number | null
          tickets_sold?: number | null
          tour_manager?: string | null
          tour_manager_new?: string | null
          updated_at?: string
          venue?: string | null
          viability_manager_approved?: boolean | null
          viability_manager_at?: string | null
          viability_manager_by?: string | null
          viability_notes?: string | null
          viability_production_approved?: boolean | null
          viability_production_at?: string | null
          viability_production_by?: string | null
          viability_tour_manager_approved?: boolean | null
          viability_tour_manager_at?: string | null
          viability_tour_manager_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_offers_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_offers_comision_beneficiario_contact_id_fkey"
            columns: ["comision_beneficiario_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_offers_comision_beneficiario_profile_id_fkey"
            columns: ["comision_beneficiario_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_offers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_product_crew: {
        Row: {
          booking_product_id: string
          created_at: string
          fee_international: number | null
          fee_national: number | null
          id: string
          is_percentage: boolean | null
          is_tour_party: boolean | null
          member_id: string
          member_type: string
          percentage_international: number | null
          percentage_national: number | null
          role_label: string | null
          sort_order: number
        }
        Insert: {
          booking_product_id: string
          created_at?: string
          fee_international?: number | null
          fee_national?: number | null
          id?: string
          is_percentage?: boolean | null
          is_tour_party?: boolean | null
          member_id: string
          member_type: string
          percentage_international?: number | null
          percentage_national?: number | null
          role_label?: string | null
          sort_order?: number
        }
        Update: {
          booking_product_id?: string
          created_at?: string
          fee_international?: number | null
          fee_national?: number | null
          id?: string
          is_percentage?: boolean | null
          is_tour_party?: boolean | null
          member_id?: string
          member_type?: string
          percentage_international?: number | null
          percentage_national?: number | null
          role_label?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_product_crew_booking_product_id_fkey"
            columns: ["booking_product_id"]
            isOneToOne: false
            referencedRelation: "booking_products"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_products: {
        Row: {
          artist_id: string
          created_at: string | null
          created_by: string
          crew_size: number | null
          currency: string | null
          description: string | null
          fee_international: number | null
          fee_national: number | null
          hospitality_requirements: string | null
          id: string
          is_active: boolean | null
          name: string
          performance_duration_minutes: number | null
          previous_name: string | null
          rider_url: string | null
          setup_time_minutes: number | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          created_by: string
          crew_size?: number | null
          currency?: string | null
          description?: string | null
          fee_international?: number | null
          fee_national?: number | null
          hospitality_requirements?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          performance_duration_minutes?: number | null
          previous_name?: string | null
          rider_url?: string | null
          setup_time_minutes?: number | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          created_by?: string
          crew_size?: number | null
          currency?: string | null
          description?: string | null
          fee_international?: number | null
          fee_national?: number | null
          hospitality_requirements?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          performance_duration_minutes?: number | null
          previous_name?: string | null
          rider_url?: string | null
          setup_time_minutes?: number | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_products_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_status_options: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_default: boolean
          status_value: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_default?: boolean
          status_value: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_default?: boolean
          status_value?: string
        }
        Relationships: []
      }
      booking_template_config: {
        Row: {
          created_at: string
          created_by: string
          field_label: string
          field_name: string
          field_order: number
          field_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          field_label: string
          field_name: string
          field_order: number
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          field_label?: string
          field_name?: string
          field_order?: number
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      buddy_dismissals: {
        Row: {
          alert_key: string
          dismissed_at: string
          id: string
          user_id: string
        }
        Insert: {
          alert_key: string
          dismissed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          alert_key?: string
          dismissed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_attachments: {
        Row: {
          budget_id: string
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_attachments_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_categories: {
        Row: {
          budget_cap: number | null
          created_at: string
          created_by: string
          icon_name: string
          id: string
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          budget_cap?: number | null
          created_at?: string
          created_by: string
          icon_name?: string
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          budget_cap?: number | null
          created_at?: string
          created_by?: string
          icon_name?: string
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      budget_items: {
        Row: {
          billing_status: Database["public"]["Enums"]["billing_status"] | null
          budget_id: string
          category: string
          category_id: string | null
          commission_percentage: number | null
          contact_id: string | null
          created_at: string
          fecha_emision: string | null
          id: string
          invoice_group_parent_id: string | null
          invoice_link: string | null
          irpf_percentage: number | null
          is_attendee: boolean | null
          is_commission_percentage: boolean | null
          is_provisional: boolean | null
          is_reconciled: boolean | null
          iva_percentage: number | null
          name: string
          observations: string | null
          provider_email: string | null
          provider_invoice_received_at: string | null
          provider_invoice_requested_at: string | null
          provider_invoice_status: string | null
          quantity: number | null
          reconciled_at: string | null
          reconciled_by: string | null
          sort_order: number | null
          subcategory: string | null
          supplier_invoice_number: string | null
          supplier_invoice_total: number | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          billing_status?: Database["public"]["Enums"]["billing_status"] | null
          budget_id: string
          category: string
          category_id?: string | null
          commission_percentage?: number | null
          contact_id?: string | null
          created_at?: string
          fecha_emision?: string | null
          id?: string
          invoice_group_parent_id?: string | null
          invoice_link?: string | null
          irpf_percentage?: number | null
          is_attendee?: boolean | null
          is_commission_percentage?: boolean | null
          is_provisional?: boolean | null
          is_reconciled?: boolean | null
          iva_percentage?: number | null
          name: string
          observations?: string | null
          provider_email?: string | null
          provider_invoice_received_at?: string | null
          provider_invoice_requested_at?: string | null
          provider_invoice_status?: string | null
          quantity?: number | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          sort_order?: number | null
          subcategory?: string | null
          supplier_invoice_number?: string | null
          supplier_invoice_total?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          billing_status?: Database["public"]["Enums"]["billing_status"] | null
          budget_id?: string
          category?: string
          category_id?: string | null
          commission_percentage?: number | null
          contact_id?: string | null
          created_at?: string
          fecha_emision?: string | null
          id?: string
          invoice_group_parent_id?: string | null
          invoice_link?: string | null
          irpf_percentage?: number | null
          is_attendee?: boolean | null
          is_commission_percentage?: boolean | null
          is_provisional?: boolean | null
          is_reconciled?: boolean | null
          iva_percentage?: number | null
          name?: string
          observations?: string | null
          provider_email?: string | null
          provider_invoice_received_at?: string | null
          provider_invoice_requested_at?: string | null
          provider_invoice_status?: string | null
          quantity?: number | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          sort_order?: number | null
          subcategory?: string | null
          supplier_invoice_number?: string | null
          supplier_invoice_total?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_invoice_group_parent_id_fkey"
            columns: ["invoice_group_parent_id"]
            isOneToOne: false
            referencedRelation: "budget_items"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_release_links: {
        Row: {
          budget_id: string
          created_at: string | null
          id: string
          release_id: string
        }
        Insert: {
          budget_id: string
          created_at?: string | null
          id?: string
          release_id: string
        }
        Update: {
          budget_id?: string
          created_at?: string | null
          id?: string
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_release_links_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_release_links_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_template_items: {
        Row: {
          category: string
          created_at: string
          id: string
          is_attendee: boolean | null
          iva_percentage: number | null
          name: string
          observations: string | null
          quantity: number | null
          subcategory: string | null
          template_id: string
          unit_price: number | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_attendee?: boolean | null
          iva_percentage?: number | null
          name: string
          observations?: string | null
          quantity?: number | null
          subcategory?: string | null
          template_id: string
          unit_price?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_attendee?: boolean | null
          iva_percentage?: number | null
          name?: string
          observations?: string | null
          quantity?: number | null
          subcategory?: string | null
          template_id?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "budget_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      budget_versions: {
        Row: {
          budget_id: string
          created_at: string
          created_by: string
          id: string
          locked_at: string | null
          locked_by: string | null
          net_profit: number | null
          notes: string | null
          snapshot_data: Json
          total_expenses: number | null
          total_income: number | null
          version_name: string
          version_number: number
          version_type: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          created_by: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          net_profit?: number | null
          notes?: string | null
          snapshot_data?: Json
          total_expenses?: number | null
          total_income?: number | null
          version_name: string
          version_number?: number
          version_type: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          created_by?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          net_profit?: number | null
          notes?: string | null
          snapshot_data?: Json
          total_expenses?: number | null
          total_income?: number | null
          version_name?: string
          version_number?: number
          version_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_versions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          accountant_verified_at: string | null
          accountant_verified_by: string | null
          artist_id: string | null
          booking_offer_id: string | null
          booking_role: string | null
          budget_status: Database["public"]["Enums"]["budget_status"] | null
          capacidad: number | null
          city: string | null
          condiciones: string | null
          country: string | null
          created_at: string
          created_by: string
          estimated_version_id: string | null
          event_date: string | null
          event_time: string | null
          expense_budget: number | null
          fee: number | null
          festival_ciclo: string | null
          final_version_id: string | null
          formato: string | null
          id: string
          internal_notes: string | null
          invitaciones: number | null
          is_primary_for_booking: boolean
          metadata: Json | null
          name: string
          oferta: string | null
          parent_folder_id: string | null
          project_id: string | null
          release_id: string | null
          settlement_status: string | null
          show_status: Database["public"]["Enums"]["show_status"] | null
          status_negociacion: string | null
          template_id: string | null
          type: Database["public"]["Enums"]["budget_type"]
          updated_at: string
          venue: string | null
        }
        Insert: {
          accountant_verified_at?: string | null
          accountant_verified_by?: string | null
          artist_id?: string | null
          booking_offer_id?: string | null
          booking_role?: string | null
          budget_status?: Database["public"]["Enums"]["budget_status"] | null
          capacidad?: number | null
          city?: string | null
          condiciones?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          estimated_version_id?: string | null
          event_date?: string | null
          event_time?: string | null
          expense_budget?: number | null
          fee?: number | null
          festival_ciclo?: string | null
          final_version_id?: string | null
          formato?: string | null
          id?: string
          internal_notes?: string | null
          invitaciones?: number | null
          is_primary_for_booking?: boolean
          metadata?: Json | null
          name: string
          oferta?: string | null
          parent_folder_id?: string | null
          project_id?: string | null
          release_id?: string | null
          settlement_status?: string | null
          show_status?: Database["public"]["Enums"]["show_status"] | null
          status_negociacion?: string | null
          template_id?: string | null
          type: Database["public"]["Enums"]["budget_type"]
          updated_at?: string
          venue?: string | null
        }
        Update: {
          accountant_verified_at?: string | null
          accountant_verified_by?: string | null
          artist_id?: string | null
          booking_offer_id?: string | null
          booking_role?: string | null
          budget_status?: Database["public"]["Enums"]["budget_status"] | null
          capacidad?: number | null
          city?: string | null
          condiciones?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          estimated_version_id?: string | null
          event_date?: string | null
          event_time?: string | null
          expense_budget?: number | null
          fee?: number | null
          festival_ciclo?: string | null
          final_version_id?: string | null
          formato?: string | null
          id?: string
          internal_notes?: string | null
          invitaciones?: number | null
          is_primary_for_booking?: boolean
          metadata?: Json | null
          name?: string
          oferta?: string | null
          parent_folder_id?: string | null
          project_id?: string | null
          release_id?: string | null
          settlement_status?: string | null
          show_status?: Database["public"]["Enums"]["show_status"] | null
          status_negociacion?: string | null
          template_id?: string | null
          type?: Database["public"]["Enums"]["budget_type"]
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_booking_offer_id_fkey"
            columns: ["booking_offer_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "budgets_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budgets_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "budget_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_messages: {
        Row: {
          channel_id: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          message: string
          read_by: string[] | null
          sender_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message: string
          read_by?: string[] | null
          sender_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message?: string
          read_by?: string[] | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          channel_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          channel_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          channel_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "chat_channels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_template_items: {
        Row: {
          created_at: string
          due_anchor: Database["public"]["Enums"]["due_anchor"] | null
          due_days_offset: number | null
          id: string
          owner_label_es: string | null
          section: string
          section_es: string | null
          sort_order: number
          task: string
          task_es: string | null
          template_id: string
        }
        Insert: {
          created_at?: string
          due_anchor?: Database["public"]["Enums"]["due_anchor"] | null
          due_days_offset?: number | null
          id?: string
          owner_label_es?: string | null
          section: string
          section_es?: string | null
          sort_order?: number
          task: string
          task_es?: string | null
          template_id: string
        }
        Update: {
          created_at?: string
          due_anchor?: Database["public"]["Enums"]["due_anchor"] | null
          due_days_offset?: number | null
          id?: string
          owner_label_es?: string | null
          section?: string
          section_es?: string | null
          sort_order?: number
          task?: string
          task_es?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_checklist_template_items_template_id"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          description_es: string | null
          id: string
          is_system_template: boolean
          name: string
          name_es: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          description_es?: string | null
          id?: string
          is_system_template?: boolean
          name: string
          name_es?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          description_es?: string | null
          id?: string
          is_system_template?: boolean
          name?: string
          name_es?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      cobros: {
        Row: {
          amount_gross: number
          amount_net: number | null
          artist_id: string | null
          booking_id: string | null
          concept: string
          created_at: string
          created_by: string
          expected_date: string | null
          id: string
          irpf_pct: number
          notes: string | null
          project_id: string | null
          received_date: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount_gross?: number
          amount_net?: number | null
          artist_id?: string | null
          booking_id?: string | null
          concept: string
          created_at?: string
          created_by: string
          expected_date?: string | null
          id?: string
          irpf_pct?: number
          notes?: string | null
          project_id?: string | null
          received_date?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount_gross?: number
          amount_net?: number | null
          artist_id?: string | null
          booking_id?: string | null
          concept?: string
          created_at?: string
          created_by?: string
          expected_date?: string | null
          id?: string
          irpf_pct?: number
          notes?: string | null
          project_id?: string | null
          received_date?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobros_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobros_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobros_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "cobros_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_artist_assignments: {
        Row: {
          artist_id: string
          contact_id: string
          created_at: string
          id: string
        }
        Insert: {
          artist_id: string
          contact_id: string
          created_at?: string
          id?: string
        }
        Update: {
          artist_id?: string
          contact_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_artist_assignments_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_artist_assignments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_form_tokens: {
        Row: {
          contact_id: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          token: string
          workspace_id: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          token?: string
          workspace_id?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          token?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_form_tokens_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_form_tokens_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_group_members: {
        Row: {
          contact_id: string
          created_at: string
          group_id: string
          id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          group_id: string
          id?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_group_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contact_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_groups: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          group_type: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          group_type?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          group_type?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_groups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          allergies: string | null
          artist_id: string | null
          avatar_url: string | null
          bank_info: string | null
          category: string | null
          city: string | null
          clothing_size: string | null
          company: string | null
          contract_url: string | null
          country: string | null
          created_at: string
          created_by: string
          custom_data: Json | null
          email: string | null
          field_config: Json | null
          iban: string | null
          id: string
          ipi_number: string | null
          is_public: boolean | null
          legal_name: string | null
          linked_artist_id: string | null
          name: string
          notes: string | null
          phone: string | null
          preferred_hours: string | null
          pro_name: string | null
          public_slug: string | null
          role: string | null
          shared_with_users: string[] | null
          shoe_size: string | null
          special_needs: string | null
          stage_name: string | null
          tags: string[] | null
          team_tier: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          artist_id?: string | null
          avatar_url?: string | null
          bank_info?: string | null
          category?: string | null
          city?: string | null
          clothing_size?: string | null
          company?: string | null
          contract_url?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          custom_data?: Json | null
          email?: string | null
          field_config?: Json | null
          iban?: string | null
          id?: string
          ipi_number?: string | null
          is_public?: boolean | null
          legal_name?: string | null
          linked_artist_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          preferred_hours?: string | null
          pro_name?: string | null
          public_slug?: string | null
          role?: string | null
          shared_with_users?: string[] | null
          shoe_size?: string | null
          special_needs?: string | null
          stage_name?: string | null
          tags?: string[] | null
          team_tier?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string | null
          artist_id?: string | null
          avatar_url?: string | null
          bank_info?: string | null
          category?: string | null
          city?: string | null
          clothing_size?: string | null
          company?: string | null
          contract_url?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          custom_data?: Json | null
          email?: string | null
          field_config?: Json | null
          iban?: string | null
          id?: string
          ipi_number?: string | null
          is_public?: boolean | null
          legal_name?: string | null
          linked_artist_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_hours?: string | null
          pro_name?: string | null
          public_slug?: string | null
          role?: string | null
          shared_with_users?: string[] | null
          shoe_size?: string | null
          special_needs?: string | null
          stage_name?: string | null
          tags?: string[] | null
          team_tier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_linked_artist_id_fkey"
            columns: ["linked_artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_draft_comments: {
        Row: {
          approved_by_collaborator: boolean
          approved_by_producer: boolean
          author_name: string
          author_profile_id: string | null
          clause_number: string | null
          comment_status: string
          created_at: string | null
          draft_id: string
          id: string
          message: string
          parent_comment_id: string | null
          proposed_change: string | null
          resolved: boolean | null
          section_key: string
          selected_text: string | null
          selection_end: number | null
          selection_start: number | null
        }
        Insert: {
          approved_by_collaborator?: boolean
          approved_by_producer?: boolean
          author_name: string
          author_profile_id?: string | null
          clause_number?: string | null
          comment_status?: string
          created_at?: string | null
          draft_id: string
          id?: string
          message: string
          parent_comment_id?: string | null
          proposed_change?: string | null
          resolved?: boolean | null
          section_key: string
          selected_text?: string | null
          selection_end?: number | null
          selection_start?: number | null
        }
        Update: {
          approved_by_collaborator?: boolean
          approved_by_producer?: boolean
          author_name?: string
          author_profile_id?: string | null
          clause_number?: string | null
          comment_status?: string
          created_at?: string | null
          draft_id?: string
          id?: string
          message?: string
          parent_comment_id?: string | null
          proposed_change?: string | null
          resolved?: boolean | null
          section_key?: string
          selected_text?: string | null
          selection_end?: number | null
          selection_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_draft_comments_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_draft_comments_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "contract_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_draft_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "contract_draft_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_draft_participants: {
        Row: {
          contact_id: string | null
          draft_id: string
          email: string
          first_seen_at: string
          id: string
          last_seen_at: string
          name: string
          profile_id: string | null
          role: string
          view_count: number
        }
        Insert: {
          contact_id?: string | null
          draft_id: string
          email: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          name: string
          profile_id?: string | null
          role?: string
          view_count?: number
        }
        Update: {
          contact_id?: string | null
          draft_id?: string
          email?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          name?: string
          profile_id?: string | null
          role?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_draft_participants_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_draft_participants_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "contract_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_draft_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_drafts: {
        Row: {
          artist_id: string | null
          booking_id: string | null
          clauses_data: Json | null
          collaborator_email: string | null
          created_at: string | null
          created_by: string
          draft_type: string
          firma_fecha: string | null
          firma_lugar: string | null
          form_data: Json
          id: string
          language: string
          producer_email: string | null
          recording_type: string
          release_id: string | null
          share_token: string | null
          signed_pdf_url: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          artist_id?: string | null
          booking_id?: string | null
          clauses_data?: Json | null
          collaborator_email?: string | null
          created_at?: string | null
          created_by: string
          draft_type?: string
          firma_fecha?: string | null
          firma_lugar?: string | null
          form_data: Json
          id?: string
          language?: string
          producer_email?: string | null
          recording_type?: string
          release_id?: string | null
          share_token?: string | null
          signed_pdf_url?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          artist_id?: string | null
          booking_id?: string | null
          clauses_data?: Json | null
          collaborator_email?: string | null
          created_at?: string | null
          created_by?: string
          draft_type?: string
          firma_fecha?: string | null
          firma_lugar?: string | null
          form_data?: Json
          id?: string
          language?: string
          producer_email?: string | null
          recording_type?: string
          release_id?: string | null
          share_token?: string | null
          signed_pdf_url?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_drafts_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_drafts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_drafts_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signers: {
        Row: {
          created_at: string
          document_id: string
          email: string | null
          id: string
          name: string
          role: string
          signature_image_url: string | null
          signed_at: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id: string
          email?: string | null
          id?: string
          name: string
          role?: string
          signature_image_url?: string | null
          signed_at?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          email?: string | null
          id?: string
          name?: string
          role?: string
          signature_image_url?: string | null
          signed_at?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_signers_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          artist_id: string | null
          booking_document_id: string | null
          booking_id: string | null
          contract_token: string | null
          contract_type: string
          created_at: string
          created_by: string | null
          description: string | null
          draft_id: string | null
          file_bucket: string
          file_path: string | null
          file_url: string | null
          id: string
          project_id: string | null
          release_id: string | null
          status: Database["public"]["Enums"]["contract_status"]
          title: string
          updated_at: string
        }
        Insert: {
          artist_id?: string | null
          booking_document_id?: string | null
          booking_id?: string | null
          contract_token?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          draft_id?: string | null
          file_bucket?: string
          file_path?: string | null
          file_url?: string | null
          id?: string
          project_id?: string | null
          release_id?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string | null
          booking_document_id?: string | null
          booking_id?: string | null
          contract_token?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          draft_id?: string | null
          file_bucket?: string
          file_path?: string | null
          file_url?: string | null
          id?: string
          project_id?: string | null
          release_id?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_booking_document_id_fkey"
            columns: ["booking_document_id"]
            isOneToOne: false
            referencedRelation: "booking_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "contract_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          note: string
          release_id: string
          scope: string
          track_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          note: string
          release_id: string
          scope: string
          track_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          note?: string
          release_id?: string
          scope?: string
          track_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string | null
          created_by: string | null
          entity_type: string
          field_key: string
          field_type: string
          id: string
          label: string
          section: string | null
          sort_order: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          entity_type: string
          field_key: string
          field_type?: string
          id?: string
          label: string
          section?: string | null
          sort_order?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          entity_type?: string
          field_key?: string
          field_type?: string
          id?: string
          label?: string
          section?: string | null
          sort_order?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_instruments: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_instruments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_pros: {
        Row: {
          country: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_pros_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_room_types: {
        Row: {
          capacity: number | null
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      default_royalty_splits: {
        Row: {
          artist_id: string
          contact_id: string | null
          created_at: string | null
          id: string
          percentage: number
          recipient_name: string
          recipient_role: string
          updated_at: string | null
        }
        Insert: {
          artist_id: string
          contact_id?: string | null
          created_at?: string | null
          id?: string
          percentage: number
          recipient_name: string
          recipient_role: string
          updated_at?: string | null
        }
        Update: {
          artist_id?: string
          contact_id?: string | null
          created_at?: string | null
          id?: string
          percentage?: number
          recipient_name?: string
          recipient_role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "default_royalty_splits_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "default_royalty_splits_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      directors: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          notes: string | null
          production_company_id: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          notes?: string | null
          production_company_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          notes?: string | null
          production_company_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "directors_production_company_id_fkey"
            columns: ["production_company_id"]
            isOneToOne: false
            referencedRelation: "production_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          artist_id: string
          category: string
          created_at: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          project_id: string | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          artist_id: string
          category: string
          created_at?: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          project_id?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          artist_id?: string
          category?: string
          created_at?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          project_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          access_token: string | null
          created_at: string
          display_name: string | null
          email_address: string
          id: string
          last_sync_at: string | null
          provider: Database["public"]["Enums"]["email_provider"]
          refresh_token: string | null
          sync_cursor: string | null
          sync_enabled: boolean
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          display_name?: string | null
          email_address: string
          id?: string
          last_sync_at?: string | null
          provider: Database["public"]["Enums"]["email_provider"]
          refresh_token?: string | null
          sync_cursor?: string | null
          sync_enabled?: boolean
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          display_name?: string | null
          email_address?: string
          id?: string
          last_sync_at?: string | null
          provider?: Database["public"]["Enums"]["email_provider"]
          refresh_token?: string | null
          sync_cursor?: string | null
          sync_enabled?: boolean
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_attachments: {
        Row: {
          email_message_id: string
          filename: string
          id: string
          mime_type: string | null
          provider_attachment_id: string | null
          size_bytes: number | null
        }
        Insert: {
          email_message_id: string
          filename: string
          id?: string
          mime_type?: string | null
          provider_attachment_id?: string | null
          size_bytes?: number | null
        }
        Update: {
          email_message_id?: string
          filename?: string
          id?: string
          mime_type?: string | null
          provider_attachment_id?: string | null
          size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_attachments_email_message_id_fkey"
            columns: ["email_message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_links: {
        Row: {
          created_at: string
          email_message_id: string
          id: string
          link_type: Database["public"]["Enums"]["email_link_type"]
          linked_automatically: boolean
          linked_by: string | null
          linked_entity_id: string
        }
        Insert: {
          created_at?: string
          email_message_id: string
          id?: string
          link_type: Database["public"]["Enums"]["email_link_type"]
          linked_automatically?: boolean
          linked_by?: string | null
          linked_entity_id: string
        }
        Update: {
          created_at?: string
          email_message_id?: string
          id?: string
          link_type?: Database["public"]["Enums"]["email_link_type"]
          linked_automatically?: boolean
          linked_by?: string | null
          linked_entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_links_email_message_id_fkey"
            columns: ["email_message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          body_html: string | null
          body_text: string | null
          cc_addresses: Json | null
          created_at: string
          date: string | null
          email_account_id: string
          folder: string
          from_address: string | null
          from_name: string | null
          has_attachments: boolean
          id: string
          is_draft: boolean
          is_read: boolean
          is_starred: boolean
          labels: Json | null
          provider_message_id: string
          snippet: string | null
          subject: string | null
          thread_id: string | null
          to_addresses: Json | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          cc_addresses?: Json | null
          created_at?: string
          date?: string | null
          email_account_id: string
          folder?: string
          from_address?: string | null
          from_name?: string | null
          has_attachments?: boolean
          id?: string
          is_draft?: boolean
          is_read?: boolean
          is_starred?: boolean
          labels?: Json | null
          provider_message_id: string
          snippet?: string | null
          subject?: string | null
          thread_id?: string | null
          to_addresses?: Json | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          cc_addresses?: Json | null
          created_at?: string
          date?: string | null
          email_account_id?: string
          folder?: string
          from_address?: string | null
          from_name?: string | null
          has_attachments?: boolean
          id?: string
          is_draft?: boolean
          is_read?: boolean
          is_starred?: boolean
          labels?: Json | null
          provider_message_id?: string
          snippet?: string | null
          subject?: string | null
          thread_id?: string | null
          to_addresses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_signatures: {
        Row: {
          created_at: string
          html_content: string
          id: string
          is_default: boolean
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          html_content?: string
          id?: string
          is_default?: boolean
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          html_content?: string
          id?: string
          is_default?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      epk_analytics: {
        Row: {
          accion: string | null
          created_at: string | null
          epk_id: string
          id: string
          ip_address: unknown
          recurso: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          accion?: string | null
          created_at?: string | null
          epk_id: string
          id?: string
          ip_address?: unknown
          recurso?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          accion?: string | null
          created_at?: string | null
          epk_id?: string
          id?: string
          ip_address?: unknown
          recurso?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epk_analytics_epk_id_fkey"
            columns: ["epk_id"]
            isOneToOne: false
            referencedRelation: "epks"
            referencedColumns: ["id"]
          },
        ]
      }
      epk_audios: {
        Row: {
          creado_en: string | null
          epk_id: string
          id: string
          orden: number | null
          titulo: string
          url: string
        }
        Insert: {
          creado_en?: string | null
          epk_id: string
          id?: string
          orden?: number | null
          titulo: string
          url: string
        }
        Update: {
          creado_en?: string | null
          epk_id?: string
          id?: string
          orden?: number | null
          titulo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "epk_audios_epk_id_fkey"
            columns: ["epk_id"]
            isOneToOne: false
            referencedRelation: "epks"
            referencedColumns: ["id"]
          },
        ]
      }
      epk_documentos: {
        Row: {
          creado_en: string | null
          epk_id: string
          file_size: number | null
          file_type: string | null
          id: string
          orden: number | null
          tipo: string | null
          titulo: string
          url: string
        }
        Insert: {
          creado_en?: string | null
          epk_id: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          orden?: number | null
          tipo?: string | null
          titulo: string
          url: string
        }
        Update: {
          creado_en?: string | null
          epk_id?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          orden?: number | null
          tipo?: string | null
          titulo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "epk_documentos_epk_id_fkey"
            columns: ["epk_id"]
            isOneToOne: false
            referencedRelation: "epks"
            referencedColumns: ["id"]
          },
        ]
      }
      epk_fotos: {
        Row: {
          creado_en: string | null
          descargable: boolean | null
          epk_id: string
          id: string
          orden: number | null
          titulo: string | null
          url: string
        }
        Insert: {
          creado_en?: string | null
          descargable?: boolean | null
          epk_id: string
          id?: string
          orden?: number | null
          titulo?: string | null
          url: string
        }
        Update: {
          creado_en?: string | null
          descargable?: boolean | null
          epk_id?: string
          id?: string
          orden?: number | null
          titulo?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "epk_fotos_epk_id_fkey"
            columns: ["epk_id"]
            isOneToOne: false
            referencedRelation: "epks"
            referencedColumns: ["id"]
          },
        ]
      }
      epk_password_attempts: {
        Row: {
          created_at: string
          epk_slug: string
          failed_attempts: number
          id: string
          ip_address: unknown
          last_attempt_at: string
          locked_until: string | null
        }
        Insert: {
          created_at?: string
          epk_slug: string
          failed_attempts?: number
          id?: string
          ip_address?: unknown
          last_attempt_at?: string
          locked_until?: string | null
        }
        Update: {
          created_at?: string
          epk_slug?: string
          failed_attempts?: number
          id?: string
          ip_address?: unknown
          last_attempt_at?: string
          locked_until?: string | null
        }
        Relationships: []
      }
      epk_videos: {
        Row: {
          creado_en: string | null
          epk_id: string
          id: string
          orden: number | null
          privado: boolean | null
          tipo: Database["public"]["Enums"]["epk_video_type"]
          titulo: string
          url: string | null
          video_id: string | null
        }
        Insert: {
          creado_en?: string | null
          epk_id: string
          id?: string
          orden?: number | null
          privado?: boolean | null
          tipo: Database["public"]["Enums"]["epk_video_type"]
          titulo: string
          url?: string | null
          video_id?: string | null
        }
        Update: {
          creado_en?: string | null
          epk_id?: string
          id?: string
          orden?: number | null
          privado?: boolean | null
          tipo?: Database["public"]["Enums"]["epk_video_type"]
          titulo?: string
          url?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epk_videos_epk_id_fkey"
            columns: ["epk_id"]
            isOneToOne: false
            referencedRelation: "epks"
            referencedColumns: ["id"]
          },
        ]
      }
      epks: {
        Row: {
          acceso_directo: boolean
          actualizado_en: string | null
          artist_id: string | null
          artista_proyecto: string
          bio_corta: string | null
          booking: Json | null
          coordinadora_booking: Json | null
          creado_en: string | null
          creado_por: string
          descargas_totales: number | null
          etiquetas: string[] | null
          expira_el: string | null
          id: string
          imagen_portada: string | null
          management: Json | null
          nota_prensa_pdf: string | null
          password_hash: string | null
          permitir_zip: boolean | null
          presupuesto_id: string | null
          proyecto_id: string | null
          rastrear_analiticas: boolean | null
          slug: string
          tagline: string | null
          tema: Database["public"]["Enums"]["epk_theme"] | null
          titulo: string
          tour_manager: Json | null
          tour_production: Json | null
          ultima_vista_en: string | null
          visibilidad: Database["public"]["Enums"]["epk_visibility"] | null
          vistas_totales: number | null
          vistas_unicas: number | null
        }
        Insert: {
          acceso_directo?: boolean
          actualizado_en?: string | null
          artist_id?: string | null
          artista_proyecto: string
          bio_corta?: string | null
          booking?: Json | null
          coordinadora_booking?: Json | null
          creado_en?: string | null
          creado_por: string
          descargas_totales?: number | null
          etiquetas?: string[] | null
          expira_el?: string | null
          id?: string
          imagen_portada?: string | null
          management?: Json | null
          nota_prensa_pdf?: string | null
          password_hash?: string | null
          permitir_zip?: boolean | null
          presupuesto_id?: string | null
          proyecto_id?: string | null
          rastrear_analiticas?: boolean | null
          slug: string
          tagline?: string | null
          tema?: Database["public"]["Enums"]["epk_theme"] | null
          titulo: string
          tour_manager?: Json | null
          tour_production?: Json | null
          ultima_vista_en?: string | null
          visibilidad?: Database["public"]["Enums"]["epk_visibility"] | null
          vistas_totales?: number | null
          vistas_unicas?: number | null
        }
        Update: {
          acceso_directo?: boolean
          actualizado_en?: string | null
          artist_id?: string | null
          artista_proyecto?: string
          bio_corta?: string | null
          booking?: Json | null
          coordinadora_booking?: Json | null
          creado_en?: string | null
          creado_por?: string
          descargas_totales?: number | null
          etiquetas?: string[] | null
          expira_el?: string | null
          id?: string
          imagen_portada?: string | null
          management?: Json | null
          nota_prensa_pdf?: string | null
          password_hash?: string | null
          permitir_zip?: boolean | null
          presupuesto_id?: string | null
          proyecto_id?: string | null
          rastrear_analiticas?: boolean | null
          slug?: string
          tagline?: string | null
          tema?: Database["public"]["Enums"]["epk_theme"] | null
          titulo?: string
          tour_manager?: Json | null
          tour_production?: Json | null
          ultima_vista_en?: string | null
          visibilidad?: Database["public"]["Enums"]["epk_visibility"] | null
          vistas_totales?: number | null
          vistas_unicas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "epks_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epks_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epks_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epks_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "epks_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      event_artists: {
        Row: {
          artist_id: string
          created_at: string | null
          event_id: string
          id: string
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          event_id: string
          id?: string
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
        }
        Relationships: []
      }
      event_document_index: {
        Row: {
          content_fragment: string
          created_at: string
          embedding_data: Json | null
          event_id: string
          file_name: string
          file_path: string
          fragment_index: number
          id: string
          metadata: Json | null
          page_number: number | null
          subfolder: string
          updated_at: string
        }
        Insert: {
          content_fragment: string
          created_at?: string
          embedding_data?: Json | null
          event_id: string
          file_name: string
          file_path: string
          fragment_index?: number
          id?: string
          metadata?: Json | null
          page_number?: number | null
          subfolder: string
          updated_at?: string
        }
        Update: {
          content_fragment?: string
          created_at?: string
          embedding_data?: Json | null
          event_id?: string
          file_name?: string
          file_path?: string
          fragment_index?: number
          id?: string
          metadata?: Json | null
          page_number?: number | null
          subfolder?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_index_status: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          id: string
          last_indexed_at: string | null
          metadata: Json | null
          processed_documents: number
          status: string
          total_documents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          id?: string
          last_indexed_at?: string | null
          metadata?: Json | null
          processed_documents?: number
          status?: string
          total_documents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          id?: string
          last_indexed_at?: string | null
          metadata?: Json | null
          processed_documents?: number
          status?: string
          total_documents?: number
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          artist_id: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          event_type: string
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          event_type: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          event_type?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_reports: {
        Row: {
          amount: number
          artist_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          period_end: string
          period_start: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          artist_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          period_end: string
          period_start: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          artist_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          period_end?: string
          period_start?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_reports_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      functional_role_default_permissions: {
        Row: {
          created_at: string
          id: string
          level: Database["public"]["Enums"]["permission_level"]
          module: string
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["permission_level"]
          module: string
          role_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["permission_level"]
          module?: string
          role_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      functional_role_permission_overrides: {
        Row: {
          created_at: string
          id: string
          level: Database["public"]["Enums"]["permission_level"]
          module: string
          role_name: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: Database["public"]["Enums"]["permission_level"]
          module: string
          role_name: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["permission_level"]
          module?: string
          role_name?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "functional_role_permission_overrides_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["workspace_role"]
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["workspace_role"]
          token: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      irpf_quarter_status: {
        Row: {
          created_at: string
          ejercicio: number
          fecha_presentacion: string | null
          id: string
          presentado: boolean
          presentado_por: string | null
          trimestre: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          ejercicio: number
          fecha_presentacion?: string | null
          id?: string
          presentado?: boolean
          presentado_por?: string | null
          trimestre: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          ejercicio?: number
          fecha_presentacion?: string | null
          id?: string
          presentado?: boolean
          presentado_por?: string | null
          trimestre?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "irpf_quarter_status_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      irpf_retentions: {
        Row: {
          artist_id: string | null
          base_imponible: number
          budget_id: string | null
          budget_item_id: string | null
          concepto: string
          created_at: string
          created_by: string
          ejercicio: number
          fecha_pago: string | null
          id: string
          importe_retenido: number
          irpf_percentage: number
          is_manual: boolean
          provider_name: string
          provider_nif: string | null
          trimestre: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          artist_id?: string | null
          base_imponible?: number
          budget_id?: string | null
          budget_item_id?: string | null
          concepto: string
          created_at?: string
          created_by: string
          ejercicio: number
          fecha_pago?: string | null
          id?: string
          importe_retenido?: number
          irpf_percentage?: number
          is_manual?: boolean
          provider_name: string
          provider_nif?: string | null
          trimestre: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          artist_id?: string | null
          base_imponible?: number
          budget_id?: string | null
          budget_item_id?: string | null
          concepto?: string
          created_at?: string
          created_by?: string
          ejercicio?: number
          fecha_pago?: string | null
          id?: string
          importe_retenido?: number
          irpf_percentage?: number
          is_manual?: boolean
          provider_name?: string
          provider_nif?: string | null
          trimestre?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "irpf_retentions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irpf_retentions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irpf_retentions_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "budget_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irpf_retentions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          artist_id: string
          created_at: string | null
          document_type: string
          end_date: string | null
          file_name: string
          file_url: string
          id: string
          is_active: boolean | null
          notes: string | null
          renewal_alert_days: number | null
          start_date: string | null
          title: string
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          document_type: string
          end_date?: string | null
          file_name: string
          file_url: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          renewal_alert_days?: number | null
          start_date?: string | null
          title: string
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          document_type?: string
          end_date?: string | null
          file_name?: string
          file_url?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          renewal_alert_days?: number | null
          start_date?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidaciones: {
        Row: {
          artist_id: string | null
          booking_id: string | null
          cache_bruto: number
          concepto: string
          created_at: string
          created_by: string
          fecha_pago: string | null
          id: string
          irpf_amount: number | null
          irpf_pct: number
          metodo_pago: string | null
          neto_a_transferir: number | null
          notes: string | null
          project_id: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          artist_id?: string | null
          booking_id?: string | null
          cache_bruto?: number
          concepto: string
          created_at?: string
          created_by: string
          fecha_pago?: string | null
          id?: string
          irpf_amount?: number | null
          irpf_pct?: number
          metodo_pago?: string | null
          neto_a_transferir?: number | null
          notes?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          artist_id?: string | null
          booking_id?: string | null
          cache_bruto?: number
          concepto?: string
          created_at?: string
          created_by?: string
          fecha_pago?: string | null
          id?: string
          irpf_amount?: number | null
          irpf_pct?: number
          metodo_pago?: string | null
          neto_a_transferir?: number | null
          notes?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liquidaciones_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidaciones_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidaciones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "liquidaciones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidaciones_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      media_library: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          duration: number | null
          file_bucket: string
          file_path: string
          file_size: number | null
          file_type: string
          file_url: string
          height: number | null
          id: string
          last_used_at: string | null
          mime_type: string | null
          platform: string | null
          subcategory: string | null
          tags: string[] | null
          title: string
          updated_at: string
          usage_count: number | null
          video_id: string | null
          width: number | null
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration?: number | null
          file_bucket?: string
          file_path: string
          file_size?: number | null
          file_type: string
          file_url: string
          height?: number | null
          id?: string
          last_used_at?: string | null
          mime_type?: string | null
          platform?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          usage_count?: number | null
          video_id?: string | null
          width?: number | null
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration?: number | null
          file_bucket?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          height?: number | null
          id?: string
          last_used_at?: string | null
          mime_type?: string | null
          platform?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          usage_count?: number | null
          video_id?: string | null
          width?: number | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_id: string | null
          scheduled_for: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_id?: string | null
          scheduled_for?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_id?: string | null
          scheduled_for?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payment_alerts: {
        Row: {
          alert_date: string
          alert_type: string
          booking_id: string | null
          created_at: string
          days_before: number | null
          dismissed: boolean | null
          dismissed_by: string | null
          id: string
          is_sent: boolean | null
          payment_schedule_id: string | null
          sent_at: string | null
        }
        Insert: {
          alert_date: string
          alert_type: string
          booking_id?: string | null
          created_at?: string
          days_before?: number | null
          dismissed?: boolean | null
          dismissed_by?: string | null
          id?: string
          is_sent?: boolean | null
          payment_schedule_id?: string | null
          sent_at?: string | null
        }
        Update: {
          alert_date?: string
          alert_type?: string
          booking_id?: string | null
          created_at?: string
          days_before?: number | null
          dismissed?: boolean | null
          dismissed_by?: string | null
          id?: string
          is_sent?: boolean | null
          payment_schedule_id?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_alerts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_alerts_payment_schedule_id_fkey"
            columns: ["payment_schedule_id"]
            isOneToOne: false
            referencedRelation: "payment_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_schedules: {
        Row: {
          amount: number
          booking_id: string | null
          budget_id: string | null
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          invoice_number: string | null
          invoice_status: string
          invoice_url: string | null
          notes: string | null
          payment_status: string
          payment_type: string
          percentage: number | null
          received_date: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          budget_id?: string | null
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_status?: string
          invoice_url?: string | null
          notes?: string | null
          payment_status?: string
          payment_type: string
          percentage?: number | null
          received_date?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          budget_id?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_status?: string
          invoice_url?: string | null
          notes?: string | null
          payment_status?: string
          payment_type?: string
          percentage?: number | null
          received_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedules_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      pitches: {
        Row: {
          additional_info: string | null
          artist_bio: string | null
          artist_photos_link: string | null
          audio_link: string | null
          country: string | null
          created_at: string
          created_by: string
          future_planning: string | null
          general_strategy: string | null
          id: string
          instruments: string | null
          mood: string | null
          name: string
          pitch_config: Json | null
          pitch_deadline: string | null
          pitch_status: string
          pitch_token: string | null
          pitch_type: string
          release_id: string
          social_links: string | null
          spotify_followers: number | null
          spotify_milestones: string | null
          spotify_monthly_listeners: number | null
          spotify_photos_link: string | null
          spotify_strategy: string | null
          synopsis: string | null
          track_id: string | null
          updated_at: string
          vevo_brand_notes: string | null
          vevo_content_type: string | null
          vevo_is_new_edit: boolean | null
          vevo_link: string | null
          vevo_premiere_date: string | null
          video_link: string | null
        }
        Insert: {
          additional_info?: string | null
          artist_bio?: string | null
          artist_photos_link?: string | null
          audio_link?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          future_planning?: string | null
          general_strategy?: string | null
          id?: string
          instruments?: string | null
          mood?: string | null
          name?: string
          pitch_config?: Json | null
          pitch_deadline?: string | null
          pitch_status?: string
          pitch_token?: string | null
          pitch_type?: string
          release_id: string
          social_links?: string | null
          spotify_followers?: number | null
          spotify_milestones?: string | null
          spotify_monthly_listeners?: number | null
          spotify_photos_link?: string | null
          spotify_strategy?: string | null
          synopsis?: string | null
          track_id?: string | null
          updated_at?: string
          vevo_brand_notes?: string | null
          vevo_content_type?: string | null
          vevo_is_new_edit?: boolean | null
          vevo_link?: string | null
          vevo_premiere_date?: string | null
          video_link?: string | null
        }
        Update: {
          additional_info?: string | null
          artist_bio?: string | null
          artist_photos_link?: string | null
          audio_link?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          future_planning?: string | null
          general_strategy?: string | null
          id?: string
          instruments?: string | null
          mood?: string | null
          name?: string
          pitch_config?: Json | null
          pitch_deadline?: string | null
          pitch_status?: string
          pitch_token?: string | null
          pitch_type?: string
          release_id?: string
          social_links?: string | null
          spotify_followers?: number | null
          spotify_milestones?: string | null
          spotify_monthly_listeners?: number | null
          spotify_photos_link?: string | null
          spotify_strategy?: string | null
          synopsis?: string | null
          track_id?: string | null
          updated_at?: string
          vevo_brand_notes?: string | null
          vevo_content_type?: string | null
          vevo_is_new_edit?: boolean | null
          vevo_link?: string | null
          vevo_premiere_date?: string | null
          video_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pitches_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitches_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_earnings: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          currency: string | null
          id: string
          period_end: string
          period_start: string
          platform: string
          royalty_type: string | null
          song_id: string | null
          streams: number | null
          track_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by: string
          currency?: string | null
          id?: string
          period_end: string
          period_start: string
          platform: string
          royalty_type?: string | null
          song_id?: string | null
          streams?: number | null
          track_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          currency?: string | null
          id?: string
          period_end?: string
          period_start?: string
          platform?: string
          royalty_type?: string | null
          song_id?: string | null
          streams?: number | null
          track_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_earnings_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_earnings_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      production_companies: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          notes: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_role: Database["public"]["Enums"]["user_role"]
          address: string | null
          allergies: string | null
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string
          dni_nie: string | null
          dni_photo_url: string | null
          drivers_license_photo_url: string | null
          email: string
          emergency_contact: string | null
          first_name: string | null
          full_name: string
          height: string | null
          home_phone: string | null
          iban: string | null
          id: string
          internal_notes: string | null
          is_smoker: boolean | null
          is_test_user: boolean | null
          jacket_size: string | null
          last_name: string | null
          license_type: string | null
          observations: string | null
          pants_size: string | null
          passport_photo_url: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          roles: Database["public"]["Enums"]["user_role"][]
          second_last_name: string | null
          shirt_size: string | null
          shoe_size: string | null
          social_security: string | null
          stage_name: string | null
          street: string | null
          team_contacts: string | null
          updated_at: string
          user_id: string
          web: string | null
          workspace_id: string | null
        }
        Insert: {
          active_role?: Database["public"]["Enums"]["user_role"]
          address?: string | null
          allergies?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          dni_nie?: string | null
          dni_photo_url?: string | null
          drivers_license_photo_url?: string | null
          email: string
          emergency_contact?: string | null
          first_name?: string | null
          full_name: string
          height?: string | null
          home_phone?: string | null
          iban?: string | null
          id?: string
          internal_notes?: string | null
          is_smoker?: boolean | null
          is_test_user?: boolean | null
          jacket_size?: string | null
          last_name?: string | null
          license_type?: string | null
          observations?: string | null
          pants_size?: string | null
          passport_photo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          roles?: Database["public"]["Enums"]["user_role"][]
          second_last_name?: string | null
          shirt_size?: string | null
          shoe_size?: string | null
          social_security?: string | null
          stage_name?: string | null
          street?: string | null
          team_contacts?: string | null
          updated_at?: string
          user_id: string
          web?: string | null
          workspace_id?: string | null
        }
        Update: {
          active_role?: Database["public"]["Enums"]["user_role"]
          address?: string | null
          allergies?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          dni_nie?: string | null
          dni_photo_url?: string | null
          drivers_license_photo_url?: string | null
          email?: string
          emergency_contact?: string | null
          first_name?: string | null
          full_name?: string
          height?: string | null
          home_phone?: string | null
          iban?: string | null
          id?: string
          internal_notes?: string | null
          is_smoker?: boolean | null
          is_test_user?: boolean | null
          jacket_size?: string | null
          last_name?: string | null
          license_type?: string | null
          observations?: string | null
          pants_size?: string | null
          passport_photo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          roles?: Database["public"]["Enums"]["user_role"][]
          second_last_name?: string | null
          shirt_size?: string | null
          shoe_size?: string | null
          social_security?: string | null
          stage_name?: string | null
          street?: string | null
          team_contacts?: string | null
          updated_at?: string
          user_id?: string
          web?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_checklist_items: {
        Row: {
          checklist_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_completed: boolean
          project_id: string
          section: string | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          checklist_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_completed?: boolean
          project_id: string
          section?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          checklist_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          project_id?: string
          section?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "project_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      project_checklists: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          project_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          project_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_checklists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_checklists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_file_links: {
        Row: {
          id: string
          linked_at: string
          linked_by: string
          notes: string | null
          project_id: string
          source_file_id: string
        }
        Insert: {
          id?: string
          linked_at?: string
          linked_by: string
          notes?: string | null
          project_id: string
          source_file_id: string
        }
        Update: {
          id?: string
          linked_at?: string
          linked_by?: string
          notes?: string | null
          project_id?: string
          source_file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_file_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_file_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_file_links_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          file_url: string
          folder_type: string
          id: string
          project_id: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          folder_type?: string
          id?: string
          project_id: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          folder_type?: string
          id?: string
          project_id?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_incidents: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          impact: string | null
          project_id: string
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          impact?: string | null
          project_id: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          impact?: string | null
          project_id?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_linked_entities: {
        Row: {
          created_at: string
          entity_date: string | null
          entity_id: string | null
          entity_name: string
          entity_status: string | null
          entity_type: string
          id: string
          linked_by: string
          project_id: string
        }
        Insert: {
          created_at?: string
          entity_date?: string | null
          entity_id?: string | null
          entity_name: string
          entity_status?: string | null
          entity_type: string
          id?: string
          linked_by: string
          project_id: string
        }
        Update: {
          created_at?: string
          entity_date?: string | null
          entity_id?: string | null
          entity_name?: string
          entity_status?: string | null
          entity_type?: string
          id?: string
          linked_by?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_linked_entities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_linked_entities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_questions: {
        Row: {
          answer: string | null
          answered_by: string | null
          asked_by: string | null
          assigned_to: string | null
          context: string | null
          created_at: string
          id: string
          priority: string
          project_id: string
          question: string
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          answered_by?: string | null
          asked_by?: string | null
          assigned_to?: string | null
          context?: string | null
          created_at?: string
          id?: string
          priority?: string
          project_id: string
          question: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          answered_by?: string | null
          asked_by?: string | null
          assigned_to?: string | null
          context?: string | null
          created_at?: string
          id?: string
          priority?: string
          project_id?: string
          question?: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_questions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_questions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_resources: {
        Row: {
          display_order: number | null
          id: string
          linked_at: string
          linked_by: string
          node_id: string
          permissions_snapshot: Json | null
          project_id: string
        }
        Insert: {
          display_order?: number | null
          id?: string
          linked_at?: string
          linked_by: string
          node_id: string
          permissions_snapshot?: Json | null
          project_id: string
        }
        Update: {
          display_order?: number | null
          id?: string
          linked_at?: string
          linked_by?: string
          node_id?: string
          permissions_snapshot?: Json | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_resources_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "storage_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_role_bindings: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_role_bindings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_role_bindings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          profile_id: string | null
          project_id: string
          role: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          profile_id?: string | null
          project_id: string
          role?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          profile_id?: string | null
          project_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_team_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_team_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived_at: string | null
          artist_id: string | null
          card_display_config: Json
          created_at: string
          created_by: string
          description: string | null
          end_date_estimada: string | null
          equipo_involucrado: string | null
          id: string
          is_folder: boolean
          labels: string[] | null
          metadata: Json | null
          name: string
          objective: string | null
          parent_folder_id: string | null
          project_type: Database["public"]["Enums"]["project_type"] | null
          public_share_enabled: boolean | null
          public_share_expires_at: string | null
          public_share_sections: Json | null
          public_share_token: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          archived_at?: string | null
          artist_id?: string | null
          card_display_config?: Json
          created_at?: string
          created_by: string
          description?: string | null
          end_date_estimada?: string | null
          equipo_involucrado?: string | null
          id?: string
          is_folder?: boolean
          labels?: string[] | null
          metadata?: Json | null
          name: string
          objective?: string | null
          parent_folder_id?: string | null
          project_type?: Database["public"]["Enums"]["project_type"] | null
          public_share_enabled?: boolean | null
          public_share_expires_at?: string | null
          public_share_sections?: Json | null
          public_share_token?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          archived_at?: string | null
          artist_id?: string | null
          card_display_config?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          end_date_estimada?: string | null
          equipo_involucrado?: string | null
          id?: string
          is_folder?: boolean
          labels?: string[] | null
          metadata?: Json | null
          name?: string
          objective?: string | null
          parent_folder_id?: string | null
          project_type?: Database["public"]["Enums"]["project_type"] | null
          public_share_enabled?: boolean | null
          public_share_expires_at?: string | null
          public_share_sections?: Json | null
          public_share_token?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "projects_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_expenses: {
        Row: {
          amount: number | null
          artist_id: string | null
          auto_link_confidence: number | null
          auto_linked: boolean | null
          booking_id: string | null
          budget_id: string | null
          budget_item_id: string | null
          created_at: string
          description: string | null
          expense_date: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          metadata: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          uploader_id: string
        }
        Insert: {
          amount?: number | null
          artist_id?: string | null
          auto_link_confidence?: number | null
          auto_linked?: boolean | null
          booking_id?: string | null
          budget_id?: string | null
          budget_item_id?: string | null
          created_at?: string
          description?: string | null
          expense_date?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          uploader_id: string
        }
        Update: {
          amount?: number | null
          artist_id?: string | null
          auto_link_confidence?: number | null
          auto_linked?: boolean | null
          booking_id?: string | null
          budget_id?: string | null
          budget_item_id?: string | null
          created_at?: string
          description?: string | null
          expense_date?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_expenses_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_expenses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_expenses_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "budget_items"
            referencedColumns: ["id"]
          },
        ]
      }
      release_artists: {
        Row: {
          artist_id: string
          created_at: string | null
          id: string
          release_id: string
          role: string
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          id?: string
          release_id: string
          role?: string
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          id?: string
          release_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_artists_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      release_asset_comments: {
        Row: {
          asset_id: string
          author_id: string
          created_at: string | null
          id: string
          message: string
        }
        Insert: {
          asset_id: string
          author_id: string
          created_at?: string | null
          id?: string
          message: string
        }
        Update: {
          asset_id?: string
          author_id?: string
          created_at?: string | null
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_asset_comments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "release_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      release_assets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          delivery_date: string | null
          description: string | null
          external_url: string | null
          file_bucket: string | null
          file_url: string
          format_spec: string | null
          id: string
          is_watermarked: boolean | null
          platform_tags: string[] | null
          release_id: string
          resolution: string | null
          section: string | null
          session_id: string | null
          sort_order: number | null
          stage: string | null
          status: string | null
          sub_type: string | null
          supplier_contact_id: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          track_id: string | null
          type: string
          uploaded_by: string | null
          version_group: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          delivery_date?: string | null
          description?: string | null
          external_url?: string | null
          file_bucket?: string | null
          file_url: string
          format_spec?: string | null
          id?: string
          is_watermarked?: boolean | null
          platform_tags?: string[] | null
          release_id: string
          resolution?: string | null
          section?: string | null
          session_id?: string | null
          sort_order?: number | null
          stage?: string | null
          status?: string | null
          sub_type?: string | null
          supplier_contact_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          track_id?: string | null
          type: string
          uploaded_by?: string | null
          version_group?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          delivery_date?: string | null
          description?: string | null
          external_url?: string | null
          file_bucket?: string | null
          file_url?: string
          format_spec?: string | null
          id?: string
          is_watermarked?: boolean | null
          platform_tags?: string[] | null
          release_id?: string
          resolution?: string | null
          section?: string | null
          session_id?: string | null
          sort_order?: number | null
          stage?: string | null
          status?: string | null
          sub_type?: string | null
          supplier_contact_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          track_id?: string | null
          type?: string
          uploaded_by?: string | null
          version_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "release_assets_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_assets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "release_photo_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_assets_supplier_contact_id_fkey"
            columns: ["supplier_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_assets_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      release_budgets: {
        Row: {
          actual_cost: number | null
          category: string
          created_at: string
          estimated_cost: number | null
          id: string
          item_name: string
          notes: string | null
          release_id: string
          status: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          actual_cost?: number | null
          category: string
          created_at?: string
          estimated_cost?: number | null
          id?: string
          item_name: string
          notes?: string | null
          release_id: string
          status?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          actual_cost?: number | null
          category?: string
          created_at?: string
          estimated_cost?: number | null
          id?: string
          item_name?: string
          notes?: string | null
          release_id?: string
          status?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "release_budgets_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      release_documents: {
        Row: {
          content: string | null
          contract_token: string | null
          created_at: string | null
          created_by: string | null
          document_type: string
          file_name: string
          file_type: string | null
          file_url: string | null
          id: string
          notes: string | null
          release_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          contract_token?: string | null
          created_at?: string | null
          created_by?: string | null
          document_type?: string
          file_name: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          release_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          contract_token?: string | null
          created_at?: string | null
          created_by?: string | null
          document_type?: string
          file_name?: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          release_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "release_documents_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      release_milestones: {
        Row: {
          category: string | null
          created_at: string
          days_offset: number | null
          due_date: string | null
          id: string
          is_anchor: boolean | null
          metadata: Json | null
          notes: string | null
          release_id: string
          responsible: string | null
          sort_order: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          days_offset?: number | null
          due_date?: string | null
          id?: string
          is_anchor?: boolean | null
          metadata?: Json | null
          notes?: string | null
          release_id: string
          responsible?: string | null
          sort_order?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          days_offset?: number | null
          due_date?: string | null
          id?: string
          is_anchor?: boolean | null
          metadata?: Json | null
          notes?: string | null
          release_id?: string
          responsible?: string | null
          sort_order?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_milestones_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      release_photo_sessions: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          photographer: string | null
          release_id: string
          session_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          photographer?: string | null
          release_id: string
          session_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          photographer?: string | null
          release_id?: string
          session_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "release_photo_sessions_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          artist_id: string | null
          copyright: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          general_strategy: string | null
          genre: string | null
          id: string
          label: string | null
          language: string | null
          mood: string | null
          pitch_config: Json | null
          pitch_deadline: string | null
          pitch_status: Database["public"]["Enums"]["pitch_status"] | null
          pitch_token: string | null
          production_year: number | null
          project_id: string | null
          release_date: string | null
          secondary_genre: string | null
          share_enabled: boolean | null
          share_expires_at: string | null
          share_token: string | null
          social_links: string | null
          spotify_followers: number | null
          spotify_id: string | null
          spotify_milestones: string | null
          spotify_monthly_listeners: number | null
          spotify_strategy: string | null
          spotify_url: string | null
          status: string
          synopsis: string | null
          title: string
          type: string
          upc: string | null
          updated_at: string
        }
        Insert: {
          artist_id?: string | null
          copyright?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          general_strategy?: string | null
          genre?: string | null
          id?: string
          label?: string | null
          language?: string | null
          mood?: string | null
          pitch_config?: Json | null
          pitch_deadline?: string | null
          pitch_status?: Database["public"]["Enums"]["pitch_status"] | null
          pitch_token?: string | null
          production_year?: number | null
          project_id?: string | null
          release_date?: string | null
          secondary_genre?: string | null
          share_enabled?: boolean | null
          share_expires_at?: string | null
          share_token?: string | null
          social_links?: string | null
          spotify_followers?: number | null
          spotify_id?: string | null
          spotify_milestones?: string | null
          spotify_monthly_listeners?: number | null
          spotify_strategy?: string | null
          spotify_url?: string | null
          status?: string
          synopsis?: string | null
          title: string
          type?: string
          upc?: string | null
          updated_at?: string
        }
        Update: {
          artist_id?: string | null
          copyright?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          general_strategy?: string | null
          genre?: string | null
          id?: string
          label?: string | null
          language?: string | null
          mood?: string | null
          pitch_config?: Json | null
          pitch_deadline?: string | null
          pitch_status?: Database["public"]["Enums"]["pitch_status"] | null
          pitch_token?: string | null
          production_year?: number | null
          project_id?: string | null
          release_date?: string | null
          secondary_genre?: string | null
          share_enabled?: boolean | null
          share_expires_at?: string | null
          share_token?: string | null
          social_links?: string | null
          spotify_followers?: number | null
          spotify_id?: string | null
          spotify_milestones?: string | null
          spotify_monthly_listeners?: number | null
          spotify_strategy?: string | null
          spotify_url?: string | null
          status?: string
          synopsis?: string | null
          title?: string
          type?: string
          upc?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "releases_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "releases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "releases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          artist_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          management_id: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          management_id: string
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          management_id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_management_id_fkey"
            columns: ["management_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_locations: {
        Row: {
          artist_id: string
          category: string | null
          city: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          artist_id: string
          category?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          artist_id?: string
          category?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_locations_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      royalty_earnings: {
        Row: {
          amount: number
          artist_id: string | null
          created_at: string
          created_by: string
          id: string
          metadata: Json | null
          notes: string | null
          period_end: string
          period_start: string
          platform: string
          song_id: string
          streams: number | null
          updated_at: string
        }
        Insert: {
          amount?: number
          artist_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          period_end: string
          period_start: string
          platform: string
          song_id: string
          streams?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          artist_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          period_end?: string
          period_start?: string
          platform?: string
          song_id?: string
          streams?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "royalty_earnings_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "royalty_earnings_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      royalty_payments: {
        Row: {
          calculated_amount: number
          created_at: string
          created_by: string
          id: string
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_proof_url: string | null
          period_end: string
          period_start: string
          split_id: string
          status: string
          updated_at: string
        }
        Insert: {
          calculated_amount?: number
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_proof_url?: string | null
          period_end: string
          period_start: string
          split_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          calculated_amount?: number
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_proof_url?: string | null
          period_end?: string
          period_start?: string
          split_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "royalty_payments_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "royalty_splits"
            referencedColumns: ["id"]
          },
        ]
      }
      royalty_splits: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          percentage: number
          role: string | null
          song_id: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          percentage: number
          role?: string | null
          song_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          percentage?: number
          role?: string | null
          song_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "royalty_splits_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "royalty_splits_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitud_decision_messages: {
        Row: {
          author_name: string | null
          author_profile_id: string | null
          created_at: string
          id: string
          is_system: boolean
          message: string
          solicitud_id: string
        }
        Insert: {
          author_name?: string | null
          author_profile_id?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          message: string
          solicitud_id: string
        }
        Update: {
          author_name?: string | null
          author_profile_id?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          message?: string
          solicitud_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitud_decision_messages_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitud_decision_messages_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitud_history: {
        Row: {
          changed_at: string
          changed_by_profile_id: string
          changes: Json
          condicion: string | null
          estado: Database["public"]["Enums"]["request_status"]
          event_type: string
          id: string
          message: string | null
          nota: string | null
          related_message_id: string | null
          solicitud_id: string
        }
        Insert: {
          changed_at?: string
          changed_by_profile_id: string
          changes?: Json
          condicion?: string | null
          estado: Database["public"]["Enums"]["request_status"]
          event_type?: string
          id?: string
          message?: string | null
          nota?: string | null
          related_message_id?: string | null
          solicitud_id: string
        }
        Update: {
          changed_at?: string
          changed_by_profile_id?: string
          changes?: Json
          condicion?: string | null
          estado?: Database["public"]["Enums"]["request_status"]
          event_type?: string
          id?: string
          message?: string | null
          nota?: string | null
          related_message_id?: string | null
          solicitud_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitud_history_changed_by_profile_id_fkey"
            columns: ["changed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitud_history_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes: {
        Row: {
          archived: boolean
          archivos_adjuntos: Json | null
          artist_id: string | null
          booking_id: string | null
          booking_status: string | null
          capacidad: number | null
          ciudad: string | null
          comentario_estado: string | null
          condiciones: string | null
          contact_id: string | null
          created_by: string
          current_approvals: string[] | null
          deal_type: string | null
          decision_fecha: string | null
          decision_has_new_comment: boolean
          decision_por: string | null
          descripcion_libre: string | null
          direccion: string | null
          door_split_percentage: number | null
          email: string | null
          estado: Database["public"]["Enums"]["request_status"]
          fecha_actualizacion: string
          fecha_creacion: string
          fecha_limite_respuesta: string | null
          fechas_opcionales: Json | null
          fee: number | null
          formato: string | null
          hora_entrevista: string | null
          hora_show: string | null
          id: string
          informacion_programa: string | null
          lugar_concierto: string | null
          medio: string | null
          nombre_entrevistador: string | null
          nombre_festival: string | null
          nombre_programa: string | null
          nombre_solicitante: string
          notas_internas: string | null
          observaciones: string | null
          oferta: string | null
          pais: string | null
          prioridad: string | null
          project_id: string | null
          promotor_contact_id: string | null
          required_approvers: string[] | null
          telefono: string | null
          tipo: Database["public"]["Enums"]["request_type"]
        }
        Insert: {
          archived?: boolean
          archivos_adjuntos?: Json | null
          artist_id?: string | null
          booking_id?: string | null
          booking_status?: string | null
          capacidad?: number | null
          ciudad?: string | null
          comentario_estado?: string | null
          condiciones?: string | null
          contact_id?: string | null
          created_by: string
          current_approvals?: string[] | null
          deal_type?: string | null
          decision_fecha?: string | null
          decision_has_new_comment?: boolean
          decision_por?: string | null
          descripcion_libre?: string | null
          direccion?: string | null
          door_split_percentage?: number | null
          email?: string | null
          estado?: Database["public"]["Enums"]["request_status"]
          fecha_actualizacion?: string
          fecha_creacion?: string
          fecha_limite_respuesta?: string | null
          fechas_opcionales?: Json | null
          fee?: number | null
          formato?: string | null
          hora_entrevista?: string | null
          hora_show?: string | null
          id?: string
          informacion_programa?: string | null
          lugar_concierto?: string | null
          medio?: string | null
          nombre_entrevistador?: string | null
          nombre_festival?: string | null
          nombre_programa?: string | null
          nombre_solicitante: string
          notas_internas?: string | null
          observaciones?: string | null
          oferta?: string | null
          pais?: string | null
          prioridad?: string | null
          project_id?: string | null
          promotor_contact_id?: string | null
          required_approvers?: string[] | null
          telefono?: string | null
          tipo: Database["public"]["Enums"]["request_type"]
        }
        Update: {
          archived?: boolean
          archivos_adjuntos?: Json | null
          artist_id?: string | null
          booking_id?: string | null
          booking_status?: string | null
          capacidad?: number | null
          ciudad?: string | null
          comentario_estado?: string | null
          condiciones?: string | null
          contact_id?: string | null
          created_by?: string
          current_approvals?: string[] | null
          deal_type?: string | null
          decision_fecha?: string | null
          decision_has_new_comment?: boolean
          decision_por?: string | null
          descripcion_libre?: string | null
          direccion?: string | null
          door_split_percentage?: number | null
          email?: string | null
          estado?: Database["public"]["Enums"]["request_status"]
          fecha_actualizacion?: string
          fecha_creacion?: string
          fecha_limite_respuesta?: string | null
          fechas_opcionales?: Json | null
          fee?: number | null
          formato?: string | null
          hora_entrevista?: string | null
          hora_show?: string | null
          id?: string
          informacion_programa?: string | null
          lugar_concierto?: string | null
          medio?: string | null
          nombre_entrevistador?: string | null
          nombre_festival?: string | null
          nombre_programa?: string | null
          nombre_solicitante?: string
          notas_internas?: string | null
          observaciones?: string | null
          oferta?: string | null
          pais?: string | null
          prioridad?: string | null
          project_id?: string | null
          promotor_contact_id?: string | null
          required_approvers?: string[] | null
          telefono?: string | null
          tipo?: Database["public"]["Enums"]["request_type"]
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "solicitudes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "solicitudes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_promotor_contact_id_fkey"
            columns: ["promotor_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      song_splits: {
        Row: {
          collaborator_contact_id: string | null
          collaborator_email: string | null
          collaborator_name: string
          created_at: string
          created_by: string
          id: string
          payment_info: string | null
          percentage: number
          role: string
          song_id: string
          updated_at: string
        }
        Insert: {
          collaborator_contact_id?: string | null
          collaborator_email?: string | null
          collaborator_name: string
          created_at?: string
          created_by: string
          id?: string
          payment_info?: string | null
          percentage: number
          role?: string
          song_id: string
          updated_at?: string
        }
        Update: {
          collaborator_contact_id?: string | null
          collaborator_email?: string | null
          collaborator_name?: string
          created_at?: string
          created_by?: string
          id?: string
          payment_info?: string | null
          percentage?: number
          role?: string
          song_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_splits_collaborator_contact_id_fkey"
            columns: ["collaborator_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_splits_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          artist_id: string | null
          created_at: string
          created_by: string
          id: string
          isrc: string | null
          metadata: Json | null
          release_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          artist_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          isrc?: string | null
          metadata?: Json | null
          release_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          isrc?: string | null
          metadata?: Json | null
          release_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "songs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_nodes: {
        Row: {
          artist_id: string
          created_at: string
          created_by: string
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_system_folder: boolean | null
          metadata: Json | null
          name: string
          node_type: Database["public"]["Enums"]["node_type"]
          parent_id: string | null
          storage_bucket: string | null
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          created_by: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_system_folder?: boolean | null
          metadata?: Json | null
          name: string
          node_type?: Database["public"]["Enums"]["node_type"]
          parent_id?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          created_by?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_system_folder?: boolean | null
          metadata?: Json | null
          name?: string
          node_type?: Database["public"]["Enums"]["node_type"]
          parent_id?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_nodes_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "storage_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_form_links: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          title: string | null
          token: string
          use_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          title?: string | null
          token?: string
          use_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          title?: string | null
          token?: string
          use_count?: number
        }
        Relationships: []
      }
      sync_offers: {
        Row: {
          artist_id: string | null
          contact_id: string | null
          contract_url: string | null
          created_at: string
          created_by: string
          currency: string | null
          deadline: string | null
          director: string | null
          director_id: string | null
          duration_years: number | null
          form_link_id: string | null
          id: string
          internal_notes: string | null
          is_external_submission: boolean | null
          master_fee: number | null
          master_holder: string | null
          master_percentage: number | null
          media: string[] | null
          music_budget: number | null
          notes: string | null
          phase: string | null
          priority: string | null
          production_company: string | null
          production_company_id: string | null
          production_title: string
          production_type: string
          project_id: string | null
          publishing_fee: number | null
          publishing_holder: string | null
          publishing_percentage: number | null
          requester_company: string | null
          requester_contact_id: string | null
          requester_email: string | null
          requester_name: string | null
          requester_phone: string | null
          review_status: string | null
          scene_description: string | null
          song_artist: string | null
          song_id: string | null
          song_title: string
          suggested_artist_id: string | null
          suggested_song_id: string | null
          sync_fee: number | null
          territory: string | null
          total_budget: number | null
          updated_at: string
          usage_duration: string | null
          usage_type: string | null
        }
        Insert: {
          artist_id?: string | null
          contact_id?: string | null
          contract_url?: string | null
          created_at?: string
          created_by: string
          currency?: string | null
          deadline?: string | null
          director?: string | null
          director_id?: string | null
          duration_years?: number | null
          form_link_id?: string | null
          id?: string
          internal_notes?: string | null
          is_external_submission?: boolean | null
          master_fee?: number | null
          master_holder?: string | null
          master_percentage?: number | null
          media?: string[] | null
          music_budget?: number | null
          notes?: string | null
          phase?: string | null
          priority?: string | null
          production_company?: string | null
          production_company_id?: string | null
          production_title: string
          production_type: string
          project_id?: string | null
          publishing_fee?: number | null
          publishing_holder?: string | null
          publishing_percentage?: number | null
          requester_company?: string | null
          requester_contact_id?: string | null
          requester_email?: string | null
          requester_name?: string | null
          requester_phone?: string | null
          review_status?: string | null
          scene_description?: string | null
          song_artist?: string | null
          song_id?: string | null
          song_title: string
          suggested_artist_id?: string | null
          suggested_song_id?: string | null
          sync_fee?: number | null
          territory?: string | null
          total_budget?: number | null
          updated_at?: string
          usage_duration?: string | null
          usage_type?: string | null
        }
        Update: {
          artist_id?: string | null
          contact_id?: string | null
          contract_url?: string | null
          created_at?: string
          created_by?: string
          currency?: string | null
          deadline?: string | null
          director?: string | null
          director_id?: string | null
          duration_years?: number | null
          form_link_id?: string | null
          id?: string
          internal_notes?: string | null
          is_external_submission?: boolean | null
          master_fee?: number | null
          master_holder?: string | null
          master_percentage?: number | null
          media?: string[] | null
          music_budget?: number | null
          notes?: string | null
          phase?: string | null
          priority?: string | null
          production_company?: string | null
          production_company_id?: string | null
          production_title?: string
          production_type?: string
          project_id?: string | null
          publishing_fee?: number | null
          publishing_holder?: string | null
          publishing_percentage?: number | null
          requester_company?: string | null
          requester_contact_id?: string | null
          requester_email?: string | null
          requester_name?: string | null
          requester_phone?: string | null
          review_status?: string | null
          scene_description?: string | null
          song_artist?: string | null
          song_id?: string | null
          song_title?: string
          suggested_artist_id?: string | null
          suggested_song_id?: string | null
          sync_fee?: number | null
          territory?: string | null
          total_budget?: number | null
          updated_at?: string
          usage_duration?: string | null
          usage_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_offers_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_offers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_offers_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_offers_form_link_id_fkey"
            columns: ["form_link_id"]
            isOneToOne: false
            referencedRelation: "sync_form_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_offers_production_company_id_fkey"
            columns: ["production_company_id"]
            isOneToOne: false
            referencedRelation: "production_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_offers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sync_offers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_offers_requester_contact_id_fkey"
            columns: ["requester_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_offers_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_offers_suggested_artist_id_fkey"
            columns: ["suggested_artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_offers_suggested_song_id_fkey"
            columns: ["suggested_song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_splits: {
        Row: {
          contact_id: string | null
          created_at: string
          holder_name: string | null
          id: string
          notes: string | null
          percentage: number
          split_type: string
          sync_offer_id: string
          team_member_id: string | null
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          holder_name?: string | null
          id?: string
          notes?: string | null
          percentage: number
          split_type: string
          sync_offer_id: string
          team_member_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          holder_name?: string | null
          id?: string
          notes?: string | null
          percentage?: number
          split_type?: string
          sync_offer_id?: string
          team_member_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_splits_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_splits_sync_offer_id_fkey"
            columns: ["sync_offer_id"]
            isOneToOne: false
            referencedRelation: "sync_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_roadmap_blocks: {
        Row: {
          block_type: string
          created_at: string
          data: Json
          id: string
          roadmap_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          block_type: string
          created_at?: string
          data?: Json
          id?: string
          roadmap_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          block_type?: string
          created_at?: string
          data?: Json
          id?: string
          roadmap_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_roadmap_blocks_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "tour_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_roadmap_bookings: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          roadmap_id: string
          sort_order: number | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          roadmap_id: string
          sort_order?: number | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          roadmap_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_roadmap_bookings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_roadmap_bookings_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "tour_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_roadmaps: {
        Row: {
          artist_id: string | null
          booking_id: string | null
          created_at: string
          created_by: string
          end_date: string | null
          id: string
          name: string
          promoter: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          artist_id?: string | null
          booking_id?: string | null
          created_at?: string
          created_by: string
          end_date?: string | null
          id?: string
          name: string
          promoter?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          artist_id?: string | null
          booking_id?: string | null
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: string
          name?: string
          promoter?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_roadmaps_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_roadmaps_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      track_artists: {
        Row: {
          artist_id: string
          created_at: string | null
          id: string
          role: string
          sort_order: number
          track_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          id?: string
          role?: string
          sort_order?: number
          track_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          id?: string
          role?: string
          sort_order?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_artists_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_credits: {
        Row: {
          artist_id: string | null
          contact_id: string | null
          created_at: string
          id: string
          master_percentage: number | null
          name: string
          notes: string | null
          percentage: number | null
          pro_society: string | null
          publishing_percentage: number | null
          role: string
          sort_order: number | null
          track_id: string
        }
        Insert: {
          artist_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          master_percentage?: number | null
          name: string
          notes?: string | null
          percentage?: number | null
          pro_society?: string | null
          publishing_percentage?: number | null
          role: string
          sort_order?: number | null
          track_id: string
        }
        Update: {
          artist_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          master_percentage?: number | null
          name?: string
          notes?: string | null
          percentage?: number | null
          pro_society?: string | null
          publishing_percentage?: number | null
          role?: string
          sort_order?: number | null
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_credits_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_credits_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_credits_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_master_splits: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          label_name: string | null
          name: string
          notes: string | null
          percentage: number
          role: string
          track_id: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          label_name?: string | null
          name: string
          notes?: string | null
          percentage?: number
          role?: string
          track_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          label_name?: string | null
          name?: string
          notes?: string | null
          percentage?: number
          role?: string
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_master_splits_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_master_splits_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_publishing_splits: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          ipi_number: string | null
          name: string
          notes: string | null
          percentage: number
          pro_name: string | null
          role: string
          track_id: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          ipi_number?: string | null
          name: string
          notes?: string | null
          percentage?: number
          pro_name?: string | null
          role?: string
          track_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          ipi_number?: string | null
          name?: string
          notes?: string | null
          percentage?: number
          pro_name?: string | null
          role?: string
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_publishing_splits_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_publishing_splits_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_versions: {
        Row: {
          created_at: string
          file_bucket: string | null
          file_url: string
          id: string
          is_current_version: boolean | null
          notes: string | null
          track_id: string
          uploaded_by: string | null
          version_name: string
        }
        Insert: {
          created_at?: string
          file_bucket?: string | null
          file_url: string
          id?: string
          is_current_version?: boolean | null
          notes?: string | null
          track_id: string
          uploaded_by?: string | null
          version_name: string
        }
        Update: {
          created_at?: string
          file_bucket?: string | null
          file_url?: string
          id?: string
          is_current_version?: boolean | null
          notes?: string | null
          track_id?: string
          uploaded_by?: string | null
          version_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_versions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          c_copyright_holder: string | null
          c_copyright_year: number | null
          created_at: string
          duration: number | null
          explicit: boolean | null
          id: string
          is_focus_track: boolean
          is_single: boolean
          isrc: string | null
          lyrics: string | null
          notes: string | null
          p_copyright_holder: string | null
          p_production_year: number | null
          popularity: number | null
          preview_url: string | null
          recording_fixation_date: string | null
          release_date: string | null
          release_id: string
          spotify_id: string | null
          spotify_url: string | null
          title: string
          track_number: number
          updated_at: string
          video_type: string | null
        }
        Insert: {
          c_copyright_holder?: string | null
          c_copyright_year?: number | null
          created_at?: string
          duration?: number | null
          explicit?: boolean | null
          id?: string
          is_focus_track?: boolean
          is_single?: boolean
          isrc?: string | null
          lyrics?: string | null
          notes?: string | null
          p_copyright_holder?: string | null
          p_production_year?: number | null
          popularity?: number | null
          preview_url?: string | null
          recording_fixation_date?: string | null
          release_date?: string | null
          release_id: string
          spotify_id?: string | null
          spotify_url?: string | null
          title: string
          track_number?: number
          updated_at?: string
          video_type?: string | null
        }
        Update: {
          c_copyright_holder?: string | null
          c_copyright_year?: number | null
          created_at?: string
          duration?: number | null
          explicit?: boolean | null
          id?: string
          is_focus_track?: boolean
          is_single?: boolean
          isrc?: string | null
          lyrics?: string | null
          notes?: string | null
          p_copyright_holder?: string | null
          p_production_year?: number | null
          popularity?: number | null
          preview_url?: string | null
          recording_fixation_date?: string | null
          release_date?: string | null
          release_id?: string
          spotify_id?: string | null
          spotify_url?: string | null
          title?: string
          track_number?: number
          updated_at?: string
          video_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracks_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          artist_id: string | null
          booking_id: string | null
          budget_id: string | null
          budget_item_id: string | null
          category: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          currency: string | null
          description: string
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_url: string | null
          irpf_percentage: number | null
          iva_percentage: number | null
          metadata: Json | null
          net_amount: number | null
          payment_date: string | null
          project_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          subcategory: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          artist_id?: string | null
          booking_id?: string | null
          budget_id?: string | null
          budget_item_id?: string | null
          category?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          currency?: string | null
          description: string
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_url?: string | null
          irpf_percentage?: number | null
          iva_percentage?: number | null
          metadata?: Json | null
          net_amount?: number | null
          payment_date?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          subcategory?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          artist_id?: string | null
          booking_id?: string | null
          budget_id?: string | null
          budget_item_id?: string | null
          category?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string | null
          description?: string
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_url?: string | null
          irpf_percentage?: number | null
          iva_percentage?: number | null
          metadata?: Json | null
          net_amount?: number | null
          payment_date?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          subcategory?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "budget_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_memberships: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          team_category: Database["public"]["Enums"]["team_category"] | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["workspace_role"]
          team_category?: Database["public"]["Enums"]["team_category"] | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          team_category?: Database["public"]["Enums"]["team_category"] | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_memberships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      profit_and_loss: {
        Row: {
          artist_id: string | null
          booking_id: string | null
          net_profit: number | null
          period: string | null
          project_id: string | null
          total_expenses: number | null
          total_income: number | null
          transaction_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_kpis: {
        Row: {
          bookings_count: number | null
          budgets_count: number | null
          contracts_count: number | null
          files_count: number | null
          open_incidents: number | null
          open_questions: number | null
          open_tasks: number | null
          project_id: string | null
          releases_count: number | null
          solicitudes_count: number | null
        }
        Insert: {
          bookings_count?: never
          budgets_count?: never
          contracts_count?: never
          files_count?: never
          open_incidents?: never
          open_questions?: never
          open_tasks?: never
          project_id?: string | null
          releases_count?: never
          solicitudes_count?: never
        }
        Update: {
          bookings_count?: never
          budgets_count?: never
          contracts_count?: never
          files_count?: never
          open_incidents?: never
          open_questions?: never
          open_tasks?: never
          project_id?: string | null
          releases_count?: never
          solicitudes_count?: never
        }
        Relationships: []
      }
    }
    Functions: {
      build_changes_json: {
        Args: { new_data: Json; old_data: Json }
        Returns: Json
      }
      can_close_budget: { Args: { p_budget_id: string }; Returns: Json }
      can_edit_release: {
        Args: { _release_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_release: {
        Args: { _release_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_release: {
        Args: { _release_id: string; _user_id: string }
        Returns: boolean
      }
      check_epk_password_attempts: {
        Args: { client_ip?: unknown; epk_slug: string }
        Returns: Json
      }
      check_pending_royalty_payments: { Args: never; Returns: undefined }
      create_artist_mirror_contact: {
        Args: { _artist_id: string }
        Returns: string
      }
      create_booking_event_folder: {
        Args: {
          p_artist_id: string
          p_booking_id: string
          p_created_by: string
          p_event_date: string
          p_event_name: string
        }
        Returns: string
      }
      create_default_artist_folders: {
        Args: { p_artist_id: string; p_created_by: string }
        Returns: undefined
      }
      create_default_payment_schedule: {
        Args: {
          p_booking_id: string
          p_created_by: string
          p_event_date: string
          p_fee: number
        }
        Returns: undefined
      }
      create_personal_contact:
        | {
            Args: { _email?: string; _name: string; _role?: string }
            Returns: string
          }
        | {
            Args: {
              _address?: string
              _email?: string
              _iban?: string
              _legal_name?: string
              _name: string
              _phone?: string
              _role?: string
              _tax_id?: string
              _website?: string
            }
            Returns: string
          }
      create_team_contact_for_artist: {
        Args: {
          _artist_id: string
          _category: string
          _name: string
          _role: string
        }
        Returns: {
          id: string
          name: string
          role: string
          stage_name: string
        }[]
      }
      duplicate_booking_deep: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: string
      }
      generate_contact_slug: { Args: never; Returns: string }
      generate_epk_slug: { Args: { artista_proyecto: string }; Returns: string }
      generate_project_share_token: { Args: never; Returns: string }
      get_functional_permission: {
        Args: { _module: string; _user_id: string; _workspace_id: string }
        Returns: Database["public"]["Enums"]["permission_level"]
      }
      get_profile_id_by_user: { Args: { _user_id: string }; Returns: string }
      get_user_artist_roles: {
        Args: { _user_id: string }
        Returns: {
          artist_id: string
          role: Database["public"]["Enums"]["artist_role"]
        }[]
      }
      get_user_functional_role: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: string
      }
      get_user_project_roles: {
        Args: { _user_id: string }
        Returns: {
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
        }[]
      }
      get_user_workspace_roles: {
        Args: { _user_id: string }
        Returns: {
          role: Database["public"]["Enums"]["workspace_role"]
          workspace_id: string
        }[]
      }
      has_functional_permission: {
        Args: {
          _module: string
          _required: Database["public"]["Enums"]["permission_level"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      increment_epk_download: {
        Args: { epk_slug: string; recurso?: string }
        Returns: undefined
      }
      increment_epk_view: {
        Args: { epk_slug: string; is_unique?: boolean; visitor_ip?: unknown }
        Returns: undefined
      }
      log_approval_event: {
        Args: {
          p_approval_id: string
          p_diff?: Json
          p_event_type: Database["public"]["Enums"]["approval_event_type"]
          p_from_status?: Database["public"]["Enums"]["approval_status"]
          p_to_status?: Database["public"]["Enums"]["approval_status"]
        }
        Returns: undefined
      }
      public_get_artist_by_form_token: {
        Args: { p_token: string }
        Returns: {
          actividad_inicio: string | null
          address: string | null
          allergies: string | null
          artist_type: string
          avatar_url: string | null
          bank_name: string | null
          brand_color: string | null
          calendar_url: string | null
          clothing_size: string | null
          company_name: string | null
          created_at: string
          created_by: string
          custom_data: Json | null
          description: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          email: string | null
          field_config: Json | null
          genre: string | null
          header_image_url: string | null
          iban: string | null
          id: string
          instagram_url: string | null
          ipi_number: string | null
          irpf_porcentaje: number | null
          irpf_type: string | null
          legal_name: string | null
          metadata: Json | null
          name: string
          nif: string | null
          notes: string | null
          phone: string | null
          pro_name: string | null
          profile_id: string | null
          shoe_size: string | null
          social_links: Json
          special_needs: string | null
          spotify_url: string | null
          stage_name: string | null
          swift_code: string | null
          tax_id: string | null
          tiktok_url: string | null
          tipo_entidad: string | null
          updated_at: string
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "artists"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      public_get_contract_by_signer_token: {
        Args: { p_token: string }
        Returns: {
          artist_id: string | null
          booking_document_id: string | null
          booking_id: string | null
          contract_token: string | null
          contract_type: string
          created_at: string
          created_by: string | null
          description: string | null
          draft_id: string | null
          file_bucket: string
          file_path: string | null
          file_url: string | null
          id: string
          project_id: string | null
          release_id: string | null
          status: Database["public"]["Enums"]["contract_status"]
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "contracts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      public_get_pitch_by_token: {
        Args: { p_token: string }
        Returns: {
          additional_info: string | null
          artist_bio: string | null
          artist_photos_link: string | null
          audio_link: string | null
          country: string | null
          created_at: string
          created_by: string
          future_planning: string | null
          general_strategy: string | null
          id: string
          instruments: string | null
          mood: string | null
          name: string
          pitch_config: Json | null
          pitch_deadline: string | null
          pitch_status: string
          pitch_token: string | null
          pitch_type: string
          release_id: string
          social_links: string | null
          spotify_followers: number | null
          spotify_milestones: string | null
          spotify_monthly_listeners: number | null
          spotify_photos_link: string | null
          spotify_strategy: string | null
          synopsis: string | null
          track_id: string | null
          updated_at: string
          vevo_brand_notes: string | null
          vevo_content_type: string | null
          vevo_is_new_edit: boolean | null
          vevo_link: string | null
          vevo_premiere_date: string | null
          video_link: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "pitches"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      public_get_release_by_pitch_token: {
        Args: { p_token: string }
        Returns: {
          artist_id: string | null
          copyright: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          general_strategy: string | null
          genre: string | null
          id: string
          label: string | null
          language: string | null
          mood: string | null
          pitch_config: Json | null
          pitch_deadline: string | null
          pitch_status: Database["public"]["Enums"]["pitch_status"] | null
          pitch_token: string | null
          production_year: number | null
          project_id: string | null
          release_date: string | null
          secondary_genre: string | null
          share_enabled: boolean | null
          share_expires_at: string | null
          share_token: string | null
          social_links: string | null
          spotify_followers: number | null
          spotify_id: string | null
          spotify_milestones: string | null
          spotify_monthly_listeners: number | null
          spotify_strategy: string | null
          spotify_url: string | null
          status: string
          synopsis: string | null
          title: string
          type: string
          upc: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "releases"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      public_update_pitch_by_token: {
        Args: { p_token: string; p_updates: Json }
        Returns: {
          additional_info: string | null
          artist_bio: string | null
          artist_photos_link: string | null
          audio_link: string | null
          country: string | null
          created_at: string
          created_by: string
          future_planning: string | null
          general_strategy: string | null
          id: string
          instruments: string | null
          mood: string | null
          name: string
          pitch_config: Json | null
          pitch_deadline: string | null
          pitch_status: string
          pitch_token: string | null
          pitch_type: string
          release_id: string
          social_links: string | null
          spotify_followers: number | null
          spotify_milestones: string | null
          spotify_monthly_listeners: number | null
          spotify_photos_link: string | null
          spotify_strategy: string | null
          synopsis: string | null
          track_id: string | null
          updated_at: string
          vevo_brand_notes: string | null
          vevo_content_type: string | null
          vevo_is_new_edit: boolean | null
          vevo_link: string | null
          vevo_premiere_date: string | null
          video_link: string | null
        }
        SetofOptions: {
          from: "*"
          to: "pitches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_failed_password_attempt: {
        Args: { client_ip?: unknown; epk_slug: string }
        Returns: Json
      }
      reset_password_attempts: {
        Args: { client_ip?: unknown; epk_slug: string }
        Returns: undefined
      }
      resolve_team_tier: {
        Args: { _category: string; _field_config: Json }
        Returns: string
      }
      safe_get_profile_id: { Args: { _user_id: string }; Returns: string }
      sync_booking_document_to_drive: {
        Args: { p_document_id: string }
        Returns: undefined
      }
      team_tier_for_category: { Args: { _category: string }; Returns: string }
      touch_draft_participant: {
        Args: { p_email: string; p_token: string }
        Returns: undefined
      }
      track_draft_participant: {
        Args: {
          p_email: string
          p_name: string
          p_role?: string
          p_token: string
        }
        Returns: Json
      }
      update_contact_team_tier: {
        Args: { _contact: string; _tier: string }
        Returns: undefined
      }
      user_can_edit_artist: {
        Args: { _artist_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_edit_contact: {
        Args: { _contact_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_edit_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_see_artist: {
        Args: { _artist_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_see_contact: {
        Args: { _contact_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_see_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_project_access: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_workspace_permission: {
        Args: {
          _required_role: Database["public"]["Enums"]["workspace_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      user_is_workspace_owner: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      validate_approval_transition: {
        Args: { p_action: string; p_approval_id: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      action_item_priority: "low" | "normal" | "high" | "urgent"
      action_item_status:
        | "draft"
        | "pending"
        | "in_review"
        | "approved"
        | "rejected"
        | "cancelled"
      action_item_type:
        | "booking_request"
        | "budget_approval"
        | "expense_approval"
        | "vacation_request"
        | "interview_request"
        | "collaboration"
        | "general"
      approval_event_type:
        | "CREATED"
        | "UPDATED"
        | "SUBMITTED"
        | "APPROVED"
        | "REJECTED"
        | "COMMENTED"
        | "ASSIGN_CHANGED"
      approval_status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED"
      approval_type: "BUDGET" | "PR_REQUEST" | "LOGISTICS"
      artist_role:
        | "ARTIST_MANAGER"
        | "ARTIST_OBSERVER"
        | "LABEL"
        | "BOOKING_AGENT"
        | "PRODUCER"
        | "PUBLISHER"
        | "AR"
        | "ROADIE_TECH"
      availability_request_status: "open" | "closed" | "cancelled"
      availability_response_status:
        | "pending"
        | "available"
        | "unavailable"
        | "tentative"
      billing_status:
        | "pendiente"
        | "pagado"
        | "facturado"
        | "cancelado"
        | "factura_solicitada"
        | "agrupada"
      budget_status: "nacional" | "internacional"
      budget_type:
        | "concierto"
        | "produccion_musical"
        | "campana_promocional"
        | "videoclip"
        | "otros"
      contract_status:
        | "borrador"
        | "pendiente_firma"
        | "firmado"
        | "negociando"
        | "listo_para_firma"
      due_anchor:
        | "SHOW_DAY"
        | "PRESS_LAUNCH"
        | "SHOOT_DAY"
        | "PUBLISH_DAY"
        | "RELEASE_DAY"
        | "MEETING_DAY"
        | "PAYRUN_DAY"
      email_link_type:
        | "contact"
        | "booking"
        | "project"
        | "solicitud"
        | "budget"
      email_provider: "gmail" | "outlook"
      epk_theme: "auto" | "claro" | "oscuro"
      epk_video_type: "youtube" | "vimeo" | "archivo"
      epk_visibility: "publico" | "privado" | "protegido_password"
      node_type: "folder" | "file"
      permission_level: "none" | "view" | "edit" | "manage"
      pitch_status: "draft" | "sent" | "in_progress" | "completed" | "reviewed"
      project_role: "EDITOR" | "COMMENTER" | "VIEWER"
      project_status: "en_curso" | "finalizado" | "archivado"
      project_type: "TOUR" | "SINGLE_RELEASE" | "VIDEO" | "CAMPAIGN"
      request_status:
        | "pendiente"
        | "aprobada"
        | "denegada"
        | "consulta"
        | "informacion"
      request_type:
        | "entrevista"
        | "booking"
        | "otro"
        | "consulta"
        | "informacion"
        | "licencia"
        | "otros"
      show_status: "confirmado" | "pendiente" | "cancelado"
      task_status:
        | "PENDING"
        | "IN_PROGRESS"
        | "BLOCKED"
        | "IN_REVIEW"
        | "COMPLETED"
        | "CANCELLED"
      team_category:
        | "banda"
        | "artistico"
        | "tecnico"
        | "management"
        | "comunicacion"
        | "legal"
        | "otro"
      transaction_status:
        | "pending"
        | "confirmed"
        | "invoiced"
        | "paid"
        | "cancelled"
      transaction_type: "income" | "expense" | "transfer" | "refund"
      user_role: "artist" | "management"
      workspace_role: "OWNER" | "TEAM_MANAGER" | "MEMBER"
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
      action_item_priority: ["low", "normal", "high", "urgent"],
      action_item_status: [
        "draft",
        "pending",
        "in_review",
        "approved",
        "rejected",
        "cancelled",
      ],
      action_item_type: [
        "booking_request",
        "budget_approval",
        "expense_approval",
        "vacation_request",
        "interview_request",
        "collaboration",
        "general",
      ],
      approval_event_type: [
        "CREATED",
        "UPDATED",
        "SUBMITTED",
        "APPROVED",
        "REJECTED",
        "COMMENTED",
        "ASSIGN_CHANGED",
      ],
      approval_status: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"],
      approval_type: ["BUDGET", "PR_REQUEST", "LOGISTICS"],
      artist_role: [
        "ARTIST_MANAGER",
        "ARTIST_OBSERVER",
        "LABEL",
        "BOOKING_AGENT",
        "PRODUCER",
        "PUBLISHER",
        "AR",
        "ROADIE_TECH",
      ],
      availability_request_status: ["open", "closed", "cancelled"],
      availability_response_status: [
        "pending",
        "available",
        "unavailable",
        "tentative",
      ],
      billing_status: [
        "pendiente",
        "pagado",
        "facturado",
        "cancelado",
        "factura_solicitada",
        "agrupada",
      ],
      budget_status: ["nacional", "internacional"],
      budget_type: [
        "concierto",
        "produccion_musical",
        "campana_promocional",
        "videoclip",
        "otros",
      ],
      contract_status: [
        "borrador",
        "pendiente_firma",
        "firmado",
        "negociando",
        "listo_para_firma",
      ],
      due_anchor: [
        "SHOW_DAY",
        "PRESS_LAUNCH",
        "SHOOT_DAY",
        "PUBLISH_DAY",
        "RELEASE_DAY",
        "MEETING_DAY",
        "PAYRUN_DAY",
      ],
      email_link_type: ["contact", "booking", "project", "solicitud", "budget"],
      email_provider: ["gmail", "outlook"],
      epk_theme: ["auto", "claro", "oscuro"],
      epk_video_type: ["youtube", "vimeo", "archivo"],
      epk_visibility: ["publico", "privado", "protegido_password"],
      node_type: ["folder", "file"],
      permission_level: ["none", "view", "edit", "manage"],
      pitch_status: ["draft", "sent", "in_progress", "completed", "reviewed"],
      project_role: ["EDITOR", "COMMENTER", "VIEWER"],
      project_status: ["en_curso", "finalizado", "archivado"],
      project_type: ["TOUR", "SINGLE_RELEASE", "VIDEO", "CAMPAIGN"],
      request_status: [
        "pendiente",
        "aprobada",
        "denegada",
        "consulta",
        "informacion",
      ],
      request_type: [
        "entrevista",
        "booking",
        "otro",
        "consulta",
        "informacion",
        "licencia",
        "otros",
      ],
      show_status: ["confirmado", "pendiente", "cancelado"],
      task_status: [
        "PENDING",
        "IN_PROGRESS",
        "BLOCKED",
        "IN_REVIEW",
        "COMPLETED",
        "CANCELLED",
      ],
      team_category: [
        "banda",
        "artistico",
        "tecnico",
        "management",
        "comunicacion",
        "legal",
        "otro",
      ],
      transaction_status: [
        "pending",
        "confirmed",
        "invoiced",
        "paid",
        "cancelled",
      ],
      transaction_type: ["income", "expense", "transfer", "refund"],
      user_role: ["artist", "management"],
      workspace_role: ["OWNER", "TEAM_MANAGER", "MEMBER"],
    },
  },
} as const
