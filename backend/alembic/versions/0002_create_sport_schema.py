"""Create the initial Sport LevelGo PostgreSQL schema.

The table definitions intentionally live in ``alembic/schema/*.sql`` grouped
by business domain.  This file only coordinates their initial installation.

Revision ID: 0002
Revises: 0001
"""

from pathlib import Path

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

SCHEMA_DIR = Path(__file__).resolve().parents[1] / "schema"
SCHEMA_FILES = (
    "identity.sql",
    "catalogs.sql",
    "teams.sql",
    "organizations.sql",
    "tournaments.sql",
    "xp.sql",
    "payments.sql",
    "engagement.sql",
)


def _execute_schema_file(filename: str) -> None:
    # ``utf-8-sig`` accepts schema files saved by Windows editors with a BOM;
    # PostgreSQL otherwise treats that invisible marker as SQL syntax.
    op.execute((SCHEMA_DIR / filename).read_text(encoding="utf-8-sig"))


def upgrade() -> None:
    # Upgrade the project's original temporary users table in place, so an
    # existing local Docker volume can also use the complete UUID-based schema.
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")
    op.execute("ALTER TABLE users ALTER COLUMN id DROP DEFAULT")
    op.execute("ALTER TABLE users ALTER COLUMN id TYPE uuid USING lpad(to_hex(id), 32, '0')::uuid")
    op.execute("ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid()")
    op.execute("ALTER TABLE users ALTER COLUMN email TYPE citext")
    op.execute("ALTER TABLE users DROP COLUMN is_active")
    op.execute("ALTER TABLE users ADD COLUMN account_status varchar(20) NOT NULL DEFAULT 'ACTIVE', ADD COLUMN email_verified boolean NOT NULL DEFAULT false, ADD COLUMN last_login_at timestamptz, ADD COLUMN blocked_at timestamptz, ADD COLUMN blocked_reason text, ADD COLUMN deleted_at timestamptz")
    op.execute("ALTER TABLE users ADD CONSTRAINT ck_users_account_status CHECK (account_status IN ('ACTIVE','BLOCKED','DELETED'))")

    for filename in SCHEMA_FILES:
        _execute_schema_file(filename)

    op.execute("""
    CREATE INDEX ix_auth_sessions_user_id ON auth_sessions(user_id); CREATE INDEX ix_auth_sessions_family ON auth_sessions(session_family_id); CREATE INDEX ix_auth_sessions_expires ON auth_sessions(expires_at); CREATE INDEX ix_auth_sessions_user_revoked ON auth_sessions(user_id,revoked_at); CREATE INDEX ix_identity_user ON user_auth_identities(user_id); CREATE UNIQUE INDEX uq_one_active_season_per_sport ON seasons(sport_id) WHERE is_active; CREATE INDEX ix_teams_owner ON teams(owner_user_id); CREATE INDEX ix_teams_active ON teams(is_active); CREATE INDEX ix_team_members_user ON team_members(user_id); CREATE INDEX ix_org_members_user ON organization_members(user_id); CREATE INDEX ix_org_members_role ON organization_members(organization_id,role); CREATE INDEX ix_tournaments_org ON tournaments(organization_id); CREATE INDEX ix_tournaments_sport_starts ON tournaments(sport_id,starts_at); CREATE INDEX ix_tournaments_org_status ON tournaments(organization_id,status); CREATE INDEX ix_tournaments_status ON tournaments(status); CREATE INDEX ix_tournaments_city ON tournaments(city); CREATE INDEX ix_entries_tournament_status ON tournament_entries(tournament_id,registration_status); CREATE INDEX ix_entries_category ON tournament_entries(category_id); CREATE UNIQUE INDEX uq_active_user_one_team_per_tournament ON tournament_entry_members(tournament_id,user_id) WHERE is_active; CREATE INDEX ix_matches_tournament ON matches(tournament_id); CREATE INDEX ix_matches_category ON matches(category_id); CREATE INDEX ix_matches_round ON matches(round_id); CREATE INDEX ix_matches_a ON matches(participant_a_entry_id); CREATE INDEX ix_matches_b ON matches(participant_b_entry_id); CREATE INDEX ix_matches_status ON matches(status); CREATE INDEX ix_player_sport_rank ON player_sport_xp(sport_id,xp DESC); CREATE INDEX ix_player_season_rank ON player_season_xp(season_id,xp DESC); CREATE INDEX ix_team_sport_rank ON team_sport_xp(sport_id,xp DESC); CREATE INDEX ix_team_season_rank ON team_season_xp(season_id,xp DESC); CREATE INDEX ix_notifications_user_read ON notifications(user_id,read_at); CREATE INDEX ix_notifications_user_created ON notifications(user_id,created_at DESC);
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
    """)
    for table in ("users", "user_auth_identities", "user_profiles", "user_privacy_settings", "sports", "seasons", "teams", "organizations", "tournaments", "tournament_categories", "tournament_entries", "team_tournament_entries", "tournament_entry_members", "tournament_rounds", "matches", "payments", "achievements", "push_notification_devices"):
        op.execute(f"CREATE TRIGGER trg_{table}_updated_at BEFORE UPDATE ON {table} FOR EACH ROW EXECUTE FUNCTION set_updated_at()")
    op.execute("""INSERT INTO sports(code,name) VALUES ('FOOTBALL','Football'),('BASKETBALL','Basketball'),('VOLLEYBALL','Volleyball'),('CHESS','Chess'),('TABLE_TENNIS','Table Tennis') ON CONFLICT(code) DO NOTHING; INSERT INTO tournament_formats(code,name) VALUES ('SWISS','Swiss'),('SINGLE_ELIMINATION','Single elimination'),('GROUPS_THEN_ELIMINATION','Groups then elimination') ON CONFLICT(code) DO NOTHING;""")


def downgrade() -> None:
    raise NotImplementedError("The initial production schema is intentionally not destructively downgraded.")
