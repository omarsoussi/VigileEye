package unit

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/vigileye/streaming-backend/internal/infrastructure/security"
		"github.com/vigileye/streaming-backend/internal/infrastructure/config"
)

func TestJWTAuthService_ValidateToken_InvalidToken(t *testing.T) {
		cfg := &config.Config{JWTSecret: "test-secret-key", JWTAlgorithm: "HS256"}
		svc := security.NewJWTAuthService(cfg)

	_, err := svc.ValidateToken("invalid-token")
	assert.Error(t, err)
}

func TestJWTAuthService_ValidateToken_EmptyToken(t *testing.T) {
		cfg := &config.Config{JWTSecret: "test-secret-key", JWTAlgorithm: "HS256"}
		svc := security.NewJWTAuthService(cfg)

	_, err := svc.ValidateToken("")
	assert.Error(t, err)
}

func TestJWTAuthService_ValidateToken_WrongSecret(t *testing.T) {
		cfg := &config.Config{JWTSecret: "correct-secret", JWTAlgorithm: "HS256"}
		svc := security.NewJWTAuthService(cfg)

	// Token signed with a different secret (generated externally)
	_, err := svc.ValidateToken("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJ0eXBlIjoiYWNjZXNzIiwiZXhwIjo5OTk5OTk5OTk5fQ.wrongsig")
	assert.Error(t, err)
}

func TestJWTAuthService_ValidateToken_ValidToken(t *testing.T) {
	secret := "my-test-secret"
		cfg := &config.Config{JWTSecret: secret, JWTAlgorithm: "HS256"}
		svc := security.NewJWTAuthService(cfg)

	// Create a valid token for testing
	token := createTestToken(t, secret, "user-123", "test@test.com", "access")

	payload, err := svc.ValidateToken(token)
	assert.NoError(t, err)
	assert.Equal(t, "user-123", payload.Sub)
	assert.Equal(t, "test@test.com", payload.Email)
}

func TestJWTAuthService_ValidateToken_NonAccessType(t *testing.T) {
	secret := "my-test-secret"
		cfg := &config.Config{JWTSecret: secret, JWTAlgorithm: "HS256"}
		svc := security.NewJWTAuthService(cfg)

	// Create a refresh token (not access)
	token := createTestToken(t, secret, "user-123", "test@test.com", "refresh")

	_, err := svc.ValidateToken(token)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Invalid token type")
}

func TestJWTAuthService_ValidateToken_ExpiredToken(t *testing.T) {
	secret := "my-test-secret"
		cfg := &config.Config{JWTSecret: secret, JWTAlgorithm: "HS256"}
		svc := security.NewJWTAuthService(cfg)

	token := createExpiredToken(t, secret, "user-123", "test@test.com")

	_, err := svc.ValidateToken(token)
	assert.Error(t, err)
}
