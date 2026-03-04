package unit

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
)

// createTestToken creates a valid JWT token for testing.
func createTestToken(t *testing.T, secret, sub, email, tokenType string) string {
	t.Helper()
	claims := jwt.MapClaims{
		"sub":   sub,
		"email": email,
		"type":  tokenType,
		"exp":   time.Now().Add(1 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte(secret))
	require.NoError(t, err)
	return tokenStr
}

// createExpiredToken creates an expired JWT token for testing.
func createExpiredToken(t *testing.T, secret, sub, email string) string {
	t.Helper()
	claims := jwt.MapClaims{
		"sub":   sub,
		"email": email,
		"type":  "access",
		"exp":   time.Now().Add(-1 * time.Hour).Unix(),
		"iat":   time.Now().Add(-2 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte(secret))
	require.NoError(t, err)
	return tokenStr
}
