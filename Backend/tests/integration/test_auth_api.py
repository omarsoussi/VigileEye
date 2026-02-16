"""
Integration tests for authentication API endpoints.
"""
import pytest
from fastapi.testclient import TestClient


class TestHealthEndpoints:
    """Tests for health and root endpoints."""
    
    def test_health_check(self, client: TestClient):
        """Test health check endpoint."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "camera-monitoring-api"
    
    def test_root_endpoint(self, client: TestClient):
        """Test root endpoint."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Camera Monitoring System API"
        assert data["version"] == "1.0.0"


class TestRegistrationEndpoint:
    """Tests for user registration endpoint."""
    
    def test_register_success(self, client: TestClient, test_user_data: dict):
        """Test successful user registration."""
        response = client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert "verification" in data["message"].lower() or "code" in data["message"].lower()
    
    def test_register_weak_password(self, client: TestClient, weak_password_data: dict):
        """Test registration with weak password."""
        response = client.post("/api/v1/auth/register", json=weak_password_data)
        
        assert response.status_code == 422  # Validation error
    
    def test_register_invalid_email(self, client: TestClient):
        """Test registration with invalid email."""
        data = {
            "email": "invalid-email",
            "username": "testuser",
            "password": "SecurePassword123!"
        }
        response = client.post("/api/v1/auth/register", json=data)
        
        assert response.status_code == 422
    
    def test_register_short_username(self, client: TestClient):
        """Test registration with short username."""
        data = {
            "email": "test@example.com",
            "username": "ab",  # Too short
            "password": "SecurePassword123!"
        }
        response = client.post("/api/v1/auth/register", json=data)
        
        assert response.status_code == 422
    
    def test_register_duplicate_email(self, client: TestClient, test_user_data: dict):
        """Test registration with duplicate email."""
        # First registration
        client.post("/api/v1/auth/register", json=test_user_data)
        
        # Second registration with same email
        duplicate_data = test_user_data.copy()
        duplicate_data["username"] = "different_user"
        response = client.post("/api/v1/auth/register", json=duplicate_data)
        
        assert response.status_code == 409  # Conflict
    
    def test_register_duplicate_username(self, client: TestClient, test_user_data: dict):
        """Test registration with duplicate username."""
        # First registration
        client.post("/api/v1/auth/register", json=test_user_data)
        
        # Second registration with same username
        duplicate_data = test_user_data.copy()
        duplicate_data["email"] = "different@example.com"
        response = client.post("/api/v1/auth/register", json=duplicate_data)
        
        assert response.status_code == 409  # Conflict


class TestLoginEndpoint:
    """Tests for login endpoint."""
    
    def test_login_unregistered_user(self, client: TestClient):
        """Test login with unregistered user."""
        data = {
            "email": "nonexistent@example.com",
            "password": "SomePassword123!"
        }
        response = client.post("/api/v1/auth/login", json=data)
        
        assert response.status_code in [401, 404]  # Unauthorized or Not Found
    
    def test_login_wrong_password(self, client: TestClient, test_user_data: dict):
        """Test login with wrong password."""
        # Register user first
        client.post("/api/v1/auth/register", json=test_user_data)
        
        # Try to login with wrong password
        login_data = {
            "email": test_user_data["email"],
            "password": "WrongPassword123!"
        }
        response = client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 401
    
    def test_login_unverified_user(self, client: TestClient, test_user_data: dict):
        """Test login with unverified email."""
        # Register user
        client.post("/api/v1/auth/register", json=test_user_data)
        
        # Try to login without verification
        login_data = {
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
        response = client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 403  # Forbidden (email not verified)


class TestVerifyEndpoint:
    """Tests for email verification endpoint."""
    
    def test_verify_invalid_otp(self, client: TestClient, test_user_data: dict):
        """Test verification with invalid OTP."""
        # Register user
        client.post("/api/v1/auth/register", json=test_user_data)
        
        # Try to verify with wrong OTP
        verify_data = {
            "email": test_user_data["email"],
            "otp_code": "000000"
        }
        response = client.post("/api/v1/auth/verify", json=verify_data)
        
        assert response.status_code == 400
    
    def test_verify_nonexistent_user(self, client: TestClient):
        """Test verification for nonexistent user."""
        verify_data = {
            "email": "nonexistent@example.com",
            "otp_code": "123456"
        }
        response = client.post("/api/v1/auth/verify", json=verify_data)
        
        assert response.status_code == 404


class TestForgotPasswordEndpoint:
    """Tests for forgot password endpoint."""
    
    def test_forgot_password_existing_user(self, client: TestClient, test_user_data: dict):
        """Test forgot password for existing user."""
        # Register user
        client.post("/api/v1/auth/register", json=test_user_data)
        
        # Request password reset
        response = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": test_user_data["email"]}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_forgot_password_nonexistent_user(self, client: TestClient):
        """Test forgot password for nonexistent user (should still return success)."""
        response = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "nonexistent@example.com"}
        )
        
        # Should return success to prevent email enumeration
        assert response.status_code == 200


class TestResetPasswordEndpoint:
    """Tests for password reset endpoint."""
    
    def test_reset_password_invalid_otp(self, client: TestClient, test_user_data: dict):
        """Test password reset with invalid OTP."""
        # Register user
        client.post("/api/v1/auth/register", json=test_user_data)
        
        # Try to reset with wrong OTP
        reset_data = {
            "email": test_user_data["email"],
            "otp_code": "000000",
            "new_password": "NewSecurePassword123!"
        }
        response = client.post("/api/v1/auth/reset-password", json=reset_data)
        
        assert response.status_code in [400, 404]
    
    def test_reset_password_weak_new_password(self, client: TestClient, test_user_data: dict):
        """Test password reset with weak new password."""
        reset_data = {
            "email": test_user_data["email"],
            "otp_code": "123456",
            "new_password": "weak"
        }
        response = client.post("/api/v1/auth/reset-password", json=reset_data)
        
        assert response.status_code == 422  # Validation error


class TestRefreshTokenEndpoint:
    """Tests for token refresh endpoint."""
    
    def test_refresh_invalid_token(self, client: TestClient):
        """Test refresh with invalid token."""
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid.refresh.token"}
        )
        
        assert response.status_code == 401


class TestGoogleAuthEndpoint:
    """Tests for Google OAuth endpoints."""
    
    def test_google_auth_url(self, client: TestClient):
        """Test getting Google auth URL."""
        response = client.get("/api/v1/auth/google")
        
        assert response.status_code == 200
        data = response.json()
        assert "authorization_url" in data
        assert "accounts.google.com" in data["authorization_url"]
