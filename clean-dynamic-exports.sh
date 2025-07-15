#!/bin/bash

# List of files that have duplicate dynamic exports
files=(
  "app/api/auth/delete-account/route.ts"
  "app/api/admin/init-tables/route.ts"
  "app/api/audio/delete/route.ts"
  "app/api/audio/stream/[id]/route-new.ts"
  "app/api/audio/stream/[id]/route.ts"
  "app/api/audio/compose/route.ts"
  "app/api/audio/upload/route.ts"
  "app/api/rooms/test/route.ts"
  "app/api/rooms/route.ts"
  "app/api/rooms/[id]/join/route.ts"
  "app/api/rooms/[id]/join/[requestId]/route.ts"
  "app/api/rooms/[id]/tracks/route.ts"
  "app/api/rooms/[id]/route.ts"
  "app/api/rooms/[id]/export/route.ts"
  "app/api/rooms/[id]/debug/route.ts"
  "app/api/debug/database/route.ts"
  "app/api/debug/init-sample-data/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Cleaning duplicate dynamic exports in $file"
    # Keep only the first dynamic export and remove duplicates
    awk '
      /export const dynamic = '\''force-dynamic'\''/ {
        if (!seen) {
          print
          seen = 1
        }
        next
      }
      /\/\/ This route requires authentication and should not be statically generated/ {
        if (!comment_seen) {
          print
          comment_seen = 1
        } else if (seen) {
          next
        } else {
          print
        }
        next
      }
      { print }
    ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  fi
done
