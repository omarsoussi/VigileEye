"""
Unit tests for OTP generator.
"""
import pytest
from infrastructure.security.otp_generator import OTPGenerator


class TestOTPGenerator:
    """Tests for OTP generation."""
    
    def test_generate_default_length(self):
        """Test OTP generation with default length (6 digits)."""
        otp = OTPGenerator.generate()
        
        assert len(otp) == 6
        assert otp.isdigit()
    
    def test_generate_custom_length(self):
        """Test OTP generation with custom length."""
        otp = OTPGenerator.generate(length=8)
        
        assert len(otp) == 8
        assert otp.isdigit()
    
    def test_generate_returns_different_values(self):
        """Test that multiple generations return different values."""
        otps = [OTPGenerator.generate() for _ in range(100)]
        
        # Should have mostly unique values (very unlikely to have all same)
        unique_otps = set(otps)
        assert len(unique_otps) > 50  # At least 50% unique
    
    def test_generate_only_digits(self):
        """Test that generated OTP contains only digits."""
        for _ in range(100):
            otp = OTPGenerator.generate()
            assert otp.isdigit()
    
    def test_generate_alphanumeric(self):
        """Test alphanumeric OTP generation."""
        otp = OTPGenerator.generate_alphanumeric(length=10)
        
        assert len(otp) == 10
        assert otp.isalnum()
    
    def test_generate_alphanumeric_contains_uppercase(self):
        """Test alphanumeric OTP contains uppercase letters."""
        # Generate multiple to ensure we get some letters
        has_uppercase = False
        for _ in range(100):
            otp = OTPGenerator.generate_alphanumeric()
            if any(c.isupper() for c in otp):
                has_uppercase = True
                break
        
        assert has_uppercase
