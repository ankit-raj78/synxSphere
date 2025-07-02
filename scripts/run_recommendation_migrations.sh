#!/bin/bash

# Recommendation System Database Migration Script
# This script runs all recommendation system migrations in the correct order

set -e  # Exit on any error

echo "🚀 Starting Recommendation System Database Migration"
echo "=================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "prisma/schema.prisma" ]; then
    print_error "prisma/schema.prisma not found. Please run this script from the project root."
    exit 1
fi

# Load environment variables
if [ -f ".env" ]; then
    source .env
elif [ -f ".env.dev" ]; then
    source .env.dev
else
    print_warning "No .env file found. Make sure DATABASE_URL is set."
fi

# Check if database is accessible
print_status "Checking database connection..."
if ! npx prisma db execute --schema=prisma/schema.prisma --stdin <<< "SELECT 1;" >/dev/null 2>&1; then
    print_error "Cannot connect to database. Please check your DATABASE_URL in .env"
    print_warning "Make sure PostgreSQL is running and accessible"
    exit 1
fi

print_success "Database connection verified"

# Backup current schema (optional but recommended)
print_status "Creating schema backup..."
BACKUP_FILE="schema_backup_$(date +%Y%m%d_%H%M%S).sql"
# Extract URL without schema parameter for pg_dump
PSQL_URL=$(echo "$DATABASE_URL" | sed 's/?schema=public//')
if pg_dump "$PSQL_URL" --schema-only > "$BACKUP_FILE" 2>/dev/null; then
    print_success "Schema backup created: $BACKUP_FILE"
else
    print_warning "Could not create schema backup. Continuing without backup..."
fi

# Step 1: Apply core recommendation system migrations
print_status "Step 1: Applying core recommendation tables migration..."
if psql "$DATABASE_URL" -f "prisma/migrations/001_add_core_recommendation_tables/migration.sql" >/dev/null 2>&1; then
    print_success "✅ Core recommendation tables created"
else
    print_error "❌ Failed to create core recommendation tables"
    exit 1
fi

# Step 2: Apply user and room profiling migrations
print_status "Step 2: Applying user and room profiling migration..."
if psql "$DATABASE_URL" -f "prisma/migrations/002_add_user_room_profiles/migration.sql" >/dev/null 2>&1; then
    print_success "✅ User preferences and room analytics tables created"
else
    print_error "❌ Failed to create user and room profiling tables"
    exit 1
fi

# Step 3: Apply caching and ML management migrations
print_status "Step 3: Applying caching and ML management migration..."
if psql "$DATABASE_URL" -f "prisma/migrations/003_add_caching_ml_management/migration.sql" >/dev/null 2>&1; then
    print_success "✅ Recommendation cache and ML model tables created"
else
    print_error "❌ Failed to create caching and ML management tables"
    exit 1
fi

# Step 4: Enhance AudioFile structure
print_status "Step 4: Enhancing AudioFile table structure..."
if psql "$DATABASE_URL" -f "prisma/migrations/004_enhance_audiofile_structure/migration.sql" >/dev/null 2>&1; then
    print_success "✅ AudioFile table enhanced with structured metadata"
else
    print_error "❌ Failed to enhance AudioFile table"
    exit 1
fi

# Step 5: Verify tables were created
print_status "Step 5: Verifying new tables..."
TABLES_CHECK=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('audio_features', 'user_interactions', 'user_preferences', 'room_analytics', 'recommendation_cache', 'ml_models', 'recommendation_experiments');" 2>/dev/null || echo "0")

if [ "$TABLES_CHECK" = "7" ]; then
    print_success "✅ All 7 recommendation tables verified"
else
    print_warning "⚠️  Expected 7 tables, found $TABLES_CHECK"
fi

echo ""
echo "🎉 Migration completed successfully!"
echo "=================================================="
echo ""
print_success "All recommendation system tables have been created:"
echo "  - ✅ audio_features (for content-based recommendations)"
echo "  - ✅ user_interactions (for collaborative filtering)"
echo "  - ✅ user_preferences (for personalization)"
echo "  - ✅ room_analytics (for room profiling)"
echo "  - ✅ recommendation_cache (for performance)"
echo "  - ✅ ml_models (for model management)"
echo "  - ✅ recommendation_experiments (for A/B testing)"
echo "  - ✅ Enhanced audio_files table (structured metadata)"
echo ""
print_status "Next steps:"
echo "  1. Run the data seeding script: npx ts-node scripts/seed_recommendation_data.ts"
echo "  2. Update your Prisma schema file with the new tables"
echo "  3. Generate new Prisma client: npx prisma generate"
echo "  4. Implement audio feature extraction pipeline"
echo "  5. Build the recommendation engine"
echo ""
print_warning "Remember to update your Prisma client imports in your application!"
