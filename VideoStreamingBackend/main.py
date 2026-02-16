"""Video Streaming Backend - Main Entry Point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from infrastructure.config.settings import get_settings
from infrastructure.persistence.database import init_db
from api.routes import stream_router
from api.websocket import websocket_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    # Startup
    init_db()
    print("✅ Video Streaming Service started")
    yield
    # Shutdown
    print("🛑 Video Streaming Service stopped")


settings = get_settings()

app = FastAPI(
    title="VigileEye Video Streaming Service",
    description="Real-time video streaming microservice for camera feeds",
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
app.include_router(stream_router, prefix="/api/v1/streams", tags=["streams"])
app.include_router(websocket_router, prefix="/ws", tags=["websocket"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "video-streaming"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
