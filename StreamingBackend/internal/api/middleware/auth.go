package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/vigileye/streaming-backend/internal/application/dto"
	"github.com/vigileye/streaming-backend/internal/domain/services"
)

const (
	// ContextKeyUser is the gin context key for the authenticated user.
	ContextKeyUser = "user"
	// ContextKeyToken is the gin context key for the raw JWT token.
	ContextKeyToken = "token"
)

// AuthMiddleware creates a Gin middleware that validates JWT tokens.
func AuthMiddleware(authService services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Allow browser CORS preflight requests to pass without auth.
		// CORS headers are set by the global CORS middleware.
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, dto.ErrorResponse{
				Detail: dto.ErrorDetail{
					Message:   "Missing authorization header",
					ErrorCode: "UNAUTHORIZED",
				},
			})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, dto.ErrorResponse{
				Detail: dto.ErrorDetail{
					Message:   "Invalid authorization header format",
					ErrorCode: "UNAUTHORIZED",
				},
			})
			return
		}

		token := parts[1]
		payload, err := authService.ValidateToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, dto.ErrorResponse{
				Detail: dto.ErrorDetail{
					Message:   err.Error(),
					ErrorCode: "UNAUTHORIZED",
				},
			})
			return
		}

		c.Set(ContextKeyUser, payload)
		c.Set(ContextKeyToken, token)
		c.Next()
	}
}

// GetUser extracts the authenticated user from the gin context.
func GetUser(c *gin.Context) *services.AuthPayload {
	user, exists := c.Get(ContextKeyUser)
	if !exists {
		return nil
	}
	payload, ok := user.(*services.AuthPayload)
	if !ok {
		return nil
	}
	return payload
}

// GetToken extracts the raw JWT token from the gin context.
func GetToken(c *gin.Context) string {
	token, _ := c.Get(ContextKeyToken)
	t, _ := token.(string)
	return t
}
