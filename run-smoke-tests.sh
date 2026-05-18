#!/bin/bash

echo "🚀 Starting E2E Smoke Tests..."

# Make sure Playwright is installed
npx playwright install chromium

# Run the smoke tests
npx playwright test smoke-tests --project=chromium --headed=false --reporter=list

echo "✅ Smoke tests completed!"