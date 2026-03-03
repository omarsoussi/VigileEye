#!/bin/bash
# Backend service startup script with migration fix

set -e

echo "🚀 Starting Backend Service..."

# Check if migration state needs fixing
echo "🔍 Checking migration state..."

# Try to get current revision
CURRENT_REVISION=$(alembic current 2>&1 || echo "error")

if echo "$CURRENT_REVISION" | grep -q "003_add_icon_to_zones"; then
    echo "⚠️  Incorrect migration state detected (003_add_icon_to_zones)"
    echo "🔧 Fixing migration state..."
    
    # Run fix script
    python3 fix_migration.py
    
    # Stamp with correct head
    echo "📌 Stamping with correct head revision..."
    alembic stamp head
    
    echo "✅ Migration state fixed!"
elif echo "$CURRENT_REVISION" | grep -q "error\|Can't locate"; then
    echo "⚠️  Migration state corrupted, fixing..."
    python3 fix_migration.py
    alembic stamp head
    echo "✅ Migration state fixed!"
else
    echo "✅ Migration state OK"
fi

# Run migrations
echo "🔄 Running migrations..."
alembic upgrade head

# Start the application
echo "🚀 Starting application..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
