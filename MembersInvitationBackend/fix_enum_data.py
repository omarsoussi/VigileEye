"""One-off script to fix uppercase enum values in groups/group_members tables."""
from sqlalchemy import text
from infrastructure.persistence.database import SessionLocal

db = SessionLocal()

# Fix groups table
db.execute(text("UPDATE groups SET default_permission = 'reader' WHERE default_permission = 'READER'"))
db.execute(text("UPDATE groups SET default_permission = 'editor' WHERE default_permission = 'EDITOR'"))

# Fix group_members table
db.execute(text("UPDATE group_members SET access = 'reader' WHERE access = 'READER'"))
db.execute(text("UPDATE group_members SET access = 'editor' WHERE access = 'EDITOR'"))
db.execute(text("UPDATE group_members SET status = 'pending' WHERE status = 'PENDING'"))
db.execute(text("UPDATE group_members SET status = 'accepted' WHERE status = 'ACCEPTED'"))
db.execute(text("UPDATE group_members SET status = 'declined' WHERE status = 'DECLINED'"))

db.commit()
print("Done! Verifying...")

for r in db.execute(text("SELECT name, default_permission FROM groups")).fetchall():
    print(f"  Group: {r[0]}, permission: {r[1]}")
for r in db.execute(text("SELECT member_email, access, status FROM group_members")).fetchall():
    print(f"  Member: {r[0]}, access: {r[1]}, status: {r[2]}")

db.close()
print("All fixed.")
