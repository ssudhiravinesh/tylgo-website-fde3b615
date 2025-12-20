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
          showroom_id: string | null
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
          showroom_id?: string | null
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
          showroom_id?: string | null
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
          {
            foreignKeyName: "customers_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
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
          showroom_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          showroom_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          showroom_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_counter: {
        Row: {
          current_number: number
          financial_year: string
          id: number
          updated_at: string | null
        }
        Insert: {
          current_number?: number
          financial_year: string
          id?: number
          updated_at?: string | null
        }
        Update: {
          current_number?: number
          financial_year?: string
          id?: number
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
          showroom_id: string | null
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
          showroom_id?: string | null
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
          showroom_id?: string | null
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
            foreignKeyName: "quotation_items_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
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
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          notes: string | null
          quotation_number: string
          showroom_id: string | null
          status: string | null
          total_cost: number | null
          updated_at: string | null
          wastage_percentage: number | null
          worker_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          notes?: string | null
          quotation_number: string
          showroom_id?: string | null
          status?: string | null
          total_cost?: number | null
          updated_at?: string | null
          wastage_percentage?: number | null
          worker_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          notes?: string | null
          quotation_number?: string
          showroom_id?: string | null
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
            foreignKeyName: "quotations_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
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
          showroom_id: string | null
          tile_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          layer_number?: number | null
          room_id: string
          showroom_id?: string | null
          tile_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          layer_number?: number | null
          room_id?: string
          showroom_id?: string | null
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
            foreignKeyName: "room_tile_selections_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
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
          measurements: Json | null
          name: string
          room_type: string
          showroom_id: string | null
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
          measurements?: Json | null
          name: string
          room_type?: string
          showroom_id?: string | null
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
          measurements?: Json | null
          name?: string
          room_type?: string
          showroom_id?: string | null
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
          {
            foreignKeyName: "rooms_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      showrooms: {
        Row: {
          created_at: string | null
          id: string
          name: string
          subdomain: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          subdomain: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          subdomain?: string
        }
        Relationships: []
      }
      tiles: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          pieces_per_box: number | null
          price_per_box: number | null
          qr_code_url: string | null
          showroom_id: string | null
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
          is_active?: boolean | null
          name: string
          pieces_per_box?: number | null
          price_per_box?: number | null
          qr_code_url?: string | null
          showroom_id?: string | null
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
          is_active?: boolean | null
          name?: string
          pieces_per_box?: number | null
          price_per_box?: number | null
          qr_code_url?: string | null
          showroom_id?: string | null
          size_breadth?: number
          size_length?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tiles_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          id: string
          last_active: string | null
          session_token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_active?: string | null
          session_token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_active?: string | null
          session_token?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_quotation_number: { Args: { fy: string }; Returns: string }
      get_showroom_subdomain_by_email: {
        Args: { lookup_email: string }
        Returns: string
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_showroom_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "worker" | "super_admin"
      user_role: "admin" | "worker" | "super_admin"
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
      app_role: ["admin", "worker", "super_admin"],
      user_role: ["admin", "worker", "super_admin"],
    },
  },
} as const
