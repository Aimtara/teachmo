-- Core Teachmo schema
-- Organizations and schools
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  timezone text DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Profiles and roles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  app_role text NOT NULL CHECK (app_role IN ('parent','teacher','partner','system_admin','school_admin','district_admin')),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Children and guardians
CREATE TABLE IF NOT EXISTS children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text,
  birthdate date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guardian_children (
  guardian_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  relationship text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guardian_id, child_id)
);

-- Classrooms
CREATE TABLE IF NOT EXISTS classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, name)
);

CREATE TABLE IF NOT EXISTS classroom_students (
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (classroom_id, child_id)
);

-- Messaging
CREATE TABLE IF NOT EXISTS message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS thread_participants (
  thread_id uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(thread_id, profile_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
  classroom_id uuid REFERENCES classrooms(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Activities and library
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  subject text,
  grade_level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  url text,
  format text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Partner submissions
CREATE TABLE IF NOT EXISTS partner_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Event log
CREATE TABLE IF NOT EXISTS event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_id uuid,
  entity_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Updated at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.columns WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON %I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();', tbl, tbl);
  END LOOP;
END;
$$;
