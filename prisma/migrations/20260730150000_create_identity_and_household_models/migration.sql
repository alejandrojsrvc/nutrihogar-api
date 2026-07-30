CREATE TYPE "HouseholdMembershipRole" AS ENUM ('ADMIN', 'MEMBER');

CREATE TYPE "HouseholdMembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE "HouseholdInvitationRole" AS ENUM ('ADMIN', 'MEMBER');

CREATE TYPE "HouseholdInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "auth_provider_id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "display_name" VARCHAR(150),
    "avatar_url" VARCHAR(2048),
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    "locale" VARCHAR(10) NOT NULL DEFAULT 'es-AR',
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "households" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ARS',
    "weekly_budget" DECIMAL(12,2),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "household_memberships" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "HouseholdMembershipRole" NOT NULL,
    "status" "HouseholdMembershipStatus" NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "household_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "household_invitations" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "role" "HouseholdInvitationRole" NOT NULL,
    "status" "HouseholdInvitationStatus" NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "invited_by_id" UUID NOT NULL,
    "accepted_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "household_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_auth_provider_id_key" ON "users"("auth_provider_id");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE INDEX "households_created_by_id_idx" ON "households"("created_by_id");
CREATE INDEX "households_deleted_at_idx" ON "households"("deleted_at");

CREATE UNIQUE INDEX "household_memberships_household_id_user_id_key"
    ON "household_memberships"("household_id", "user_id");
CREATE INDEX "household_memberships_household_id_status_idx"
    ON "household_memberships"("household_id", "status");
CREATE INDEX "household_memberships_user_id_status_idx"
    ON "household_memberships"("user_id", "status");

CREATE UNIQUE INDEX "household_invitations_token_hash_key"
    ON "household_invitations"("token_hash");
CREATE INDEX "household_invitations_household_id_status_idx"
    ON "household_invitations"("household_id", "status");
CREATE INDEX "household_invitations_email_idx"
    ON "household_invitations"("email");
CREATE INDEX "household_invitations_invited_by_id_idx"
    ON "household_invitations"("invited_by_id");
CREATE INDEX "household_invitations_accepted_by_id_idx"
    ON "household_invitations"("accepted_by_id");

ALTER TABLE "households"
    ADD CONSTRAINT "households_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "household_memberships"
    ADD CONSTRAINT "household_memberships_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "household_memberships"
    ADD CONSTRAINT "household_memberships_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "household_invitations"
    ADD CONSTRAINT "household_invitations_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "household_invitations"
    ADD CONSTRAINT "household_invitations_invited_by_id_fkey"
    FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "household_invitations"
    ADD CONSTRAINT "household_invitations_accepted_by_id_fkey"
    FOREIGN KEY ("accepted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
