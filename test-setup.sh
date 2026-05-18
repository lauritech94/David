#!/bin/bash

echo "🧪 E2E Test Suite Setup & Execution"
echo "=================================="

# Function to setup test users
setup_test_users() {
    echo "🚀 Setting up test users..."
    
    # Call the edge function to setup test users
    curl -X POST "https://hptjzbaiclmgbvxlmllo.supabase.co/functions/v1/setup-test-users?action=setup" \
         -H "Content-Type: application/json" \
         -d '{}'
    
    echo ""
    echo "✅ Test users setup completed!"
    echo ""
    echo "📋 Created test users:"
    echo "  • owner@demo.com (OWNER)"
    echo "  • team_manager@demo.com (TEAM_MANAGER)"
    echo "  • artist_manager@demo.com (ARTIST_MANAGER - Rita Payés)"
    echo "  • artist_observer@demo.com (ARTIST_OBSERVER - Rita Payés)"
    echo "  • booking_editor@demo.com (EDITOR - Gira 2025)"
    echo "  • marketing_viewer@demo.com (VIEWER - Campaña PR)"
    echo ""
    echo "🔑 All users have password: demo123456"
    echo ""
}

# Function to cleanup test users
cleanup_test_users() {
    echo "🧹 Cleaning up test users..."
    
    # Call the edge function to cleanup test users
    curl -X POST "https://hptjzbaiclmgbvxlmllo.supabase.co/functions/v1/setup-test-users?action=cleanup" \
         -H "Content-Type: application/json" \
         -d '{}'
    
    echo ""
    echo "✅ Test users cleanup completed!"
    echo ""
}

# Function to run smoke tests
run_smoke_tests() {
    echo "🧪 Running smoke tests..."
    npx playwright test smoke-tests --project=chromium --reporter=list
    echo ""
}

# Function to run full E2E suite
run_full_tests() {
    echo "🧪 Running full E2E test suite..."
    npx playwright test --reporter=html
    echo ""
}

# Main menu
echo "What would you like to do?"
echo "1) Setup test users only"
echo "2) Run smoke tests (with setup/cleanup)"
echo "3) Run full E2E suite (with setup/cleanup)"
echo "4) Cleanup test users only"
echo "5) Exit"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        setup_test_users
        echo "💡 You can now run: npx playwright test smoke-tests"
        ;;
    2)
        setup_test_users
        run_smoke_tests
        cleanup_test_users
        ;;
    3)
        setup_test_users
        run_full_tests
        cleanup_test_users
        ;;
    4)
        cleanup_test_users
        ;;
    5)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo "🎉 All done!"