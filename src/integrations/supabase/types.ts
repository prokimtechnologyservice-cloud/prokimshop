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
          image_url: string | null
          pinned: boolean
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          pinned?: boolean
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          pinned?: boolean
          title?: string
        }
        Relationships: []
      }
      auction_bids: {
        Row: {
          amount: number
          created_at: string
          id: string
          product_id: string
          roblox_name: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          product_id: string
          roblox_name?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          product_id?: string
          roblox_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_bids_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bids_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          roblox_name: string | null
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          roblox_name?: string | null
          unit_price: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          roblox_name?: string | null
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
          banner_url: string | null
          block_color: string | null
          button_color: string | null
          created_at: string
          description: string | null
          display_mode: string
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          product_sort_mode: string
          search_keywords: string[]
          slug: string | null
          sort_order: number
        }
        Insert: {
          banner_url?: string | null
          block_color?: string | null
          button_color?: string | null
          created_at?: string
          description?: string | null
          display_mode?: string
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          product_sort_mode?: string
          search_keywords?: string[]
          slug?: string | null
          sort_order?: number
        }
        Update: {
          banner_url?: string | null
          block_color?: string | null
          button_color?: string | null
          created_at?: string
          description?: string | null
          display_mode?: string
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          product_sort_mode?: string
          search_keywords?: string[]
          slug?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_views: {
        Row: {
          category_id: string
          created_at: string
          id: string
          session_key: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          session_key?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          session_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_views_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          body: string
          created_at: string
          deleted: boolean
          edited_at: string | null
          id: string
          is_broadcast: boolean
          sender: string
          thread_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          body: string
          created_at?: string
          deleted?: boolean
          edited_at?: string | null
          id?: string
          is_broadcast?: boolean
          sender: string
          thread_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string
          created_at?: string
          deleted?: boolean
          edited_at?: string | null
          id?: string
          is_broadcast?: boolean
          sender?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          last_admin_read_at: string
          last_user_read_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_admin_read_at?: string
          last_user_read_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_admin_read_at?: string
          last_user_read_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      countdowns: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          ends_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gift_cards: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          label: string | null
          reward_balance: number
          reward_product_ids: string[]
          reward_promotion_id: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          label?: string | null
          reward_balance?: number
          reward_product_ids?: string[]
          reward_promotion_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          label?: string | null
          reward_balance?: number
          reward_product_ids?: string[]
          reward_promotion_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_cards_reward_promotion_id_fkey"
            columns: ["reward_promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_cards_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mystery_box_items: {
        Row: {
          box_product_id: string
          chance: number | null
          created_at: string
          id: string
          image_url: string | null
          is_nothing: boolean
          label: string | null
          prize_product_id: string | null
          stock: number
          weight: number
        }
        Insert: {
          box_product_id: string
          chance?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_nothing?: boolean
          label?: string | null
          prize_product_id?: string | null
          stock?: number
          weight?: number
        }
        Update: {
          box_product_id?: string
          chance?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_nothing?: boolean
          label?: string | null
          prize_product_id?: string | null
          stock?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "mystery_box_items_box_product_id_fkey"
            columns: ["box_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mystery_box_items_prize_product_id_fkey"
            columns: ["prize_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      mystery_box_spins: {
        Row: {
          box_product_id: string | null
          created_at: string
          id: string
          order_id: string | null
          prize_product_id: string | null
          spin_price: number
          user_id: string | null
        }
        Insert: {
          box_product_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          prize_product_id?: string | null
          spin_price?: number
          user_id?: string | null
        }
        Update: {
          box_product_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          prize_product_id?: string | null
          spin_price?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mystery_box_spins_box_product_id_fkey"
            columns: ["box_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mystery_box_spins_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mystery_box_spins_prize_product_id_fkey"
            columns: ["prize_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mystery_box_spins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          delivered_payload: string | null
          fulfillment_status: string
          id: string
          mystery_box_id: string | null
          mystery_box_name: string | null
          order_id: string
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          return_reason: string | null
          return_status: string
          returned_at: string | null
          roblox_name: string | null
          unit_price: number
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          delivered_payload?: string | null
          fulfillment_status?: string
          id?: string
          mystery_box_id?: string | null
          mystery_box_name?: string | null
          order_id: string
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity?: number
          return_reason?: string | null
          return_status?: string
          returned_at?: string | null
          roblox_name?: string | null
          unit_price: number
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          delivered_payload?: string | null
          fulfillment_status?: string
          id?: string
          mystery_box_id?: string | null
          mystery_box_name?: string | null
          order_id?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          return_reason?: string | null
          return_status?: string
          returned_at?: string | null
          roblox_name?: string | null
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
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_token: string | null
          created_at: string
          id: string
          ip_address: string | null
          paid_from_balance: boolean
          payment_status: string
          receipt_code: string | null
          status: string
          total: number
          user_id: string
        }
        Insert: {
          client_token?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          paid_from_balance?: boolean
          payment_status?: string
          receipt_code?: string | null
          status?: string
          total?: number
          user_id: string
        }
        Update: {
          client_token?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          paid_from_balance?: boolean
          payment_status?: string
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
      product_account_stock: {
        Row: {
          created_at: string
          id: string
          order_item_id: string | null
          payload: string
          product_id: string
          sold_at: string | null
          sold_to: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_item_id?: string | null
          payload: string
          product_id: string
          sold_at?: string | null
          sold_to?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_item_id?: string | null
          payload?: string
          product_id?: string
          sold_at?: string | null
          sold_to?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_account_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          approved: boolean
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          auction_ends_at: string | null
          auction_final_price: number | null
          auction_start_price: number
          auction_status: string
          auction_step: number
          auction_winner_id: string | null
          box_bg_color: string | null
          box_bg_image: string | null
          box_border_color: string | null
          box_mode: string
          box_spin_price: number
          box_stock: number | null
          box_template: string
          category_id: string | null
          claim_instructions: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_new: boolean
          is_preorder: boolean
          mystery_only: boolean
          name: string
          preorder_note: string | null
          price: number
          product_type: string
          search_keywords: string[]
          sold_count: number
          sort_order: number
          stock: number | null
          view_count: number
        }
        Insert: {
          auction_ends_at?: string | null
          auction_final_price?: number | null
          auction_start_price?: number
          auction_status?: string
          auction_step?: number
          auction_winner_id?: string | null
          box_bg_color?: string | null
          box_bg_image?: string | null
          box_border_color?: string | null
          box_mode?: string
          box_spin_price?: number
          box_stock?: number | null
          box_template?: string
          category_id?: string | null
          claim_instructions?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_new?: boolean
          is_preorder?: boolean
          mystery_only?: boolean
          name: string
          preorder_note?: string | null
          price?: number
          product_type?: string
          search_keywords?: string[]
          sold_count?: number
          sort_order?: number
          stock?: number | null
          view_count?: number
        }
        Update: {
          auction_ends_at?: string | null
          auction_final_price?: number | null
          auction_start_price?: number
          auction_status?: string
          auction_step?: number
          auction_winner_id?: string | null
          box_bg_color?: string | null
          box_bg_image?: string | null
          box_border_color?: string | null
          box_mode?: string
          box_spin_price?: number
          box_stock?: number | null
          box_template?: string
          category_id?: string | null
          claim_instructions?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_new?: boolean
          is_preorder?: boolean
          mystery_only?: boolean
          name?: string
          preorder_note?: string | null
          price?: number
          product_type?: string
          search_keywords?: string[]
          sold_count?: number
          sort_order?: number
          stock?: number | null
          view_count?: number
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
      promotions: {
        Row: {
          active: boolean
          applies_to: string
          apply_after_discounts: boolean
          apply_on: string
          buy_qty: number
          category_ids: string[]
          code: string | null
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          get_qty: number
          grant_rule: string
          grant_value: number
          id: string
          image_url: string | null
          kind: string
          link_enabled: boolean
          link_token: string | null
          max_subtotal: number | null
          min_subtotal: number
          name: string
          product_ids: string[]
          require_distinct_products: number
          starts_at: string
          updated_at: string
          valid_days: number
        }
        Insert: {
          active?: boolean
          applies_to?: string
          apply_after_discounts?: boolean
          apply_on?: string
          buy_qty?: number
          category_ids?: string[]
          code?: string | null
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          get_qty?: number
          grant_rule?: string
          grant_value?: number
          id?: string
          image_url?: string | null
          kind?: string
          link_enabled?: boolean
          link_token?: string | null
          max_subtotal?: number | null
          min_subtotal?: number
          name: string
          product_ids?: string[]
          require_distinct_products?: number
          starts_at?: string
          updated_at?: string
          valid_days?: number
        }
        Update: {
          active?: boolean
          applies_to?: string
          apply_after_discounts?: boolean
          apply_on?: string
          buy_qty?: number
          category_ids?: string[]
          code?: string | null
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          get_qty?: number
          grant_rule?: string
          grant_value?: number
          id?: string
          image_url?: string | null
          kind?: string
          link_enabled?: boolean
          link_token?: string | null
          max_subtotal?: number | null
          min_subtotal?: number
          name?: string
          product_ids?: string[]
          require_distinct_products?: number
          starts_at?: string
          updated_at?: string
          valid_days?: number
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
      site_popups: {
        Row: {
          active: boolean
          body: string | null
          created_at: string
          href: string | null
          id: string
          image_url: string | null
          promotion_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          image_url?: string | null
          promotion_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          image_url?: string | null
          promotion_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_popups_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          closed_message: string | null
          id: number
          is_open: boolean
          stat_online: number | null
          stat_sold: number | null
          stat_topup: number | null
          stat_users: number | null
          stats_manual: boolean
          stats_reset_at: string | null
        }
        Insert: {
          closed_message?: string | null
          id?: number
          is_open?: boolean
          stat_online?: number | null
          stat_sold?: number | null
          stat_topup?: number | null
          stat_users?: number | null
          stats_manual?: boolean
          stats_reset_at?: string | null
        }
        Update: {
          closed_message?: string | null
          id?: number
          is_open?: boolean
          stat_online?: number | null
          stat_sold?: number | null
          stat_topup?: number | null
          stat_users?: number | null
          stats_manual?: boolean
          stats_reset_at?: string | null
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
      user_promotions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          order_id: string | null
          promotion_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          promotion_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          promotion_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_promotions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_promotions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          ip_address: string | null
          note: string | null
          type: string
          user_id: string
          voucher_code: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          ip_address?: string | null
          note?: string | null
          type: string
          user_id: string
          voucher_code?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          ip_address?: string | null
          note?: string | null
          type?: string
          user_id?: string
          voucher_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
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
      adjust_product_stock: {
        Args: { _delta: number; _product_id: string }
        Returns: number
      }
      bump_sold_count: {
        Args: { _delta: number; _product_id: string }
        Returns: undefined
      }
      deduct_balance: {
        Args: { _amount: number; _order_id: string; _user_id: string }
        Returns: number
      }
      generate_receipt_code: { Args: never; Returns: string }
      purge_old_stats: { Args: never; Returns: undefined }
      redeem_gift_card: {
        Args: { _code: string; _user_id: string }
        Returns: Json
      }
      refund_to_user: {
        Args: { _amount: number; _note: string; _user_id: string }
        Returns: number
      }
      topup_balance: {
        Args: {
          _amount: number
          _ip: string
          _user_id: string
          _voucher: string
        }
        Returns: number
      }
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
