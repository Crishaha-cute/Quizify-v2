/**
 * Database Types for Supabase
 * 
 * These types correspond to the database schema defined in schema.sql
 * They provide type safety when working with Supabase queries.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          id: string;
          admin_id: string;
          action: string;
          target_table: string;
          target_id: string | null;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action: string;
          target_table: string;
          target_id?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          action?: string;
          target_table?: string;
          target_id?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          }
        ];
      };
      profiles: {
        Row: {
          user_id: string;
          display_name: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          display_name?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quiz_history: {
        Row: {
          id: string;
          user_id: string;
          topic: string;
          difficulty: 'Easy' | 'Medium' | 'Hard';
          score: number;
          points: number;
          total_questions: number;
          rating: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic: string;
          difficulty: 'Easy' | 'Medium' | 'Hard';
          score: number;
          points?: number;
          total_questions: number;
          rating?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          topic?: string;
          difficulty?: 'Easy' | 'Medium' | 'Hard';
          score?: number;
          points?: number;
          total_questions?: number;
          rating?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          id: string;
          quiz_history_id: string;
          question_number: number;
          question_text: string;
          selected_answer: string | null;
          correct_answer: string;
          is_correct: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_history_id: string;
          question_number: number;
          question_text: string;
          selected_answer?: string | null;
          correct_answer: string;
          is_correct?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          quiz_history_id?: string;
          question_number?: number;
          question_text?: string;
          selected_answer?: string | null;
          correct_answer?: string;
          is_correct?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      uploaded_files: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          file_type: string | null;
          file_size: number | null;
          topic: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          file_type?: string | null;
          file_size?: number | null;
          topic?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          file_type?: string | null;
          file_size?: number | null;
          topic?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      quizzes: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          created_by: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          created_by?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          created_by?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          quiz_id: string;
          item_no: string;
          question_type: 'Multiple Choice' | 'Identification' | 'True or False';
          difficulty: 'Easy' | 'Medium' | 'Hard';
          question_text: string;
          options: string[];
          correct_answer: string;
          explanation: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          item_no: string;
          question_type: 'Multiple Choice' | 'Identification' | 'True or False';
          difficulty: 'Easy' | 'Medium' | 'Hard';
          question_text: string;
          options?: string[];
          correct_answer: string;
          explanation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          item_no?: string;
          question_type?: 'Multiple Choice' | 'Identification' | 'True or False';
          difficulty?: 'Easy' | 'Medium' | 'Hard';
          question_text?: string;
          options?: string[];
          correct_answer?: string;
          explanation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      seasons: {
        Row: {
          id: string;
          name: string;
          start_at: string;
          end_at: string;
          is_closed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_at: string;
          end_at: string;
          is_closed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          start_at?: string;
          end_at?: string;
          is_closed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      season_points: {
        Row: {
          season_id: string;
          user_id: string;
          points: number;
          updated_at: string;
        };
        Insert: {
          season_id: string;
          user_id: string;
          points?: number;
          updated_at?: string;
        };
        Update: {
          season_id?: string;
          user_id?: string;
          points?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      season_snapshots: {
        Row: {
          id: string;
          season_id: string;
          snapshot: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          snapshot: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          snapshot?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      user_quiz_stats: {
        Row: {
          user_id: string;
          total_quizzes: number;
          average_score_percentage: number | null;
          best_score: number;
          max_questions: number;
          first_quiz_date: string;
          last_quiz_date: string;
        };
        Relationships: [];
      };
      leaderboard_top10_current_season: {
        Row: {
          user_id: string;
          display_name: string | null;
          points: number;
          rank: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      rotate_season_if_needed: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
}

