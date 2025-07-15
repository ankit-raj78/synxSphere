#!/bin/bash

# List of files that need the dynamic export
files=(
  "app/api/auth/delete-account/route.ts"
  "app/api/admin/init-tables/route.ts"
  "app/api/audio/delete/route.ts"
  "app/api/audio/compositions/delete/route.ts"
  "app/api/audio/compositions/stream/[id]/route.ts"
  "app/api/audio/compositions/route.ts"
  "app/api/audio/stream/[id]/route-new.ts"
  "app/api/audio/stream/[id]/route.ts"
  "app/api/audio/compose/route.ts"
  "app/api/audio/files/route.ts"
  "app/api/audio/files/[id]/route.ts"
  "app/api/audio/upload/route.ts"
  "app/api/rooms/test/route.ts"
  "app/api/rooms/route.ts"
  "app/api/rooms/[id]/join/route.ts"
  "app/api/rooms/[id]/join/[requestId]/route.ts"
  "app/api/rooms/[id]/compositions/route.ts"
  "app/api/rooms/[id]/tracks/route.ts"
  "app/api/rooms/[id]/route.ts"
  "app/api/rooms/[id]/files/route.ts"
  "app/api/rooms/[id]/export/route.ts"
  "app/api/rooms/[id]/debug/route.ts"
  "app/api/debug/database/route.ts"
  "app/api/debug/init-sample-data/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Check if the file already has the dynamic export
    if ! grep -q "export const dynamic" "$file"; then
      echo "Adding dynamic export to $file"
      # Add the dynamic export after the imports
      sed -i '' '/^import.*$/a\
\
// This route requires authentication and should not be statically generated\
export const dynamic = '\''force-dynamic'\''\
' "$file"
    else
      echo "Dynamic export already exists in $file"
    fi
  else
    echo "File not found: $file"
  fi
done
