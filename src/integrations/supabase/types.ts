export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          address: string | null
          area: string | null
          attended_by: string | null
          category: string | null
          created_at: string | null
          id: string
          mobile: string
          name: string
          pincode: string | null
          reference_mobile_no: string | null
          reference_name: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          attended_by?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          mobile: string
          name: string
          pincode?: string | null
          reference_mobile_no?: string | null
          reference_name?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          attended_by?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          mobile?: string
          name?: string
          pincode?: string | null
          reference_mobile_no?: string | null
          reference_name?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_attended_by_fkey"
            columns: ["attended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          token_version: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          token_version?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          token_version?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          area: number
          created_at: string | null
          custom_boxes: number | null
          id: string
          layer_number: number | null
          price_per_box: number
          quotation_id: string
          room_id: string
          tile_id: string
          total_price: number
        }
        Insert: {
          area: number
          created_at?: string | null
          custom_boxes?: number | null
          id?: string
          layer_number?: number | null
          price_per_box: number
          quotation_id: string
          room_id: string
          tile_id: string
          total_price: number
        }
        Update: {
          area?: number
          created_at?: string | null
          custom_boxes?: number | null
          id?: string
          layer_number?: number | null
          price_per_box?: number
          quotation_id?: string
          room_id?: string
          tile_id?: string
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_quotation_items_quotation"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_quotation_items_room"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_quotation_items_tile"
            columns: ["tile_id"]
            isOneToOne: false
            referencedRelation: "tiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_tile_id_fkey"
            columns: ["tile_id"]
            isOneToOne: false
            referencedRelation: "tiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          notes: string | null
          quotation_number: string
          status: string | null
          total_cost: number | null
          updated_at: string | null
          wastage_percentage: number | null
          worker_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          quotation_number: string
          status?: string | null
          total_cost?: number | null
          updated_at?: string | null
          wastage_percentage?: number | null
          worker_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          quotation_number?: string
          status?: string | null
          total_cost?: number | null
          updated_at?: string | null
          wastage_percentage?: number | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_quotations_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      room_tile_selections: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          layer_number: number | null
          room_id: string
          tile_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          layer_number?: number | null
          room_id: string
          tile_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          layer_number?: number | null
          room_id?: string
          tile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_room_tile_selections_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_room_tile_selections_room"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_room_tile_selections_tile"
            columns: ["tile_id"]
            isOneToOne: false
            referencedRelation: "tiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_tile_selections_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_tile_selections_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_tile_selections_tile_id_fkey"
            columns: ["tile_id"]
            isOneToOne: false
            referencedRelation: "tiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          length: number
          name: string
          room_type: string
          unit: string
          wall_height: number | null
          wall_length: number | null
          width: number
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          length?: number
          name: string
          room_type?: string
          unit?: string
          wall_height?: number | null
          wall_length?: number | null
          width?: number
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          length?: number
          name?: string
          room_type?: string
          unit?: string
          wall_height?: number | null
          wall_length?: number | null
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_rooms_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      tiles: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          pieces_per_box: number | null
          price_per_box: number | null
          qr_code_url: string | null
          size_breadth: number
          size_length: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          pieces_per_box?: number | null
          price_per_box?: number | null
          qr_code_url?: string | null
          size_breadth: number
          size_length: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          pieces_per_box?: number | null
          price_per_box?: number | null
          qr_code_url?: string | null
          size_breadth?: number
          size_length?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invalidated_by: string | null
          invalidation_reason: string | null
          is_active: boolean
          last_activity: string
          session_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          invalidated_by?: string | null
          invalidation_reason?: string | null
          is_active?: boolean
          last_activity?: string
          session_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invalidated_by?: string | null
          invalidation_reason?: string | null
          is_active?: boolean
          last_activity?: string
          session_token?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_single_session: {
        Args: {
          p_user_id: string
          p_session_token: string
          p_expires_at: string
        }
        Returns: {
          invalidated_tokens: string[]
        }[]
      }
      create_user_session_v2: {
        Args: { user_id: string; token: string; expires_at: string }
        Returns: string[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      invalidate_all_user_sessions: {
        Args: { p_user_id: string; p_reason?: string }
        Returns: undefined
      }
      invalidate_user_session_v2: {
        Args: { user_id: string; token?: string }
        Returns: undefined
      }
      validate_current_session: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validate_single_session: {
        Args: { p_user_id: string; p_session_token: string }
        Returns: {
          is_valid: boolean
          token_version: number
          expires_at: string
        }[]
      }
      validate_user_session_v2: {
        Args: { user_id: string; token: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "worker"
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
      user_role: ["admin", "worker"],
    },
  },
} as const
