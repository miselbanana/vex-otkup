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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      brojaci_narudzbi: {
        Row: {
          godina: number
          zadnji_broj: number
        }
        Insert: {
          godina: number
          zadnji_broj: number
        }
        Update: {
          godina?: number
          zadnji_broj?: number
        }
        Relationships: []
      }
      fotografije: {
        Row: {
          created_at: string
          id: number
          narudzba_id: string
          putanja: string
        }
        Insert: {
          created_at?: string
          id?: number
          narudzba_id: string
          putanja: string
        }
        Update: {
          created_at?: string
          id?: number
          narudzba_id?: string
          putanja?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotografije_narudzba_id_fkey"
            columns: ["narudzba_id"]
            isOneToOne: false
            referencedRelation: "narudzbe"
            referencedColumns: ["id"]
          },
        ]
      }
      klase: {
        Row: {
          aktivna: boolean
          azurirano: string
          cijena_po_kg: number
          id: number
          materijal_id: number
          naziv: string
          opis: string
        }
        Insert: {
          aktivna?: boolean
          azurirano?: string
          cijena_po_kg: number
          id?: number
          materijal_id: number
          naziv: string
          opis?: string
        }
        Update: {
          aktivna?: boolean
          azurirano?: string
          cijena_po_kg?: number
          id?: number
          materijal_id?: number
          naziv?: string
          opis?: string
        }
        Relationships: [
          {
            foreignKeyName: "klase_materijal_id_fkey"
            columns: ["materijal_id"]
            isOneToOne: false
            referencedRelation: "materijali"
            referencedColumns: ["id"]
          },
        ]
      }
      materijali: {
        Row: {
          aktivan: boolean
          id: number
          naziv: string
          redoslijed: number
          slug: string
        }
        Insert: {
          aktivan?: boolean
          id?: number
          naziv: string
          redoslijed?: number
          slug: string
        }
        Update: {
          aktivan?: boolean
          id?: number
          naziv?: string
          redoslijed?: number
          slug?: string
        }
        Relationships: []
      }
      narudzbe: {
        Row: {
          broj: string
          created_at: string
          dio_dana: Database["public"]["Enums"]["dio_dana"]
          dogovoreni_termin: string | null
          fbclid: string | null
          id: string
          ime_prezime: string
          lat: number | null
          lng: number | null
          mobitel: string
          napomena_interna: string | null
          napomena_kupca: string | null
          naselje_id: number
          potvrdjena_at: string | null
          privola_at: string
          procjena_ukupno: number
          razlog_otkaza: Database["public"]["Enums"]["razlog_otkaza"] | null
          realizirana_at: string | null
          status: Database["public"]["Enums"]["status_narudzbe"]
          stvarno_ukupno: number | null
          ulica: string
          utm_campaign: string | null
          utm_source: string | null
          zeljeni_datum: string
        }
        Insert: {
          broj: string
          created_at?: string
          dio_dana?: Database["public"]["Enums"]["dio_dana"]
          dogovoreni_termin?: string | null
          fbclid?: string | null
          id?: string
          ime_prezime: string
          lat?: number | null
          lng?: number | null
          mobitel: string
          napomena_interna?: string | null
          napomena_kupca?: string | null
          naselje_id: number
          potvrdjena_at?: string | null
          privola_at: string
          procjena_ukupno: number
          razlog_otkaza?: Database["public"]["Enums"]["razlog_otkaza"] | null
          realizirana_at?: string | null
          status?: Database["public"]["Enums"]["status_narudzbe"]
          stvarno_ukupno?: number | null
          ulica: string
          utm_campaign?: string | null
          utm_source?: string | null
          zeljeni_datum: string
        }
        Update: {
          broj?: string
          created_at?: string
          dio_dana?: Database["public"]["Enums"]["dio_dana"]
          dogovoreni_termin?: string | null
          fbclid?: string | null
          id?: string
          ime_prezime?: string
          lat?: number | null
          lng?: number | null
          mobitel?: string
          napomena_interna?: string | null
          napomena_kupca?: string | null
          naselje_id?: number
          potvrdjena_at?: string | null
          privola_at?: string
          procjena_ukupno?: number
          razlog_otkaza?: Database["public"]["Enums"]["razlog_otkaza"] | null
          realizirana_at?: string | null
          status?: Database["public"]["Enums"]["status_narudzbe"]
          stvarno_ukupno?: number | null
          ulica?: string
          utm_campaign?: string | null
          utm_source?: string | null
          zeljeni_datum?: string
        }
        Relationships: [
          {
            foreignKeyName: "narudzbe_naselje_id_fkey"
            columns: ["naselje_id"]
            isOneToOne: false
            referencedRelation: "naselja"
            referencedColumns: ["id"]
          },
        ]
      }
      naselja: {
        Row: {
          id: number
          lat: number | null
          lng: number | null
          maticni_broj: number
          naziv: string
          opcina: string
          postanski_broj: string | null
          zupanija_id: number
        }
        Insert: {
          id?: number
          lat?: number | null
          lng?: number | null
          maticni_broj: number
          naziv: string
          opcina: string
          postanski_broj?: string | null
          zupanija_id: number
        }
        Update: {
          id?: number
          lat?: number | null
          lng?: number | null
          maticni_broj?: number
          naziv?: string
          opcina?: string
          postanski_broj?: string | null
          zupanija_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "naselja_zupanija_id_fkey"
            columns: ["zupanija_id"]
            isOneToOne: false
            referencedRelation: "zupanije"
            referencedColumns: ["id"]
          },
        ]
      }
      stavke: {
        Row: {
          cijena_kg_prijavljena: number
          cijena_kg_stvarna: number | null
          id: number
          iznos_stvarni: number | null
          kg_prijavljeno: number
          kg_stvarno: number | null
          klasa_id: number
          klasa_stvarna_id: number | null
          narudzba_id: string
        }
        Insert: {
          cijena_kg_prijavljena: number
          cijena_kg_stvarna?: number | null
          id?: number
          iznos_stvarni?: number | null
          kg_prijavljeno: number
          kg_stvarno?: number | null
          klasa_id: number
          klasa_stvarna_id?: number | null
          narudzba_id: string
        }
        Update: {
          cijena_kg_prijavljena?: number
          cijena_kg_stvarna?: number | null
          id?: number
          iznos_stvarni?: number | null
          kg_prijavljeno?: number
          kg_stvarno?: number | null
          klasa_id?: number
          klasa_stvarna_id?: number | null
          narudzba_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stavke_klasa_id_fkey"
            columns: ["klasa_id"]
            isOneToOne: false
            referencedRelation: "klase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stavke_klasa_stvarna_id_fkey"
            columns: ["klasa_stvarna_id"]
            isOneToOne: false
            referencedRelation: "klase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stavke_narudzba_id_fkey"
            columns: ["narudzba_id"]
            isOneToOne: false
            referencedRelation: "narudzbe"
            referencedColumns: ["id"]
          },
        ]
      }
      zupanije: {
        Row: {
          id: number
          naziv: string
          pokrivena: boolean
        }
        Insert: {
          id?: number
          naziv: string
          pokrivena?: boolean
        }
        Update: {
          id?: number
          naziv?: string
          pokrivena?: boolean
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
      dio_dana: "jutro" | "popodne" | "svejedno"
      razlog_otkaza:
        | "lazna_narudzba"
        | "kupac_odustao"
        | "ne_javlja_se"
        | "premala_kolicina"
        | "izvan_podrucja"
        | "ostalo"
      status_narudzbe: "nova" | "potvrdjena" | "realizirana" | "otkazana"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      dio_dana: ["jutro", "popodne", "svejedno"],
      razlog_otkaza: [
        "lazna_narudzba",
        "kupac_odustao",
        "ne_javlja_se",
        "premala_kolicina",
        "izvan_podrucja",
        "ostalo",
      ],
      status_narudzbe: ["nova", "potvrdjena", "realizirana", "otkazana"],
    },
  },
} as const
