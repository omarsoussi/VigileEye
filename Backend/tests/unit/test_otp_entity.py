"""
Unit tests for OTP entity.
"""
import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from domain.entities.otp import OTP, OTPPurpose


class TestOTPEntity:
    """Tests for OTP entity business logic."""
    
    def test_otp_creation(self):
        """Test OTP entity creation."""
        user_id = uuid4()
        expires_at = datetime.utcnow() + timedelta(minutes=5)
        
        otp = OTP(
            user_id=user_id,
            code="123456",
            purpose=OTPPurpose.EMAIL_VERIFICATION,
            expires_at=expires_at
        )
        
        assert otp.user_id == user_id
        assert otp.code == "123456"
        assert otp.purpose == OTPPurpose.EMAIL_VERIFICATION
        assert otp.expires_at == expires_at
        assert otp.is_used is False
    
    def test_otp_factory_create(self):
        """Test OTP factory method."""
        user_id = uuid4()
        
        otp = OTP.create(
            user_id=user_id,
            code="654321",
            purpose=OTPPurpose.LOGIN_2FA,
            expire_minutes=10
        )
        
        assert otp.user_id == user_id
        assert otp.code == "654321"
        assert otp.purpose == OTPPurpose.LOGIN_2FA
        assert otp.expires_at > datetime.utcnow()
        assert otp.expires_at < datetime.utcnow() + timedelta(minutes=11)
    
    def test_otp_is_not_expired_when_valid(self):
        """Test OTP is not expired when within time limit."""
        otp = OTP(
            user_id=uuid4(),
            code="123456",
            purpose=OTPPurpose.PASSWORD_RESET,
            expires_at=datetime.utcnow() + timedelta(minutes=5)
        )
        
        assert otp.is_expired() is False
    
    def test_otp_is_expired_when_past_expiry(self):
        """Test OTP is expired when past expiry time."""
        otp = OTP(
            user_id=uuid4(),
            code="123456",
            purpose=OTPPurpose.PASSWORD_RESET,
            expires_at=datetime.utcnow() - timedelta(minutes=1)
        )
        
        assert otp.is_expired() is True
    
    def test_otp_is_valid_when_not_expired_and_not_used(self):
        """Test OTP is valid when not expired and not used."""
        otp = OTP(
            user_id=uuid4(),
            code="123456",
            purpose=OTPPurpose.EMAIL_VERIFICATION,
            expires_at=datetime.utcnow() + timedelta(minutes=5),
            is_used=False
        )
        
        assert otp.is_valid() is True
    
    def test_otp_is_not_valid_when_expired(self):
        """Test OTP is not valid when expired."""
        otp = OTP(
            user_id=uuid4(),
            code="123456",
            purpose=OTPPurpose.EMAIL_VERIFICATION,
            expires_at=datetime.utcnow() - timedelta(minutes=1),
            is_used=False
        )
        
        assert otp.is_valid() is False
    
    def test_otp_is_not_valid_when_used(self):
        """Test OTP is not valid when already used."""
        otp = OTP(
            user_id=uuid4(),
            code="123456",
            purpose=OTPPurpose.EMAIL_VERIFICATION,
            expires_at=datetime.utcnow() + timedelta(minutes=5),
            is_used=True
        )
        
        assert otp.is_valid() is False
    
    def test_mark_as_used(self):
        """Test marking OTP as used."""
        otp = OTP(
            user_id=uuid4(),
            code="123456",
            purpose=OTPPurpose.LOGIN_2FA,
            expires_at=datetime.utcnow() + timedelta(minutes=5)
        )
        
        assert otp.is_used is False
        otp.mark_as_used()
        assert otp.is_used is True
    
    def test_otp_purpose_enum_values(self):
        """Test OTP purpose enum values."""
        assert OTPPurpose.EMAIL_VERIFICATION.value == "email_verification"
        assert OTPPurpose.LOGIN_2FA.value == "login_2fa"
        assert OTPPurpose.PASSWORD_RESET.value == "password_reset"
