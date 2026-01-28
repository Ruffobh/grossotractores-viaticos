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
        PostgrestVersion: "14.1"
    }
    public: {
        Tables: {
            invoices: {
                Row: {
                    branch: string | null
                    comments: string | null
                    created_at: string
                    currency: string | null
                    date: string
                    exchange_rate: number | null
                    file_url: string | null
                    id: string
                    invoice_number: string | null
                    invoice_type: string | null
                    loaded_to_bc: boolean | null
                    parsed_data: Json | null
                    payment_method: string | null
                    status: string | null
                    total_amount: number
                    user_id: string
                    vendor_cuit: string | null
                    vendor_name: string
                }
                Insert: {
                    branch?: string | null
                    comments?: string | null
                    created_at?: string
                    currency?: string | null
                    date: string
                    exchange_rate?: number | null
                    file_url?: string | null
                    id?: string
                    invoice_number?: string | null
                    invoice_type?: string | null
                    loaded_to_bc?: boolean | null
                    parsed_data?: Json | null
                    payment_method?: string | null
                    status?: string | null
                    total_amount: number
                    user_id: string
                    vendor_cuit?: string | null
                    vendor_name: string
                }
                Update: {
                    branch?: string | null
                    comments?: string | null
                    created_at?: string
                    currency?: string | null
                    date?: string
                    exchange_rate?: number | null
                    file_url?: string | null
                    id?: string
                    invoice_number?: string | null
                    invoice_type?: string | null
                    loaded_to_bc?: boolean | null
                    parsed_data?: Json | null
                    payment_method?: string | null
                    status?: string | null
                    total_amount: number
                    user_id: string
                    vendor_cuit?: string | null
                    vendor_name: string
                }
                Relationships: [
                    {
                        foreignKeyName: "invoices_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            profiles: {
                Row: {
                    area: string | null
                    branch: string | null
                    created_at: string
                    email: string | null
                    full_name: string | null
                    id: string
                    monthly_limit: number | null
                    role: string | null
                }
                Insert: {
                    area?: string | null
                    branch?: string | null
                    created_at?: string
                    email?: string | null
                    full_name?: string | null
                    id: string
                    monthly_limit?: number | null
                    role?: string | null
                }
                Update: {
                    area?: string | null
                    branch?: string | null
                    created_at?: string
                    email?: string | null
                    full_name?: string | null
                    id?: string
                    monthly_limit?: number | null
                    role?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? string
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? any
    : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? string
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? any
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? string
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? any
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? string
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? any
    : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof Database
    }
    ? string
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
    ? any
    : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
