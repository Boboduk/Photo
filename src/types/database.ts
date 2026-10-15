export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          for_models: boolean
          for_photographers: boolean
          for_works: boolean
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          translations: NonNullable<Json>
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          for_models?: boolean
          for_photographers?: boolean
          for_works?: boolean
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          translations?: NonNullable<Json>
          updated_at?: string
        }
        Update: {
          created_at?: string
          for_models?: boolean
          for_photographers?: boolean
          for_works?: boolean
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          translations?: NonNullable<Json>
          updated_at?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          direct_key: string | null
          id: string
          last_message_at: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by?: string | null
          direct_key?: string | null
          id?: string
          last_message_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          direct_key?: string | null
          id?: string
          last_message_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          profile_id: string | null
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          profile_id?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          profile_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          item_id: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          item_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string | null
        }
        ComputedFields: never
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          data: NonNullable<Json>
          group_key: string | null
          id: string
          read_at: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        ComputedFields: never
        Insert: {
          actor_id?: string | null
          created_at?: string
          data?: NonNullable<Json>
          group_key?: string | null
          id?: string
          read_at?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          data?: NonNullable<Json>
          group_key?: string | null
          id?: string
          read_at?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_credits: {
        Row: {
          created_at: string
          id: string
          item_id: string
          name: string | null
          profile_id: string | null
          role: Database["public"]["Enums"]["team_role"]
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          name?: string | null
          profile_id?: string | null
          role: Database["public"]["Enums"]["team_role"]
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          name?: string | null
          profile_id?: string | null
          role?: Database["public"]["Enums"]["team_role"]
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_credits_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_credits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_images: {
        Row: {
          alt: string | null
          created_at: string
          height: number | null
          id: string
          item_id: string
          owner_id: string
          position: number
          storage_path: string | null
          url: string
          width: number | null
        }
        ComputedFields: never
        Insert: {
          alt?: string | null
          created_at?: string
          height?: number | null
          id?: string
          item_id: string
          owner_id?: string
          position?: number
          storage_path?: string | null
          url: string
          width?: number | null
        }
        Update: {
          alt?: string | null
          created_at?: string
          height?: number | null
          id?: string
          item_id?: string
          owner_id?: string
          position?: number
          storage_path?: string | null
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_images_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_images_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          category_slug: string | null
          cover_height: number | null
          cover_image_url: string | null
          cover_width: number | null
          created_at: string
          description: string | null
          hidden_at: string | null
          hidden_reason: string | null
          id: string
          images_count: number
          is_cover: boolean
          is_published: boolean
          likes_count: number
          owner_id: string
          position: number
          shot_on: string | null
          title: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          category_slug?: string | null
          cover_height?: number | null
          cover_image_url?: string | null
          cover_width?: number | null
          created_at?: string
          description?: string | null
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          images_count?: number
          is_cover?: boolean
          is_published?: boolean
          likes_count?: number
          owner_id?: string
          position?: number
          shot_on?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_slug?: string | null
          cover_height?: number | null
          cover_image_url?: string | null
          cover_width?: number | null
          created_at?: string
          description?: string | null
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          images_count?: number
          is_cover?: boolean
          is_published?: boolean
          likes_count?: number
          owner_id?: string
          position?: number
          shot_on?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "portfolio_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_tags: {
        Row: {
          item_id: string
          tag: string
        }
        ComputedFields: never
        Insert: {
          item_id: string
          tag: string
        }
        Update: {
          item_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_tags_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          age_confirmed_at: string | null
          birth_date: string | null
          clothing_size: string | null
          contact_email: string | null
          contact_phone: string | null
          contact_telegram: string | null
          contacts_visibility: Database["public"]["Enums"]["contacts_visibility"]
          created_at: string
          eye_color: string | null
          hair_color: string | null
          height_cm: number | null
          id: string
          notify_applications: boolean
          notify_likes: boolean
          notify_mentions: boolean
          notify_messages: boolean
          notify_project_updates: boolean
          personal_data_consent_at: string | null
          shoe_size: string | null
          show_age: boolean
          show_params: boolean
          terms_accepted_at: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          age_confirmed_at?: string | null
          birth_date?: string | null
          clothing_size?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_telegram?: string | null
          contacts_visibility?: Database["public"]["Enums"]["contacts_visibility"]
          created_at?: string
          eye_color?: string | null
          hair_color?: string | null
          height_cm?: number | null
          id: string
          notify_applications?: boolean
          notify_likes?: boolean
          notify_mentions?: boolean
          notify_messages?: boolean
          notify_project_updates?: boolean
          personal_data_consent_at?: string | null
          shoe_size?: string | null
          show_age?: boolean
          show_params?: boolean
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          age_confirmed_at?: string | null
          birth_date?: string | null
          clothing_size?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_telegram?: string | null
          contacts_visibility?: Database["public"]["Enums"]["contacts_visibility"]
          created_at?: string
          eye_color?: string | null
          hair_color?: string | null
          height_cm?: number | null
          id?: string
          notify_applications?: boolean
          notify_likes?: boolean
          notify_mentions?: boolean
          notify_messages?: boolean
          notify_project_updates?: boolean
          personal_data_consent_at?: string | null
          shoe_size?: string | null
          show_age?: boolean
          show_params?: boolean
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          availability: Database["public"]["Enums"]["availability_status"]
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          bio: string | null
          city: string | null
          collab_formats: Database["public"]["Enums"]["collab_format"][]
          cover_url: string | null
          created_at: string
          display_name: string
          experience: Database["public"]["Enums"]["experience_level"] | null
          id: string
          last_active_at: string
          onboarded_at: string | null
          profile_type: Database["public"]["Enums"]["profile_type"]
          role: Database["public"]["Enums"]["app_role"]
          search_vector: unknown
          social_links: NonNullable<Json>
          specializations: string[]
          updated_at: string
          username: string
        }
        ComputedFields: never
        Insert: {
          availability?: Database["public"]["Enums"]["availability_status"]
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          city?: string | null
          collab_formats?: Database["public"]["Enums"]["collab_format"][]
          cover_url?: string | null
          created_at?: string
          display_name: string
          experience?: Database["public"]["Enums"]["experience_level"] | null
          id: string
          last_active_at?: string
          onboarded_at?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"]
          role?: Database["public"]["Enums"]["app_role"]
          search_vector?: never
          social_links?: NonNullable<Json>
          specializations?: string[]
          updated_at?: string
          username: string
        }
        Update: {
          availability?: Database["public"]["Enums"]["availability_status"]
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          city?: string | null
          collab_formats?: Database["public"]["Enums"]["collab_format"][]
          cover_url?: string | null
          created_at?: string
          display_name?: string
          experience?: Database["public"]["Enums"]["experience_level"] | null
          id?: string
          last_active_at?: string
          onboarded_at?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"]
          role?: Database["public"]["Enums"]["app_role"]
          search_vector?: never
          social_links?: NonNullable<Json>
          specializations?: string[]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      project_applications: {
        Row: {
          applicant_id: string
          conversation_id: string | null
          created_at: string
          id: string
          message: string
          project_id: string
          responded_at: string | null
          role: Database["public"]["Enums"]["team_role"] | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          applicant_id: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          message: string
          project_id: string
          responded_at?: string | null
          role?: Database["public"]["Enums"]["team_role"] | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          message?: string
          project_id?: string
          responded_at?: string | null
          role?: Database["public"]["Enums"]["team_role"] | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_applications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          applications_count: number
          author_id: string
          category_slug: string | null
          city: string | null
          collab_format: Database["public"]["Enums"]["collab_format"]
          cover_path: string | null
          cover_url: string | null
          created_at: string
          description: string
          hidden_at: string | null
          hidden_reason: string | null
          id: string
          location: string | null
          looking_for: Database["public"]["Enums"]["team_role"][]
          requirements: string | null
          shoot_date: string | null
          spots: number
          status: Database["public"]["Enums"]["project_status"]
          terms: string | null
          title: string
          updated_at: string
          usage_rights: string | null
        }
        ComputedFields: never
        Insert: {
          applications_count?: number
          author_id?: string
          category_slug?: string | null
          city?: string | null
          collab_format: Database["public"]["Enums"]["collab_format"]
          cover_path?: string | null
          cover_url?: string | null
          created_at?: string
          description: string
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          location?: string | null
          looking_for: Database["public"]["Enums"]["team_role"][]
          requirements?: string | null
          shoot_date?: string | null
          spots?: number
          status?: Database["public"]["Enums"]["project_status"]
          terms?: string | null
          title: string
          updated_at?: string
          usage_rights?: string | null
        }
        Update: {
          applications_count?: number
          author_id?: string
          category_slug?: string | null
          city?: string | null
          collab_format?: Database["public"]["Enums"]["collab_format"]
          cover_path?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          location?: string | null
          looking_for?: Database["public"]["Enums"]["team_role"][]
          requirements?: string | null
          shoot_date?: string | null
          spots?: number
          status?: Database["public"]["Enums"]["project_status"]
          terms?: string | null
          title?: string
          updated_at?: string
          usage_rights?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          snapshot: NonNullable<Json>
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_owner_id: string | null
          target_type: Database["public"]["Enums"]["report_target"]
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          snapshot?: NonNullable<Json>
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_owner_id?: string | null
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          snapshot?: NonNullable<Json>
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_owner_id?: string | null
          target_type?: Database["public"]["Enums"]["report_target"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_owner_id_fkey"
            columns: ["target_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        ComputedFields: never
        Insert: {
          blocked_id: string
          blocker_id?: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_content: {
        Args: {
          p_id: string
          p_type: Database["public"]["Enums"]["report_target"]
        }
        Returns: string[]
      }
      admin_list_users: {
        Args: {
          p_filter?: string
          p_limit?: number
          p_offset?: number
          p_query?: string
        }
        Returns: {
          avatar_url: string
          ban_reason: string
          banned_at: string
          city: string
          created_at: string
          display_name: string
          email: string
          id: string
          last_active_at: string
          profile_type: Database["public"]["Enums"]["profile_type"]
          projects_count: number
          reports_count: number
          role: Database["public"]["Enums"]["app_role"]
          total_count: number
          username: string
          works_count: number
        }[]
      }
      admin_resolve_report: {
        Args: {
          p_note?: string
          p_report: string
          p_status: Database["public"]["Enums"]["report_status"]
        }
        Returns: undefined
      }
      admin_set_content_hidden: {
        Args: {
          p_hidden: boolean
          p_id: string
          p_reason?: string
          p_type: Database["public"]["Enums"]["report_target"]
        }
        Returns: undefined
      }
      admin_set_user_ban: {
        Args: { p_banned: boolean; p_reason?: string; p_user: string }
        Returns: undefined
      }
      admin_set_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user: string
        }
        Returns: undefined
      }
      admin_stats: { Args: Record<PropertyKey, never>; Returns: Json }
      apply_to_project: {
        Args: {
          p_chat_text?: string
          p_message: string
          p_project: string
          p_role: Database["public"]["Enums"]["team_role"]
        }
        Returns: Json
      }
      assert_moderator: { Args: Record<PropertyKey, never>; Returns: undefined }
      can_send_message: { Args: { p_conversation: string }; Returns: boolean }
      delete_own_account: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      enforce_rate_limit: {
        Args: { p_max: number; p_recent: number }
        Returns: undefined
      }
      escape_like: { Args: { p_value: string }; Returns: string }
      get_or_create_direct_conversation: {
        Args: { p_other: string }
        Returns: string
      }
      is_active_user: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_blocked_between: {
        Args: { p_a: string; p_b: string }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { p_conversation: string }
        Returns: boolean
      }
      is_moderator: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_profile_visible: { Args: { p_profile: string }; Returns: boolean }
      list_conversations: {
        Args: { p_conversation?: string; p_limit?: number; p_search?: string }
        Returns: {
          blocked_by_me: boolean
          can_message: boolean
          created_at: string
          id: string
          last_message_at: string
          last_message_body: string
          last_message_sender_id: string
          other_avatar_url: string
          other_display_name: string
          other_id: string
          other_last_read_at: string
          other_username: string
          unread_count: number
        }[]
      }
      mark_conversation_read: {
        Args: { p_conversation: string }
        Returns: undefined
      }
      notify: {
        Args: {
          p_actor: string
          p_data: Json
          p_group_key?: string
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user: string
        }
        Returns: undefined
      }
      prefix_tsquery: { Args: { p_value: string }; Returns: unknown }
      profile_public_details: { Args: { p_profile: string }; Returns: Json }
      refresh_portfolio_item_cover: {
        Args: { p_item: string }
        Returns: undefined
      }
      reorder_portfolio: { Args: { p_ids: string[] }; Returns: undefined }
      reorder_portfolio_images: {
        Args: { p_ids: string[]; p_item: string }
        Returns: undefined
      }
      search_portfolio: {
        Args: {
          p_category?: string
          p_limit?: number
          p_offset?: number
          p_owner?: string
          p_query?: string
          p_sort?: string
          p_tag?: string
        }
        Returns: {
          category_slug: string
          cover_height: number
          cover_image_url: string
          cover_width: number
          created_at: string
          id: string
          images_count: number
          liked: boolean
          likes_count: number
          owner_avatar_url: string
          owner_display_name: string
          owner_id: string
          owner_profile_type: Database["public"]["Enums"]["profile_type"]
          owner_username: string
          saved: boolean
          title: string
          total_count: number
        }[]
      }
      search_profiles: {
        Args: {
          p_availability?: Database["public"]["Enums"]["availability_status"][]
          p_category?: string
          p_city?: string
          p_experience?: Database["public"]["Enums"]["experience_level"][]
          p_formats?: Database["public"]["Enums"]["collab_format"][]
          p_kind?: string
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_sort?: string
          p_specializations?: string[]
          p_tags?: string[]
          p_types?: Database["public"]["Enums"]["profile_type"][]
        }
        Returns: {
          availability: Database["public"]["Enums"]["availability_status"]
          avatar_url: string
          bio: string
          city: string
          collab_formats: Database["public"]["Enums"]["collab_format"][]
          cover_url: string
          created_at: string
          display_name: string
          experience: Database["public"]["Enums"]["experience_level"]
          id: string
          last_active_at: string
          preview: Json
          profile_type: Database["public"]["Enums"]["profile_type"]
          specializations: string[]
          total_count: number
          username: string
          works_count: number
        }[]
      }
      search_projects: {
        Args: {
          p_author?: string
          p_category?: string
          p_city?: string
          p_format?: Database["public"]["Enums"]["collab_format"]
          p_limit?: number
          p_looking_for?: Database["public"]["Enums"]["team_role"]
          p_offset?: number
          p_query?: string
          p_sort?: string
          p_statuses?: Database["public"]["Enums"]["project_status"][]
        }
        Returns: {
          applications_count: number
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_username: string
          category_slug: string
          city: string
          collab_format: Database["public"]["Enums"]["collab_format"]
          cover_url: string
          created_at: string
          description: string
          id: string
          location: string
          looking_for: Database["public"]["Enums"]["team_role"][]
          shoot_date: string
          spots: number
          status: Database["public"]["Enums"]["project_status"]
          title: string
          total_count: number
        }[]
      }
      set_application_status: {
        Args: {
          p_application: string
          p_status: Database["public"]["Enums"]["application_status"]
        }
        Returns: undefined
      }
      set_portfolio_cover: { Args: { p_item: string }; Returns: undefined }
      submit_report: {
        Args: {
          p_details?: string
          p_reason: Database["public"]["Enums"]["report_reason"]
          p_target_id: string
          p_target_type: Database["public"]["Enums"]["report_target"]
        }
        Returns: string
      }
      toggle_favorite: {
        Args: { p_item?: string; p_profile?: string }
        Returns: boolean
      }
      toggle_like: { Args: { p_item: string }; Returns: Json }
      touch_last_active: { Args: { p_user: string }; Returns: undefined }
      unread_counts: { Args: Record<PropertyKey, never>; Returns: Json }
      wants_notification: {
        Args: {
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "moderator" | "admin"
      application_status: "pending" | "accepted" | "declined" | "withdrawn"
      availability_status: "available" | "limited" | "unavailable"
      collab_format: "tfp" | "paid" | "commercial" | "collab"
      contacts_visibility: "nobody" | "members" | "everyone"
      experience_level: "beginner" | "intermediate" | "professional"
      notification_type:
        | "message"
        | "application"
        | "application_status"
        | "project_status"
        | "like"
        | "mention"
      profile_type: "photographer" | "model" | "both"
      project_status: "open" | "in_progress" | "completed" | "cancelled"
      report_reason:
        | "spam"
        | "harassment"
        | "inappropriate"
        | "copyright"
        | "unauthorized_photo"
        | "impersonation"
        | "underage"
        | "other"
      report_status: "open" | "resolved" | "dismissed"
      report_target: "profile" | "portfolio_item" | "project" | "message"
      team_role: "photographer" | "model" | "makeup" | "stylist" | "other"
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
      app_role: ["user", "moderator", "admin"],
      application_status: ["pending", "accepted", "declined", "withdrawn"],
      availability_status: ["available", "limited", "unavailable"],
      collab_format: ["tfp", "paid", "commercial", "collab"],
      contacts_visibility: ["nobody", "members", "everyone"],
      experience_level: ["beginner", "intermediate", "professional"],
      notification_type: [
        "message",
        "application",
        "application_status",
        "project_status",
        "like",
        "mention",
      ],
      profile_type: ["photographer", "model", "both"],
      project_status: ["open", "in_progress", "completed", "cancelled"],
      report_reason: [
        "spam",
        "harassment",
        "inappropriate",
        "copyright",
        "unauthorized_photo",
        "impersonation",
        "underage",
        "other",
      ],
      report_status: ["open", "resolved", "dismissed"],
      report_target: ["profile", "portfolio_item", "project", "message"],
      team_role: ["photographer", "model", "makeup", "stylist", "other"],
    },
  },
} as const
