export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          auth_user_id: string | null
          email: string
          name: string
          role: 'admin' | 'user'
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          email: string
          name: string
          role?: 'admin' | 'user'
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          auth_user_id?: string | null
          email?: string
          name?: string
          role?: 'admin' | 'user'
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      inventory_items: {
        Row: {
          id: string
          item_id: string
          item_name: string
          item_display_name: string | null
          item_unit: string
          item_group: string | null
          item_class: string | null
          item_stock_min: number
          item_stock_max: number
          item_stock_reorder: number
          item_stock_current: number
          item_stock_sold: number
          item_cost_average: number
          item_cost_min: number
          item_cost_max: number
          item_serial_number_tracked: boolean
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          item_id: string
          item_name: string
          item_display_name?: string | null
          item_unit?: string
          item_group?: string | null
          item_class?: string | null
          item_stock_min?: number
          item_stock_max?: number
          item_stock_reorder?: number
          item_stock_current?: number
          item_stock_sold?: number
          item_cost_average?: number
          item_cost_min?: number
          item_cost_max?: number
          item_serial_number_tracked?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          item_name?: string
          item_display_name?: string | null
          item_unit?: string
          item_group?: string | null
          item_class?: string | null
          item_stock_min?: number
          item_stock_max?: number
          item_stock_reorder?: number
          item_stock_current?: number
          item_stock_sold?: number
          item_cost_average?: number
          item_cost_min?: number
          item_cost_max?: number
          item_serial_number_tracked?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      vendors: {
        Row: {
          id: string
          vendor_id: string
          vendor_name: string
          vendor_name_legal: string | null
          vendor_group: string | null
          vendor_email: string | null
          vendor_phone: string | null
          vendor_address: string | null
          vendor_currency: string
          vendor_rating_price: number
          vendor_rating_quality: number
          vendor_rating_lead: number
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          vendor_id: string
          vendor_name: string
          vendor_name_legal?: string | null
          vendor_group?: string | null
          vendor_email?: string | null
          vendor_phone?: string | null
          vendor_address?: string | null
          vendor_currency?: string
          vendor_rating_price?: number
          vendor_rating_quality?: number
          vendor_rating_lead?: number
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          vendor_id?: string
          vendor_name?: string
          vendor_name_legal?: string | null
          vendor_group?: string | null
          vendor_email?: string | null
          vendor_phone?: string | null
          vendor_address?: string | null
          vendor_currency?: string
          vendor_rating_price?: number
          vendor_rating_quality?: number
          vendor_rating_lead?: number
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      purchases: {
        Row: {
          id: string
          purchase_vendor_id: string | null
          purchase_date: string
          purchase_po_number: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          purchase_vendor_id?: string | null
          purchase_date?: string
          purchase_po_number?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          purchase_vendor_id?: string | null
          purchase_date?: string
          purchase_po_number?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      purchase_items: {
        Row: {
          id: string
          purchase_id: string
          item_id: string
          vendor_item_code: string | null
          quantity: number
          unit_cost: number
          lead_time: number
          received: boolean
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          purchase_id: string
          item_id: string
          vendor_item_code?: string | null
          quantity: number
          unit_cost: number
          lead_time?: number
          received?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          purchase_id?: string
          item_id?: string
          vendor_item_code?: string | null
          quantity?: number
          unit_cost?: number
          lead_time?: number
          received?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      boms: {
        Row: {
          id: string
          bom_name: string
          bom_item_id: string
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          bom_name: string
          bom_item_id: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          bom_name?: string
          bom_item_id?: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      bom_items: {
        Row: {
          id: string
          bom_id: string
          bom_component_item_id: string
          bom_component_quantity: number
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          bom_id: string
          bom_component_item_id: string
          bom_component_quantity: number
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          bom_id?: string
          bom_component_item_id?: string
          bom_component_quantity?: number
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      assemblies: {
        Row: {
          id: string
          bom_id: string
          assembly_name: string
          assembly_quantity: number
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          bom_id: string
          assembly_name: string
          assembly_quantity: number
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          bom_id?: string
          assembly_name?: string
          assembly_quantity?: number
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      assembly_units: {
        Row: {
          id: string
          assembly_id: string
          assembly_unit_number: number
          assembly_serial_number: string | null
          created_at: string
        }
        Insert: {
          id?: string
          assembly_id: string
          assembly_unit_number: number
          assembly_serial_number?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          assembly_id?: string
          assembly_unit_number?: number
          assembly_serial_number?: string | null
          created_at?: string
        }
      }
      assembly_items: {
        Row: {
          id: string
          assembly_id: string
          assembly_unit_id: string | null
          assembly_component_item_id: string
          assembly_item_serial_number: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          assembly_id: string
          assembly_unit_id?: string | null
          assembly_component_item_id: string
          assembly_item_serial_number?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          assembly_id?: string
          assembly_unit_id?: string | null
          assembly_component_item_id?: string
          assembly_item_serial_number?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          details?: Json | null
          created_at?: string
        }
      }
      dropdown_values: {
        Row: {
          id: string
          drop_type: 'vendor_group' | 'vendor_currency' | 'item_group' | 'item_class'
          drop_value: string
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          drop_type: 'vendor_group' | 'vendor_currency' | 'item_group' | 'item_class'
          drop_value: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          drop_type?: 'vendor_group' | 'vendor_currency' | 'item_group' | 'item_class'
          drop_value?: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
    }
  }
}
