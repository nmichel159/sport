-- Sport LevelGo schema: catalogs.sql
-- Managed by Alembic migration 0002. Add future changes as a new migration.

CREATE TABLE sports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(50) NOT NULL UNIQUE, name varchar(120) NOT NULL UNIQUE, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE seasons (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE RESTRICT, name varchar(120) NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, is_active boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(sport_id,name), CHECK(ends_at>starts_at));

CREATE TABLE tournament_formats (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(50) NOT NULL UNIQUE, name varchar(120) NOT NULL, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
