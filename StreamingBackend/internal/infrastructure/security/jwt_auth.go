package security

import (
	"fmt"

	"github.com/golang-jwt/jwt/v5"
	"github.com/vigileye/streaming-backend/internal/domain/errors"
	"github.com/vigileye/streaming-backend/internal/domain/services"
	"github.com/vigileye/streaming-backend/internal/infrastructure/config"
)

// JWTAuthService validates tokens issued by the Auth service.
type JWTAuthService struct {
	secret    []byte
	algorithm jwt.SigningMethod
}

// NewJWTAuthService creates a new JWT auth service.
func NewJWTAuthService(cfg *config.Config) *JWTAuthService {
	return &JWTAuthService{
		secret:    []byte(cfg.JWTSecret),
		algorithm: jwt.GetSigningMethod(cfg.JWTAlgorithm),
	}
}

// ValidateToken parses and validates a JWT token, returning the payload.
func (s *JWTAuthService) ValidateToken(tokenStr string) (*services.AuthPayload, error) {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if token.Method.Alg() != s.algorithm.Alg() {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.secret, nil
	})
	if err != nil {
		return nil, errors.NewUnauthorizedError(fmt.Sprintf("Invalid token: %v", err))
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, errors.NewUnauthorizedError("Invalid token claims")
	}

	tokenType, _ := claims["type"].(string)
	if tokenType != "access" {
		return nil, errors.NewUnauthorizedError("Invalid token type")
	}

	sub, _ := claims["sub"].(string)
	email, _ := claims["email"].(string)
	if sub == "" || email == "" {
		return nil, errors.NewUnauthorizedError("Incomplete token payload")
	}

	return &services.AuthPayload{
		Sub:   sub,
		Email: email,
		Type:  "access",
	}, nil
}
