"""
Unit tests for Email value object.
"""
import pytest
from domain.value_objects.email import Email
from domain.exceptions import InvalidEmailException


class TestEmailValueObject:
    """Tests for Email value object validation."""
    
    def test_valid_email_creates_successfully(self):
        """Test that a valid email is accepted."""
        email = Email("test@example.com")
        assert email.value == "test@example.com"
    
    def test_valid_email_with_subdomain(self):
        """Test email with subdomain is accepted."""
        email = Email("user@mail.example.com")
        assert email.value == "user@mail.example.com"
    
    def test_valid_email_with_plus(self):
        """Test email with plus sign is accepted."""
        email = Email("user+tag@example.com")
        assert email.value == "user+tag@example.com"
    
    def test_invalid_email_no_at_symbol(self):
        """Test email without @ is rejected."""
        with pytest.raises(InvalidEmailException):
            Email("invalid-email.com")
    
    def test_invalid_email_no_domain(self):
        """Test email without domain is rejected."""
        with pytest.raises(InvalidEmailException):
            Email("user@")
    
    def test_invalid_email_no_local_part(self):
        """Test email without local part is rejected."""
        with pytest.raises(InvalidEmailException):
            Email("@example.com")
    
    def test_invalid_email_multiple_at(self):
        """Test email with multiple @ is rejected."""
        with pytest.raises(InvalidEmailException):
            Email("user@@example.com")
    
    def test_email_str_representation(self):
        """Test email string representation."""
        email = Email("test@example.com")
        assert str(email) == "test@example.com"
    
    def test_email_equality_same_case(self):
        """Test email equality with same case."""
        email1 = Email("test@example.com")
        email2 = Email("test@example.com")
        assert email1 == email2
    
    def test_email_equality_different_case(self):
        """Test email equality is case-insensitive."""
        email1 = Email("Test@Example.com")
        email2 = Email("test@example.com")
        assert email1 == email2
    
    def test_email_equality_with_string(self):
        """Test email equality with string."""
        email = Email("test@example.com")
        assert email == "test@example.com"
        assert email == "TEST@EXAMPLE.COM"
    
    def test_email_hash_consistency(self):
        """Test email hash is consistent for equal emails."""
        email1 = Email("Test@Example.com")
        email2 = Email("test@example.com")
        assert hash(email1) == hash(email2)
