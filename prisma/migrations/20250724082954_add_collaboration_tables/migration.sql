-- CreateTable
CREATE TABLE "studio_projects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "room_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "project_data" JSONB NOT NULL,
    "project_binary" BYTEA,
    "project_bundle" BYTEA,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "sync_version" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaboration_logs" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "studio_project_id" TEXT NOT NULL,
    "sync_log" BYTEA NOT NULL,
    "last_sync_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaboration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaboration_projects" (
    "id" TEXT NOT NULL,
    "room_id" TEXT,
    "name" TEXT NOT NULL,
    "data" BYTEA,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaboration_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "box_ownership" (
    "project_id" TEXT NOT NULL,
    "box_uuid" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "owned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "box_ownership_pkey" PRIMARY KEY ("project_id","box_uuid")
);

-- CreateTable
CREATE TABLE "box_locks" (
    "project_id" TEXT NOT NULL,
    "box_uuid" TEXT NOT NULL,
    "locked_by" TEXT NOT NULL,
    "locked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "box_locks_pkey" PRIMARY KEY ("project_id","box_uuid")
);

-- CreateTable
CREATE TABLE "collaboration_user_sessions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaboration_user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "studio_projects_room_id_key" ON "studio_projects"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "collaboration_logs_room_id_key" ON "collaboration_logs"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "collaboration_logs_studio_project_id_key" ON "collaboration_logs"("studio_project_id");

-- CreateIndex
CREATE UNIQUE INDEX "collaboration_projects_room_id_key" ON "collaboration_projects"("room_id");

-- CreateIndex
CREATE INDEX "box_ownership_project_id_idx" ON "box_ownership"("project_id");

-- CreateIndex
CREATE INDEX "box_ownership_owner_id_idx" ON "box_ownership"("owner_id");

-- CreateIndex
CREATE INDEX "box_locks_project_id_idx" ON "box_locks"("project_id");

-- CreateIndex
CREATE INDEX "box_locks_expires_at_idx" ON "box_locks"("expires_at");

-- CreateIndex
CREATE INDEX "collaboration_user_sessions_project_id_idx" ON "collaboration_user_sessions"("project_id");

-- CreateIndex
CREATE INDEX "collaboration_user_sessions_user_id_idx" ON "collaboration_user_sessions"("user_id");

-- AddForeignKey
ALTER TABLE "studio_projects" ADD CONSTRAINT "studio_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_projects" ADD CONSTRAINT "studio_projects_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_logs" ADD CONSTRAINT "collaboration_logs_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_logs" ADD CONSTRAINT "collaboration_logs_studio_project_id_fkey" FOREIGN KEY ("studio_project_id") REFERENCES "studio_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_ownership" ADD CONSTRAINT "box_ownership_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "collaboration_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_locks" ADD CONSTRAINT "box_locks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "collaboration_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_user_sessions" ADD CONSTRAINT "collaboration_user_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "collaboration_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
