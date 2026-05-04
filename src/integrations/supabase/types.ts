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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          unit_price: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_name: string
          quantity?: number
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          receipt_code: string | null
          status: string
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          receipt_code?: string | null
          status?: string
          total?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          receipt_code?: string | null
          status?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          sort_order?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          balance: number
          created_at: string
          id: string
          password_hash: string
          roblox_name: string | null
          updated_at: string
          username: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          password_hash: string
          roblox_name?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          password_hash?: string
          roblox_name?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          label: string | null
          type: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          label?: string | null
          type?: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          label?: string | null
          type?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      site_overlays: {
        Row: {
          bg: string | null
          color: string | null
          content: string | null
          created_at: string
          font_size: number
          h: number
          href: string | null
          id: string
          image_url: string | null
          kind: string
          label: string | null
          page: string
          rotate: number
          updated_at: string
          visible: boolean
          w: number
          x: number
          y: number
          z_index: number
        }
        Insert: {
          bg?: string | null
          color?: string | null
          content?: string | null
          created_at?: string
          font_size?: number
          h?: number
          href?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          label?: string | null
          page?: string
          rotate?: number
          updated_at?: string
          visible?: boolean
          w?: number
          x?: number
          y?: number
          z_index?: number
        }
        Update: {
          bg?: string | null
          color?: string | null
          content?: string | null
          created_at?: string
          font_size?: number
          h?: number
          href?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          label?: string | null
          page?: string
          rotate?: number
          updated_at?: string
          visible?: boolean
          w?: number
          x?: number
          y?: number
          z_index?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          closed_message: string | null
          id: number
          is_open: boolean
        }
        Insert: {
          closed_message?: string | null
          id?: number
          is_open?: boolean
        }
        Update: {
          closed_message?: string | null
          id?: number
          is_open?: boolean
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          id: string
          name: string
          password: string
          role: Database["public"]["Enums"]["staff_role"]
          staff_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          password: string
          role?: Database["public"]["Enums"]["staff_role"]
          staff_code: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          password?: string
          role?: Database["public"]["Enums"]["staff_role"]
          staff_code?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          id: number
          session_key: string | null
          visited_at: string
        }
        Insert: {
          id?: number
          session_key?: string | null
          visited_at?: string
        }
        Update: {
          id?: number
          session_key?: string | null
          visited_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_receipt_code: { Args: never; Returns: string }
    }
    Enums: {
      staff_role: "admin" | "manager"
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
      staff_role: ["admin", "manager"],
    },
  },
} as const
