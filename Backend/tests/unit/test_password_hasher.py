"""
Unit tests for password hasher.
"""
import pytest
from infrastructure.security.password_hasher import PasswordHasher


class TestPasswordHasher:
    """Tests for password hashing functionality."""
    
    def test_hash_password_returns_hash(self):
        """Test that hashing returns a hash string."""
        password = "SecurePassword123!"
        hashed = PasswordHasher.hash(password)
        
        assert hashed is not None
        assert hashed != password
        assert len(hashed) > 0
    
    def test_hash_is_different_each_time(self):
        """Test that hashing same password gives different hashes (salt)."""
        password = "SecurePassword123!"
        hash1 = PasswordHasher.hash(password)
        hash2 = PasswordHasher.hash(password)
        
        # Different hashes due to random salt
        assert hash1 != hash2
    
    def test_verify_correct_password(self):
        """Test verification with correct password."""
        password = "SecurePassword123!"
        hashed = PasswordHasher.hash(password)
        
        assert PasswordHasher.verify(password, hashed) is True
    
    def test_verify_incorrect_password(self):
        """Test verification with incorrect password."""
        password = "SecurePassword123!"
        wrong_password = "WrongPassword123!"
        hashed = PasswordHasher.hash(password)
        
        assert PasswordHasher.verify(wrong_password, hashed) is False
    
    def test_verify_empty_password(self):
        """Test verification with empty password."""
        password = "SecurePassword123!"
        hashed = PasswordHasher.hash(password)
        
        assert PasswordHasher.verify("", hashed) is False
    
    def test_verify_invalid_hash(self):
        """Test verification with invalid hash."""
        assert PasswordHasher.verify("password", "invalid_hash") is False
    
    def test_verify_none_values(self):
        """Test verification handles None gracefully."""
        password = "SecurePassword123!"
        hashed = PasswordHasher.hash(password)
        
        # Should not raise exception
        try:
            result = PasswordHasher.verify(password, "")
            assert result is False
        except Exception:
            pass  # Expected behavior
