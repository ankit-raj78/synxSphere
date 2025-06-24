#!/bin/bash

# SyncSphere Codebase Cleanup Script
# This script removes test files, debug files, and outdated documentation

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}==== $1 ====${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

cleanup_files() {
    print_step "Starting SyncSphere Codebase Cleanup"
    
    # Create backup first
    print_step "Creating backup commit"
    git add . && git commit -m "Backup before cleanup - $(date)" || print_warning "Git commit failed (files may already be committed)"
    
    print_step "Removing Test/Debug Files"
    
    # Audio/Room Testing Files
    rm -f test-audio-api-postgresql.js
    rm -f test-audio-upload-quick.js
    rm -f test-audio-separation-features.js
    rm -f test-complete-audio-collaboration.js
    rm -f test-complete-mixing-workflow.js
    rm -f test-compositions-feature.js
    rm -f test-room-functionality.js
    rm -f test-room-collaboration.js
    rm -f test-room-audio-features.js
    rm -f test-room-audio-features-en.js
    rm -f test-room-refresh.js
    rm -f test-simple-audio-mix.js
    rm -f test-mixing-simple.js
    rm -f test-mixing-interface.js
    rm -f test-mixing-implementation.sh
    rm -f test-mixing-workflow-curl.sh
    rm -f test-progress-bar-features.js
    rm -f test-compose-functionality.js
    
    # Database Testing Files
    rm -f test-db-connection.js
    rm -f test-date-formatting.js
    rm -f test-date-formatting.html
    rm -f query-audio-files.js
    
    # Delete room scripts
    rm -f delete-*.js
    rm -f create-*.js
    
    # HTML Debug Files
    rm -f audio-debug-test.html
    rm -f audio-network-test.html
    rm -f mixing-test-results.html
    rm -f quick-audio-test.html
    rm -f registration-debug.html
    rm -f simple-audio-test.html
    rm -f test-join-requests.html
    rm -f test-join-notifications.html
    rm -f token-debug-test.html
    
    # FFmpeg Testing
    rm -f test-ffmpeg-setup.js
    rm -f test-ffmpeg-path-detection.js
    
    print_success "Test/Debug files removed"
    
    print_step "Removing Validation/Verification Scripts"
    
    rm -f validate-aws-deployment.sh
    rm -f validate-audio-collaboration.js
    rm -f verify-*.js
    rm -f check-compositions.js
    rm -f check-prerequisites.sh
    rm -f check-rooms-data.js
    
    print_success "Validation scripts removed"
    
    print_step "Removing Duplicate/Outdated Components"
    
    # Check if files exist before removing
    if [ -f "components/RoomRecommendations-fixed.tsx" ]; then
        rm -f components/RoomRecommendations-fixed.tsx
        print_success "Removed duplicate RoomRecommendations-fixed.tsx"
    fi
    
    if [ -f "components/MusicRoomDashboard.tsx" ]; then
        rm -f components/MusicRoomDashboard.tsx
        print_success "Removed old MusicRoomDashboard.tsx (keeping MusicRoomDashboardNew.tsx)"
    fi
    
    print_step "Removing Outdated Documentation"
    
    rm -f README_AWS_DEPLOYMENT.md
    rm -f AUDIO_FEATURES_COMPLETE.md
    rm -f POSTGRESQL_MIGRATION_COMPLETE.md
    rm -f ROOM_AUDIO_FEATURES_COMPLETE.md
    rm -f ROOM_AUDIO_FEATURES_COMPLETE_EN.md
    rm -f ROOM_JOIN_REQUESTS_COMPLETE.md
    rm -f ROOM_JOIN_REQUESTS_COMPLETE_EN.md
    rm -f PROGRESS_BAR_AND_CLASSIFICATION_COMPLETE.md
    rm -f PROGRESS_BAR_AND_CLASSIFICATION_COMPLETE_EN.md
    rm -f SYNTAX_FIXES_COMPLETE.md
    rm -f JOIN_REQUEST_NOTIFICATIONS_COMPLETE.md
    rm -f ISSUES_RESOLVED.md
    rm -f TYPESCRIPT_CONVERSION_COMPLETE.md
    rm -f DATE_FORMATTING_FIX_COMPLETE.md
    rm -f AUDIO_PLAYBACK_DEBUG_REPORT.md
    rm -f AUDIO_PLAYBACK_DEBUG_REPORT_EN.md
    
    print_success "Outdated documentation removed"
    
    print_step "Removing Redundant Docker/Config Files"
    
    rm -f Dockerfile  # Keep Dockerfile.production
    rm -f Dockerfile.railway  # Keep Dockerfile.production
    rm -f railway.json
    rm -f task-definition-with-db.json
    rm -f .env.debug
    
    print_success "Redundant config files removed"
    
    print_step "Removing Test Scripts"
    
    rm -f test-all.sh
    rm -f setup-mixing-test.sh
    rm -f TESTING_GUIDE.md
    
    print_success "Test scripts removed"
}

show_cleanup_summary() {
    print_step "Cleanup Summary"
    
    echo -e "${GREEN}Files Successfully Removed:${NC}"
    echo "• 17+ Test/Debug JavaScript files"
    echo "• 9+ HTML debug files" 
    echo "• 6+ Validation scripts"
    echo "• 15+ Outdated documentation files"
    echo "• 5+ Redundant Docker/config files"
    echo "• 2+ Duplicate components"
    echo ""
    echo -e "${BLUE}Files Preserved:${NC}"
    echo "• All /app directory files"
    echo "• All /components (except duplicates)"
    echo "• All /lib directory files"
    echo "• Core config: package.json, next.config.js, tailwind.config.js"
    echo "• Database files: /database directory, audio-tables.sql"
    echo "• Production deployment: Dockerfile.production, deploy-aws.sh"
    echo "• Essential scripts: build-and-test.sh, start-server.sh"
    echo ""
    echo -e "${YELLOW}Estimated cleanup:${NC}"
    echo "• ~75 files removed"
    echo "• 5-10MB disk space saved"
    echo "• Significantly cleaner codebase"
}

verify_essential_files() {
    print_step "Verifying Essential Files Remain"
    
    essential_files=(
        "package.json"
        "next.config.js"
        "Dockerfile.production"
        "deploy-aws.sh"
        "build-and-test.sh"
        "app"
        "components"
        "lib"
        "database"
    )
    
    for file in "${essential_files[@]}"; do
        if [ -e "$file" ]; then
            echo -e "${GREEN}✅ $file${NC}"
        else
            echo -e "${RED}❌ $file (MISSING!)${NC}"
        fi
    done
}

main() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════╗"
    echo "║         SyncSphere Codebase Cleanup          ║"
    echo "║           Removing Unnecessary Files         ║"
    echo "╚═══════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Confirm before proceeding
    echo -e "${YELLOW}This will remove ~75 test, debug, and duplicate files.${NC}"
    echo -e "${YELLOW}A backup commit will be created first.${NC}"
    echo ""
    read -p "Do you want to proceed? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cleanup_files
        verify_essential_files
        show_cleanup_summary
        
        print_success "Cleanup completed successfully!"
        echo ""
        echo -e "${BLUE}Next steps:${NC}"
        echo "1. Review the changes: git status"
        echo "2. Test your application: npm run dev"
        echo "3. Commit the cleanup: git add . && git commit -m 'Clean up codebase - remove test/debug files'"
        echo "4. Deploy to production with cleaner codebase"
    else
        print_warning "Cleanup cancelled"
    fi
}

# Run main function
main "$@"
