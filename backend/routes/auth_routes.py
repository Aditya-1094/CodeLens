"""
FastAPI Routes for User Registration, Login & Session Management.
"""

from fastapi import APIRouter, Depends, HTTPException
from backend.models.schemas import UserRegisterRequest, UserLoginRequest, UserProfile, AuthTokenResponse
from backend.services.auth_service import auth_service, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=AuthTokenResponse)
def register(req: UserRegisterRequest):
    """Registers new user account and returns session token."""
    return auth_service.register_user(req)

@router.post("/login", response_model=AuthTokenResponse)
def login(req: UserLoginRequest):
    """Authenticates user and returns session token with facility info."""
    return auth_service.login_user(req)

@router.get("/me", response_model=UserProfile)
def get_me(current_user: UserProfile = Depends(get_current_user)):
    """Returns profile for currently authenticated user."""
    return current_user
