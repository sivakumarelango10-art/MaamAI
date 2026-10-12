"""
Secure Staff Account Provisioning Script for MaamAI Production Deployments.
Usage:
    python scripts/provision_staff.py --email aris.vance@university.edu --username aris_vance --name "Dr. Aris Vance" --role "Associate Professor" --dept "Computer Science"
"""

import sys
import os
import argparse
import getpass

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.database import SessionLocal, init_and_migrate_db
from app.models import User, Briefing, OAuthConnection, ActivityLog
from app.auth import hash_password, validate_password_strength

def provision_staff_user(
    email: str,
    username: str,
    full_name: str,
    role: str,
    department: str,
    password: str = None,
):
    init_and_migrate_db()
    db = SessionLocal()
    try:
        # Check existing user
        existing_email = db.query(User).filter(User.email == email).first()
        if existing_email:
            print(f"[ERROR] User with email '{email}' already exists.")
            return False

        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            print(f"[ERROR] Username '{username}' is already taken.")
            return False

        # Get password securely if not provided
        if not password:
            while True:
                pwd1 = getpass.getpass("Enter secure staff password (min 8 chars, letters & digits): ")
                pwd2 = getpass.getpass("Confirm password: ")
                if pwd1 != pwd2:
                    print("[ERROR] Passwords do not match. Please try again.\n")
                    continue
                try:
                    validate_password_strength(pwd1)
                    password = pwd1
                    break
                except Exception as e:
                    print(f"[ERROR] {e.detail}\n")
        else:
            validate_password_strength(password)

        initials = "".join([part[0].upper() for part in full_name.split() if part])[:2] or "ST"

        new_user = User(
            email=email.strip().lower(),
            username=username.strip().lower(),
            hashed_password=hash_password(password),
            full_name=full_name.strip(),
            role=role.strip(),
            department=department.strip(),
            avatar_initials=initials,
            is_active=True,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Initialize clean isolated workspace
        briefing = Briefing(
            user_id=new_user.id,
            date="Today",
            greeting=f"Good morning, {new_user.full_name}",
            quote="“Excellence is not an act, but a habit.” — Aristotle",
            summary=f"Welcome to your isolated MaamAI workspace, {new_user.full_name}.",
            key_focus="Configure academic office hours; Review student communications",
            urgent_count=0,
            meetings_count=0,
            tasks_count=0,
        )
        db.add(briefing)

        oauth = OAuthConnection(
            user_id=new_user.id,
            provider="google",
            email_account=new_user.email,
            is_connected=False,
        )
        db.add(oauth)

        log = ActivityLog(
            user_id=new_user.id,
            title="Account Provisioned",
            description=f"Staff account securely provisioned via administrative CLI.",
            category="auth",
        )
        db.add(log)
        db.commit()

        print(f"\n[SUCCESS] Staff account successfully created for '{new_user.full_name}' (ID: {new_user.id}).")
        print(f"Username: {new_user.username}")
        print(f"Email: {new_user.email}")
        print(f"Workspace: Initialized and isolated.\n")
        return True

    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Securely provision staff accounts for MaamAI.")
    parser.add_argument("--email", required=True, help="University email address")
    parser.add_argument("--username", required=True, help="Staff login username")
    parser.add_argument("--name", required=True, help="Full academic name (e.g. Dr. Aris Vance)")
    parser.add_argument("--role", default="Faculty Member", help="Academic title or role")
    parser.add_argument("--dept", default="School of Computing", help="Academic department")
    parser.add_argument("--password", help="Optional password argument (if omitted, prompts securely without echo)")

    args = parser.parse_args()
    success = provision_staff_user(
        email=args.email,
        username=args.username,
        full_name=args.name,
        role=args.role,
        department=args.dept,
        password=args.password,
    )
    sys.exit(0 if success else 1)
