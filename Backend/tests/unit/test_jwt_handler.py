"""
Unit tests for JWT handler.
"""
import pytest
from uuid import uuid4
from datetime import datetime, timedelta
from jose import jwt as jose_jwt
from infrastructure.security.jwt_handler import JWTHandler, TokenType
from domain.exceptions import TokenExpiredException, InvalidTokenException


class TestJWTHandler:
    """Tests for JWT token handling."""
    
    @pytest.fixture
    def jwt_handler(self):
        """Create JWT handler with short expiry for testing."""
        return JWTHandler(
            secret_key="test-secret-key-for-testing-only",
            algorithm="HS256",
            access_expire_minutes=30,
            refresh_expire_days=7
        )
    
    def test_create_access_token(self, jwt_handler):
        """Test access token creation."""
        user_id = uuid4()
        email = "test@example.com"
        
        token = jwt_handler.create_access_token(user_id, email)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_create_refresh_token(self, jwt_handler):
        """Test refresh token creation."""
        user_id = uuid4()
        
        token = jwt_handler.create_refresh_token(user_id)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_create_token_pair(self, jwt_handler):
        """Test token pair creation."""
        user_id = uuid4()
        email = "test@example.com"
        
        tokens = jwt_handler.create_token_pair(user_id, email)
        
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert "token_type" in tokens
        assert tokens["token_type"] == "bearer"
    
    def test_verify_valid_access_token(self, jwt_handler):
        """Test verification of valid access token."""
        user_id = uuid4()
        email = "test@example.com"
        
        token = jwt_handler.create_access_token(user_id, email)
        payload = jwt_handler.verify_token(token, TokenType.ACCESS)
        
        assert payload["sub"] == str(user_id)
        assert payload["email"] == email
        assert payload["type"] == TokenType.ACCESS
    
    def test_verify_valid_refresh_token(self, jwt_handler):
        """Test verification of valid refresh token."""
        user_id = uuid4()
        
        token = jwt_handler.create_refresh_token(user_id)
        payload = jwt_handler.verify_token(token, TokenType.REFRESH)
        
        assert payload["sub"] == str(user_id)
        assert payload["type"] == TokenType.REFRESH
    
    def test_verify_wrong_token_type_raises(self, jwt_handler):
        """Test that verifying with wrong token type raises exception."""
        user_id = uuid4()
        
        access_token = jwt_handler.create_access_token(user_id, "test@example.com")
        
        with pytest.raises(InvalidTokenException):
            jwt_handler.verify_token(access_token, TokenType.REFRESH)
    
    def test_verify_invalid_token_raises(self, jwt_handler):
        """Test that invalid token raises exception."""
        with pytest.raises(InvalidTokenException):
            jwt_handler.verify_token("invalid.token.here", TokenType.ACCESS)
    
    def test_verify_tampered_token_raises(self, jwt_handler):
        """Test that tampered token raises exception."""
        user_id = uuid4()
        token = jwt_handler.create_access_token(user_id, "test@example.com")
        
        # Tamper with token
        tampered = token[:-5] + "xxxxx"
        
        with pytest.raises(InvalidTokenException):
            jwt_handler.verify_token(tampered, TokenType.ACCESS)
    
    def test_get_user_id_from_token(self, jwt_handler):
        """Test extracting user ID from token."""
        user_id = uuid4()
        email = "test@example.com"
        
        token = jwt_handler.create_access_token(user_id, email)
        extracted_id = jwt_handler.get_user_id_from_token(token, TokenType.ACCESS)
        
        assert extracted_id == user_id
    
    def test_expired_token_raises(self):
        """Test that expired token raises exception."""
        # Manually create an already-expired token
        secret_key = "test-secret"
        algorithm = "HS256"
        user_id = uuid4()
        
        # Create token that expired 10 seconds ago
        expire = datetime.utcnow() - timedelta(seconds=10)
        
        payload = {
            "sub": str(user_id),
            "email": "test@example.com",
            "type": TokenType.ACCESS,
            "exp": expire,
            "iat": datetime.utcnow() - timedelta(minutes=5),
        }
        
        expired_token = jose_jwt.encode(payload, secret_key, algorithm=algorithm)
        
        jwt_handler = JWTHandler(secret_key=secret_key)
        
        with pytest.raises(TokenExpiredException):
            jwt_handler.verify_token(expired_token, TokenType.ACCESS)
