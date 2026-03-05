package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	domainerrors "github.com/vigileye/storage-backend/internal/domain/errors"
	"github.com/vigileye/storage-backend/internal/application/dto"
)

// ErrorHandler is a middleware that converts domain errors to HTTP responses.
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) == 0 {
			return
		}

		err := c.Errors.Last().Err

		switch err.(type) {
		case *domainerrors.NotFoundError, *domainerrors.RecordingNotFoundError, *domainerrors.CameraNotFoundError:
			c.JSON(http.StatusNotFound, dto.ErrorResponse{
				Detail: dto.ErrorDetail{Message: err.Error(), ErrorCode: "NOT_FOUND"},
			})
		case *domainerrors.UnauthorizedError:
			c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
				Detail: dto.ErrorDetail{Message: err.Error(), ErrorCode: "UNAUTHORIZED"},
			})
		case *domainerrors.ForbiddenError:
			c.JSON(http.StatusForbidden, dto.ErrorResponse{
				Detail: dto.ErrorDetail{Message: err.Error(), ErrorCode: "FORBIDDEN"},
			})
		case *domainerrors.StorageQuotaExceededError:
			c.JSON(http.StatusPaymentRequired, dto.ErrorResponse{
				Detail: dto.ErrorDetail{Message: err.Error(), ErrorCode: "QUOTA_EXCEEDED"},
			})
		case *domainerrors.SubscriptionRequiredError:
			c.JSON(http.StatusPaymentRequired, dto.ErrorResponse{
				Detail: dto.ErrorDetail{Message: err.Error(), ErrorCode: "SUBSCRIPTION_REQUIRED"},
			})
		case *domainerrors.RecordingActiveError:
			c.JSON(http.StatusConflict, dto.ErrorResponse{
				Detail: dto.ErrorDetail{Message: err.Error(), ErrorCode: "RECORDING_ACTIVE"},
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Detail: dto.ErrorDetail{Message: "Internal server error", ErrorCode: "INTERNAL_ERROR"},
			})
		}
	}
}
