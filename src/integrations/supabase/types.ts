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
      brands: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      customer_products: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          product_id: string
          quantity: number
          showroom_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          product_id: string
          quantity?: number
          showroom_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          product_id?: string
          quantity?: number
          showroom_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_products_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_products_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          area: string | null
          attended_by: string | null
          category: string | null
          created_at: string | null
          id: string
          last_interaction_at: string | null
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
          last_interaction_at?: string | null
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
          last_interaction_at?: string | null
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
      products: {
        Row: {
          brand_id: string | null
          category: string
          code: string | null
          created_at: string | null
          dimensions: Json | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number | null
          showroom_id: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          brand_id?: string | null
          category: string
          code?: string | null
          created_at?: string | null
          dimensions?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price?: number | null
          showroom_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Update: {
          brand_id?: string | null
          category?: string
          code?: string | null
          created_at?: string | null
          dimensions?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number | null
          showroom_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_showroom_id_fkey"
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
          username: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          showroom_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          showroom_id?: string | null
          updated_at?: string | null
          username?: string | null
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
          area: number | null
          created_at: string | null
          custom_boxes: number | null
          id: string
          layer_number: number | null
          price_per_box: number
          product_id: string | null
          quantity: number | null
          quotation_id: string
          room_id: string | null
          showroom_id: string | null
          staircase_id: string | null
          tile_id: string | null
          tile_type: string | null
          total_price: number
        }
        Insert: {
          area?: number | null
          created_at?: string | null
          custom_boxes?: number | null
          id?: string
          layer_number?: number | null
          price_per_box: number
          product_id?: string | null
          quantity?: number | null
          quotation_id: string
          room_id?: string | null
          showroom_id?: string | null
          staircase_id?: string | null
          tile_id?: string | null
          tile_type?: string | null
          total_price: number
        }
        Update: {
          area?: number | null
          created_at?: string | null
          custom_boxes?: number | null
          id?: string
          layer_number?: number | null
          price_per_box?: number
          product_id?: string | null
          quantity?: number | null
          quotation_id?: string
          room_id?: string | null
          showroom_id?: string | null
          staircase_id?: string | null
          tile_id?: string | null
          tile_type?: string | null
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
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
            foreignKeyName: "quotation_items_staircase_id_fkey"
            columns: ["staircase_id"]
            isOneToOne: false
            referencedRelation: "staircases"
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
          tally_sync_error: string | null
          tally_sync_status: string | null
          tally_synced_at: string | null
          tally_voucher_number: string | null
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
          tally_sync_error?: string | null
          tally_sync_status?: string | null
          tally_synced_at?: string | null
          tally_voucher_number?: string | null
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
          tally_sync_error?: string | null
          tally_sync_status?: string | null
          tally_synced_at?: string | null
          tally_voucher_number?: string | null
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
          tile_type: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          layer_number?: number | null
          room_id: string
          showroom_id?: string | null
          tile_id: string
          tile_type?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          layer_number?: number | null
          room_id?: string
          showroom_id?: string | null
          tile_id?: string
          tile_type?: string
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
          canvas_cells: Json | null
          canvas_edges: Json | null
          canvas_unit_ratio: number | null
          created_at: string | null
          customer_id: string | null
          has_floor: boolean
          has_skirting: boolean | null
          has_wall: boolean
          id: string
          length: number
          measurements: Json | null
          name: string
          room_type: string
          showroom_id: string | null
          skirting_height: number | null
          skirting_length: number | null
          unit: string
          wall_height: number | null
          wall_length: number | null
          wall_measurements: Json | null
          width: number
        }
        Insert: {
          canvas_cells?: Json | null
          canvas_edges?: Json | null
          canvas_unit_ratio?: number | null
          created_at?: string | null
          customer_id?: string | null
          has_floor?: boolean
          has_skirting?: boolean | null
          has_wall?: boolean
          id?: string
          length?: number
          measurements?: Json | null
          name: string
          room_type?: string
          showroom_id?: string | null
          skirting_height?: number | null
          skirting_length?: number | null
          unit?: string
          wall_height?: number | null
          wall_length?: number | null
          wall_measurements?: Json | null
          width?: number
        }
        Update: {
          canvas_cells?: Json | null
          canvas_edges?: Json | null
          canvas_unit_ratio?: number | null
          created_at?: string | null
          customer_id?: string | null
          has_floor?: boolean
          has_skirting?: boolean | null
          has_wall?: boolean
          id?: string
          length?: number
          measurements?: Json | null
          name?: string
          room_type?: string
          showroom_id?: string | null
          skirting_height?: number | null
          skirting_length?: number | null
          unit?: string
          wall_height?: number | null
          wall_length?: number | null
          wall_measurements?: Json | null
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
          brand_id: string | null
          created_at: string | null
          id: string
          name: string
          subdomain: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          subdomain: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          subdomain?: string
        }
        Relationships: [
          {
            foreignKeyName: "showrooms_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      staircase_tile_selections: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          showroom_id: string | null
          staircase_id: string
          tile_id: string
          tile_type: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          showroom_id?: string | null
          staircase_id: string
          tile_id: string
          tile_type?: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          showroom_id?: string | null
          staircase_id?: string
          tile_id?: string
          tile_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "staircase_tile_selections_staircase_id_fkey"
            columns: ["staircase_id"]
            isOneToOne: false
            referencedRelation: "staircases"
            referencedColumns: ["id"]
          },
        ]
      }
      staircases: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          landing_length: number | null
          landing_width: number | null
          name: string
          number_of_risers: number
          number_of_steps: number
          riser_height: number | null
          riser_width: number | null
          showroom_id: string | null
          step_length: number | null
          step_width: number | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          landing_length?: number | null
          landing_width?: number | null
          name: string
          number_of_risers?: number
          number_of_steps?: number
          riser_height?: number | null
          riser_width?: number | null
          showroom_id?: string | null
          step_length?: number | null
          step_width?: number | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          landing_length?: number | null
          landing_width?: number | null
          name?: string
          number_of_risers?: number
          number_of_steps?: number
          riser_height?: number | null
          riser_width?: number | null
          showroom_id?: string | null
          step_length?: number | null
          step_width?: number | null
          unit?: string | null
        }
        Relationships: []
      }
      tally_stock_mappings: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          tally_stock_item_name: string
          tile_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          tally_stock_item_name: string
          tile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          tally_stock_item_name?: string
          tile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tally_stock_mappings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tally_stock_mappings_tile_id_fkey"
            columns: ["tile_id"]
            isOneToOne: true
            referencedRelation: "tiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tally_sync_log: {
        Row: {
          brand_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          raw_request_payload: string | null
          raw_response_payload: string | null
          records_processed: number | null
          status: string
          sync_type: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          raw_request_payload?: string | null
          raw_response_payload?: string | null
          records_processed?: number | null
          status: string
          sync_type: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          raw_request_payload?: string | null
          raw_response_payload?: string | null
          records_processed?: number | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tally_sync_log_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      tiles: {
        Row: {
          brand_id: string | null
          category: string | null
          code: string
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          last_stock_sync: string | null
          name: string
          pieces_per_box: number | null
          price_per_box: number | null
          qr_code_url: string | null
          showroom_id: string | null
          size_breadth: number
          size_length: number
          stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          brand_id?: string | null
          category?: string | null
          code: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          last_stock_sync?: string | null
          name: string
          pieces_per_box?: number | null
          price_per_box?: number | null
          qr_code_url?: string | null
          showroom_id?: string | null
          size_breadth: number
          size_length: number
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: string | null
          category?: string | null
          code?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          last_stock_sync?: string | null
          name?: string
          pieces_per_box?: number | null
          price_per_box?: number | null
          qr_code_url?: string | null
          showroom_id?: string | null
          size_breadth?: number
          size_length?: number
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tiles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_brand_email_association: {
        Args: { brand_id: string; lookup_email: string }
        Returns: {
          subdomain: string
        }[]
      }
      get_all_brands_with_showrooms: {
        Args: never
        Returns: {
          brand_id: string
          brand_name: string
          showroom_id: string
          showroom_name: string
          subdomain: string
        }[]
      }
      get_brand_details_by_email: {
        Args: { lookup_email: string }
        Returns: {
          brand_name: string
          showroom_name: string
          showroom_subdomain: string
        }[]
      }
      get_next_quotation_number: { Args: { fy: string }; Returns: string }
      get_showroom_details_by_email: {
        Args: { lookup_email: string }
        Returns: {
          showroom_name: string
          showroom_subdomain: string
        }[]
      }
      get_showroom_subdomain_by_email: {
        Args: { lookup_email: string }
        Returns: string
      }
      get_user_brand_id: { Args: { _user_id: string }; Returns: string }
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

