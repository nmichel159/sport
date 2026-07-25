-- Sport LevelGo schema: organizations.sql
-- Managed by Alembic migration 0002. Add future changes as a new migration.

CREATE TABLE organizations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, name varchar(180) NOT NULL, slug citext NOT NULL UNIQUE, description text, logo_url text, contact_email citext, is_active boolean NOT NULL DEFAULT true, deleted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE organization_members (organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, role varchar(20) NOT NULL CHECK(role IN ('ADMIN','MEMBER')), added_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL, joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(organization_id,user_id));

CREATE TABLE organization_invites (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, invited_user_id uuid REFERENCES users(id) ON DELETE CASCADE, invited_email citext, role varchar(20) NOT NULL DEFAULT 'MEMBER' CHECK(role IN ('ADMIN','MEMBER')), token_hash varchar(255) NOT NULL UNIQUE, created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, expires_at timestamptz NOT NULL, accepted_at timestamptz, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), CHECK(invited_user_id IS NOT NULL OR invited_email IS NOT NULL));
