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

-- CreateIndex
CREATE UNIQUE INDEX "studio_projects_room_id_key" ON "studio_projects"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "collaboration_logs_room_id_key" ON "collaboration_logs"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "collaboration_logs_studio_project_id_key" ON "collaboration_logs"("studio_project_id");

-- AddForeignKey
ALTER TABLE "studio_projects" ADD CONSTRAINT "studio_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_projects" ADD CONSTRAINT "studio_projects_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_logs" ADD CONSTRAINT "collaboration_logs_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_logs" ADD CONSTRAINT "collaboration_logs_studio_project_id_fkey" FOREIGN KEY ("studio_project_id") REFERENCES "studio_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
