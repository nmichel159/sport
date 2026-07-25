-- Sport LevelGo schema: teams.sql
-- Managed by Alembic migration 0002. Add future changes as a new migration.

CREATE TABLE teams (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, name varchar(150) NOT NULL, team_code citext NOT NULL UNIQUE, description text, logo_url text, is_active boolean NOT NULL DEFAULT true, deleted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(length(team_code) BETWEEN 3 AND 30));

CREATE TABLE team_members (team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(team_id,user_id));

CREATE TABLE team_invites (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE, created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, token_hash varchar(255) NOT NULL UNIQUE, expires_at timestamptz NOT NULL, max_uses integer NOT NULL DEFAULT 1, used_count integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz, CHECK(max_uses>0), CHECK(used_count BETWEEN 0 AND max_uses), CHECK(expires_at>created_at));

CREATE TABLE team_membership_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), team_id uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT, user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, performed_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, event_type varchar(20) NOT NULL CHECK(event_type IN ('ADDED','REMOVED','JOINED_BY_INVITE')), created_at timestamptz NOT NULL DEFAULT now());
