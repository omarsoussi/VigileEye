"""Camera Management Backend - Main Entry Point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.camera_routes import router as camera_router
from api.routes.zone_routes import router as zone_router
from infrastructure.config.settings import settings
from infrastructure.persistence.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    # Initialize database on startup
    init_db()
    print(f"🎥 Camera Management Backend running on port {settings.port}")
    yield
    # Cleanup on shutdown
    print("Shutting down Camera Management Backend...")


app = FastAPI(
    title="Camera Management API",
    description="Microservice for managing cameras with Clean Architecture",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(camera_router)
app.include_router(zone_router)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "camera-management"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)

