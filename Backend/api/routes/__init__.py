"""API routes module."""
from api.routes.auth_routes import router as auth_router
from api.routes.login_history_routes import router as login_history_router

__all__ = ["auth_router", "login_history_router"]
