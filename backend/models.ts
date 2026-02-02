/**
 * Teachmo Core Domain Models (Migrated to TypeScript)
 * Provides type definitions for the core entities used across
 * the backend services, ensuring type safety for DB operations.
 */

// Basic primitive types
export type UUID = string;
export type ISO8601Date = string;
export type Role = 'parent' | 'teacher' | 'school_admin' | 'student';

// ------------------------------------------------------------------
// Organization Domain
// ------------------------------------------------------------------

export interface SchoolDirectory {
  id: UUID;
  nces_id?: string;
  name: string;
  address?: string;
  city: string;
  state: string;
  zip: string;
  integration_enabled: boolean;

  // JSONB configuration for integrations (e.g. Clever ID, Google Domain)
  settings: {
    clever_district_id?: string;
    google_workspace_domain?: string;
    canvas_base_url?: string;
  };

  created_at: ISO8601Date;
  updated_at: ISO8601Date;
}

export interface SchoolParticipationRequest {
  id: UUID;
  user_id: UUID;
  school_name: string;
  school_domain?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: UUID;
  reviewed_at?: ISO8601Date;
  created_at: ISO8601Date;
}

// ------------------------------------------------------------------
// Learning Domain
// ------------------------------------------------------------------

export interface Assignment {
  id: UUID;
  title: string;
  description?: string;
  due_at: ISO8601Date;
  classroom_id: UUID;

  // Status of the assignment itself (not student submission)
  status: 'draft' | 'published' | 'archived';

  // External link (e.g. to Google Classroom)
  external_source_id?: string;
  external_link?: string;
}

export interface StudentSubmission {
  id: UUID;
  assignment_id: UUID;
  student_id: UUID;
  status: 'assigned' | 'submitted' | 'graded' | 'late';
  submitted_at?: ISO8601Date;
  grade?: number | string;
}

// ------------------------------------------------------------------
// User & Auth Domain
// ------------------------------------------------------------------

export interface UserProfile {
  id: UUID;
  email: string;
  display_name: string;
  avatar_url?: string;
  role: Role;

  // Tenant isolation
  tenant_id: UUID;

  // Preferences
  notification_preferences: {
    email_digest: boolean;
    push_notifications: boolean;
    sms_alerts: boolean;
  };

  last_active_at: ISO8601Date;
}

// ------------------------------------------------------------------
// Orchestrator Domain
// ------------------------------------------------------------------

export interface WeeklyBrief {
  id: UUID;
  parent_id: UUID;
  week_start: ISO8601Date;

  // AI-Generated Content
  content: {
    summary: string;
    highlights: string[];
    action_items: Array<{ text: string; link?: string }>;
    conversation_starters: string[];
  };

  status: 'generating' | 'ready' | 'sent' | 'failed';
  viewed_at?: ISO8601Date;
}
