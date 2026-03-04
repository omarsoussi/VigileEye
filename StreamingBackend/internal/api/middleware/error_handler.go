package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	"github.com/vigileye/streaming-backend/internal/application/dto"
	domainerrors "github.com/vigileye/streaming-backend/internal/domain/errors"
)

// ErrorHandler is a Gin middleware that converts domain errors to HTTP responses.
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) == 0 {
			return
		}

		err := c.Errors.Last().Err
		handleError(c, err)
	}
}

func handleError(c *gin.Context, err error) {
	switch e := err.(type) {
	case *domainerrors.CameraNotFoundError:
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: e.Message, ErrorCode: e.Code},
		})
	case *domainerrors.StreamAlreadyActiveError:
		c.JSON(http.StatusConflict, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: e.Message, ErrorCode: e.Code},
		})
	case *domainerrors.StreamNotFoundError:
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: e.Message, ErrorCode: e.Code},
		})
	case *domainerrors.UnauthorizedError:
		c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: e.Message, ErrorCode: e.Code},
		})
	case *domainerrors.ForbiddenError:
		c.JSON(http.StatusForbidden, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: e.Message, ErrorCode: e.Code},
		})
	case *domainerrors.ValidationError:
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: e.Message, ErrorCode: e.Code},
		})
	case *domainerrors.IngestFailedError:
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: e.Message, ErrorCode: e.Code},
		})
	default:
		log.Error().Err(err).Msg("Unhandled error")
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Detail: dto.ErrorDetail{Message: "Internal server error", ErrorCode: "INTERNAL_ERROR"},
		})
	}
}
