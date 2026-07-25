-- Sport LevelGo schema: engagement.sql
-- Managed by Alembic migration 0002. Add future changes as a new migration.

CREATE TABLE achievements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(80) NOT NULL UNIQUE, name varchar(150) NOT NULL, description text NOT NULL, sport_id uuid REFERENCES sports(id) ON DELETE SET NULL, is_active boolean NOT NULL DEFAULT true, rule_type varchar(50) NOT NULL, rule_config jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE user_achievements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE RESTRICT, tournament_id uuid REFERENCES tournaments(id) ON DELETE SET NULL, awarded_at timestamptz NOT NULL DEFAULT now(), calculation_data jsonb, UNIQUE NULLS NOT DISTINCT(user_id,achievement_id,tournament_id));

CREATE TABLE notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, type varchar(60) NOT NULL, title varchar(180) NOT NULL, message text NOT NULL, related_entity_type varchar(50), related_entity_id uuid, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE push_notification_devices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, device_id_hash varchar(255) NOT NULL, platform varchar(20) NOT NULL CHECK(platform IN ('IOS','ANDROID','WEB')), push_token_encrypted text NOT NULL, is_active boolean NOT NULL DEFAULT true, last_seen_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,device_id_hash));

CREATE TABLE security_audit_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL, event_type varchar(80) NOT NULL, entity_type varchar(50), entity_id uuid, ip_address inet, user_agent text, metadata jsonb, created_at timestamptz NOT NULL DEFAULT now());
