"""Check DB enum values and invitation data."""
import sys
import traceback

print("Starting check_db.py...")
sys.stdout.flush()

try:
    import ssl
    import pg8000
    print("pg8000 imported OK")
    sys.stdout.flush()
except Exception as e:
    print(f"Import error: {e}")
    traceback.print_exc()
    sys.exit(1)

try:
    from infrastructure.config.settings import get_settings
    s = get_settings()
    db_url = s.database_url
    print(f"DB URL starts with: {db_url[:60]}...")
    sys.stdout.flush()
except Exception as e:
    print(f"Settings error: {e}")
    traceback.print_exc()
    sys.exit(1)

try:
    # Parse connection info from URL
    # postgresql+pg8000://user:pass@host:port/dbname
    from urllib.parse import urlparse
    parsed = urlparse(db_url.replace("postgresql+pg8000://", "postgresql://"))
    
    ssl_context = ssl.create_default_context()
    
    conn = pg8000.connect(
        user=parsed.username,
        password=parsed.password,
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path.lstrip("/"),
        ssl_context=ssl_context,
    )
    print("Connected to database!")
    sys.stdout.flush()
    
    cursor = conn.cursor()
    
    # Check enum values
    print("\n=== ENUM VALUES ===")
    cursor.execute("""
        SELECT t.typname, e.enumlabel 
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        ORDER BY t.typname, e.enumsortorder
    """)
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]}")
    sys.stdout.flush()
    
    # Check invitation data
    print("\n=== INVITATIONS ===")
    cursor.execute("SELECT id, inviter_email, recipient_email, permission, status FROM invitations ORDER BY created_at DESC LIMIT 10")
    rows = cursor.fetchall()
    if not rows:
        print("  No invitations found!")
    for row in rows:
        print(f"  id={row[0]}, inviter={row[1]}, recipient={row[2]}, perm={row[3]}, status={row[4]}")
    sys.stdout.flush()
    
    conn.close()
    print("\nDone!")
    
except Exception as e:
    print(f"DB error: {e}")
    traceback.print_exc()
