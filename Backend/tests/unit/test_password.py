"""
Unit tests for Password value object.
"""
import pytest
from domain.value_objects.password import Password
from domain.exceptions import InvalidPasswordException


class TestPasswordValueObject:
    """Tests for Password value object validation."""
    
    def test_valid_password_creates_successfully(self):
        """Test that a valid password is accepted."""
        password = Password("SecurePass123!")
        assert password.value == "SecurePass123!"
    
    def test_password_too_short_raises_exception(self):
        """Test that passwords shorter than 12 chars are rejected."""
        with pytest.raises(InvalidPasswordException) as exc_info:
            Password("Short1!")
        assert "at least 12 characters" in str(exc_info.value.message)
    
    def test_password_missing_uppercase_raises_exception(self):
        """Test that passwords without uppercase are rejected."""
        with pytest.raises(InvalidPasswordException) as exc_info:
            Password("lowercase123!@#")
        assert "uppercase letter" in str(exc_info.value.message)
    
    def test_password_missing_lowercase_raises_exception(self):
        """Test that passwords without lowercase are rejected."""
        with pytest.raises(InvalidPasswordException) as exc_info:
            Password("UPPERCASE123!@#")
        assert "lowercase letter" in str(exc_info.value.message)
    
    def test_password_missing_digit_raises_exception(self):
        """Test that passwords without digits are rejected."""
        with pytest.raises(InvalidPasswordException) as exc_info:
            Password("NoDigitsHere!@#")
        assert "digit" in str(exc_info.value.message)
    
    def test_password_missing_special_char_raises_exception(self):
        """Test that passwords without special chars are rejected."""
        with pytest.raises(InvalidPasswordException) as exc_info:
            Password("NoSpecialChar123")
        assert "special character" in str(exc_info.value.message)
    
    def test_password_str_representation_is_masked(self):
        """Test that password string representation is masked."""
        password = Password("SecurePass123!")
        assert str(password) == "********"
        assert repr(password) == "Password(********)"
    
    def test_is_valid_returns_true_for_valid_password(self):
        """Test is_valid method with valid password."""
        assert Password.is_valid("ValidPassword1!") is True
    
    def test_is_valid_returns_false_for_invalid_password(self):
        """Test is_valid method with invalid password."""
        assert Password.is_valid("weak") is False
    
    def test_get_validation_errors_returns_empty_for_valid(self):
        """Test get_validation_errors returns empty list for valid password."""
        errors = Password.get_validation_errors("ValidPassword1!")
        assert errors == []
    
    def test_get_validation_errors_returns_all_errors(self):
        """Test get_validation_errors returns all validation issues."""
        errors = Password.get_validation_errors("weak")
        assert len(errors) >= 4  # At least 4 errors for "weak"
