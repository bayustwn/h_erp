-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LOGIN_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'TOKEN_REFRESH';
ALTER TYPE "AuditAction" ADD VALUE 'TOKEN_REUSE';

-- AlterTable
ALTER TABLE "auth_sessions" ADD COLUMN     "compromised_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "auth_refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- Backfill existing active refresh token hashes into the token history table.
INSERT INTO "auth_refresh_tokens" (
    "session_id",
    "token_hash",
    "expires_at",
    "revoked_at",
    "created_at"
)
SELECT
    "id",
    "refresh_token_hash",
    "expires_at",
    "revoked_at",
    "created_at"
FROM "auth_sessions"
ON CONFLICT DO NOTHING;

-- CreateIndex
CREATE UNIQUE INDEX "auth_refresh_tokens_token_hash_key" ON "auth_refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "auth_refresh_tokens_session_id_idx" ON "auth_refresh_tokens"("session_id");

-- CreateIndex
CREATE INDEX "auth_refresh_tokens_expires_at_idx" ON "auth_refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "auth_refresh_tokens_used_at_idx" ON "auth_refresh_tokens"("used_at");

-- CreateIndex
CREATE INDEX "auth_refresh_tokens_revoked_at_idx" ON "auth_refresh_tokens"("revoked_at");

-- CreateIndex
CREATE INDEX "auth_sessions_compromised_at_idx" ON "auth_sessions"("compromised_at");

-- AddForeignKey
ALTER TABLE "auth_refresh_tokens" ADD CONSTRAINT "auth_refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
