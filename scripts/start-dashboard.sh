#!/usr/bin/env bash
# Start the KAI OS dashboard dev server on port 3000
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DASHBOARD_DIR="$SCRIPT_DIR/../dashboard"

echo "🚀 Starting KAI OS Dashboard..."
echo "   Dir: $DASHBOARD_DIR"

# Check .env exists
if [ ! -f "$DASHBOARD_DIR/.env" ]; then
  echo "⚠️  No .env found — copying from .env.example"
  cp "$DASHBOARD_DIR/.env.example" "$DASHBOARD_DIR/.env"
  echo "   Fill in your API keys in dashboard/.env then re-run"
fi

# Install deps if needed
if [ ! -d "$DASHBOARD_DIR/node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install --prefix "$DASHBOARD_DIR"
fi

echo "✅ Dashboard starting at http://localhost:3000"
npm run dev --prefix "$DASHBOARD_DIR"
