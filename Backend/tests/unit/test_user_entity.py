"""
Unit tests for User entity.
"""
import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from domain.entities.user import User


class TestUserEntity:
    """Tests for User entity business logic."""
    
    def test_user_creation(self):
        """Test user entity creation with required fields."""
        user = User(
            email="test@example.com",
            username="testuser",
            password_hash="hashed_password"
        )
        
        assert user.email == "test@example.com"
        assert user.username == "testuser"
        assert user.password_hash == "hashed_password"
        assert user.is_verified is False
        assert user.failed_login_attempts == 0
        assert user.lockout_until is None
        assert user.google_id is None
    
    def test_user_is_not_locked_initially(self):
        """Test that new user is not locked."""
        user = User(
            email="test@example.com",
            username="testuser",
            password_hash="hash"
        )
        
        assert user.is_locked() is False
    
    def test_user_is_locked_when_lockout_in_future(self):
        """Test that user is locked when lockout_until is in future."""
        user = User(
            email="test@example.com",
            username="testuser",
            password_hash="hash",
            lockout_until=datetime.utcnow() + timedelta(hours=1)
        )
        
        assert user.is_locked() is True
    
    def test_user_is_not_locked_when_lockout_expired(self):
        """Test that user is not locked when lockout has expired."""
        user = User(
            email="test@example.com",
            username="testuser",
            password_hash="hash",
            lockout_until=datetime.utcnow() - timedelta(hours=1)
        )
        
        assert user.is_locked() is False
    
    def test_increment_failed_attempts(self):
        """Test incrementing failed login attempts."""
        user = User(
            email="test@example.com",
            username="testuser",
            password_hash="hash"
        )
        
        assert user.failed_login_attempts == 0
        user.increment_failed_attempts()
        assert user.failed_login_attempts == 1
        user.increment_failed_attempts()
        assert user.failed_login_attempts == 2
    
    def test_reset_failed_attempts(self):
        """Test resetting failed login attempts."""
        user = User(
            email="test@example.com",
            username="testuser",
            password_hash="hash",
            failed_login_attempts=5,
            lockout_until=datetime.utcnow() + timedelta(hours=1)
        )
        
        user.reset_failed_attempts()
        
        assert user.failed_login_attempts == 0
        assert user.lockout_until is None
    
    def test_lock_account(self):
        """Test locking account."""
        user = User(
            email="test@example.com",
            username="testuser",
            password_hash="hash"
        )
        
        lockout_time = datetime.utcnow() + timedelta(hours=1)
        user.lock_account(lockout_time)
        
        assert user.lockout_until == lockout_time
        assert user.is_locked() is True
    
    def test_unlock_account(self):
        """Test unlocking account."""
        user = User(
            email="test@example.com",
            username="testuser",
            password_hash="hash",
            failed_login_attempts=3,
            lockout_until=datetime.utcnow() + timedelta(hours=1)
        )
        
        user.unlock_account()
        
        assert user.lockout_until is None
        assert user.failed_login_attempts == 0
        assert user.is_locked() is False
    
    def test_verify_email(self):
        """Test email verification."""
        user = User(
            email="test@example.com",
            username="testuser",
            password_hash="hash"
        )
        
        assert user.is_verified is False
        user.verify_email()
        assert user.is_verified is True
    
    def test_update_last_login(self):
        """Test updating last login timestamp."""
        user = User(
            email="test@example.com",
            username="testuser",
            password_hash="hash"
        )
        
        assert user.last_login is None
        user.update_last_login()
        assert user.last_login is not None
        assert user.last_login <= datetime.utcnow()
    
    def test_update_password(self):
        """Test updating password hash."""
        user = User(
            email="test@example.com",
            username="testuser",
            password_hash="old_hash"
        )
        
        user.update_password("new_hash")
        assert user.password_hash == "new_hash"
    
    def test_link_google_account(self):
        """Test linking Google OAuth account."""
        user = User(
            email="test@example.com",
            username="testuser",
            password_hash="hash"
        )
        
        assert user.google_id is None
        assert user.is_verified is False
        
        user.link_google_account("google123")
        
        assert user.google_id == "google123"
        assert user.is_verified is True  # Google accounts are pre-verified
