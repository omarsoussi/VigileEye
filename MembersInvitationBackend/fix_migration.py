#!/usr/bin/env python3
"""
Fix Alembic migration state for MembersInvitation service
Clears incorrect revision and stamps with correct head
"""
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import ssl

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in environment")
    sys.exit(1)

print(f"🔧 Fixing MembersInvitation database migration state...")
print(f"Database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'unknown'}")

try:
    # Create SSL context for Neon
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    # Create engine with SSL
    engine = create_engine(
        DATABASE_URL,
        connect_args={"ssl_context": ssl_context}
    )
    
    with engine.connect() as conn:
        # Clear the alembic_version table
        print("   - Clearing alembic_version table...")
        conn.execute(text("DELETE FROM alembic_version"))
        conn.commit()
        print("   ✅ Alembic version table cleared")
        
    print("✅ Migration state fixed! Now run: alembic stamp head")
    
except Exception as e:
    print(f"❌ Error fixing migration state: {e}")
    sys.exit(1)
