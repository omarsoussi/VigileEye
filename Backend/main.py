"""
Camera Monitoring System - Backend API
FastAPI application entry point.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.routes import auth_router, login_history_router
from infrastructure.config.settings import get_settings
from infrastructure.persistence.database import init_db, Base, engine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger(__name__)

# Get settings
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Runs startup and shutdown logic.
    """
    # Startup
    logger.info("Starting Camera Monitoring System API...")
    
    # Initialize database tables
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully!")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Camera Monitoring System API...")


# Create FastAPI application
app = FastAPI(
    title="Camera Monitoring System API",
    description="""
    ## Camera Monitoring System Backend API
    
    This API provides authentication and user management for the Camera Monitoring System.
    
    ### Features:
    - **User Registration** with email verification
    - **Two-Factor Authentication (2FA)** via email OTP
    - **JWT Token Authentication** with refresh tokens
    - **Google OAuth** integration
    - **Password Reset** functionality
    - **Account Lockout** after failed login attempts
    
    ### Security:
    - Passwords hashed with bcrypt
    - JWT tokens for session management
    - Rate limiting on login attempts
    - Email verification required
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        settings.frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": {
                "message": "An internal server error occurred",
                "error_code": "INTERNAL_ERROR"
            }
        }
    )


# Include routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(login_history_router, prefix="/api/v1")


# Health check endpoint
@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "camera-monitoring-api"}


# Root endpoint
@app.get("/", tags=["Root"])
def root():
    """Root endpoint with API information."""
    return {
        "name": "Camera Monitoring System API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    )
