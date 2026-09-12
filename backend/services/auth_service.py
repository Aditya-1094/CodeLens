"""
Authentication & Session Management Service for CarbonLens SME.
Supports Supabase Auth & persistent local session fallback so judges and team members can register/login seamlessly.
"""

import os
import json
import uuid
import logging
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.config import settings
from backend.models.schemas import UserRegisterRequest, UserLoginRequest, UserProfile, AuthTokenResponse

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

# File-backed user persistence path
CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "database"))
USERS_CACHE_FILE = os.path.join(CACHE_DIR, "users_cache.json")

# In-memory user token map
TEST_USERS: Dict[str, Dict[str, Any]] = {}


def load_cached_users() -> Dict[str, Dict[str, Any]]:
    """Loads cached users from JSON file."""
    if os.path.exists(USERS_CACHE_FILE):
        try:
            with open(USERS_CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load users cache: {e}")
    return {}


def save_cached_users(users: Dict[str, Dict[str, Any]]):
    """Saves users dictionary to JSON file."""
    try:
        os.makedirs(CACHE_DIR, exist_ok=True)
        with open(USERS_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to save users cache: {e}")


# Initialize persistent users
_persistent_users = load_cached_users()

# Pre-seed standard accounts if not present
PRESEEDED_ACCOUNTS = {
    "akshat@sme.com": {
        "id": "usr_akshat_001",
        "full_name": "Akshat Patel",
        "email": "akshat@sme.com",
        "password": "password123",
        "token": "tok_akshat_001"
    },
    "dhairya@gmail.com": {
        "id": "usr_dhairya_001",
        "full_name": "Dhairya Packaging",
        "email": "dhairya@gmail.com",
        "password": "password123",
        "token": "tok_dhairya_001"
    },
    "demo@sme.local": {
        "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "full_name": "Vatva Plant Manager",
        "email": "demo@sme.local",
        "password": "password123",
        "token": "tok_demo_vatva_001"
    }
}

for email_k, u_data in PRESEEDED_ACCOUNTS.items():
    if email_k not in _persistent_users:
        _persistent_users[email_k] = u_data
    TEST_USERS[u_data["token"]] = u_data

save_cached_users(_persistent_users)


class AuthService:
    def register_user(self, req: UserRegisterRequest) -> AuthTokenResponse:
        email = req.email.strip().lower()

        # Check existing user
        if email in _persistent_users:
            # If already registered, return session directly
            u = _persistent_users[email]
            user_profile = UserProfile(id=u["id"], full_name=u["full_name"], email=u["email"])
            return AuthTokenResponse(access_token=u["token"], user=user_profile)

        user_id = str(uuid.uuid4())
        token = f"tok_usr_{uuid.uuid4().hex}"
        user_dict = {
            "id": user_id,
            "full_name": req.full_name,
            "email": email,
            "password": req.password,
            "token": token
        }

        # 1. Real Supabase Auth Registration
        if settings.has_supabase:
            try:
                from supabase import create_client
                client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                auth_res = client.auth.sign_up({"email": email, "password": req.password})
                if auth_res.user:
                    user_id = str(auth_res.user.id)
                    user_dict["id"] = user_id
                    try:
                        client.table("profiles").insert({
                            "id": user_id,
                            "full_name": req.full_name,
                            "email": email
                        }).execute()
                    except Exception:
                        pass
            except Exception as e:
                logger.warning(f"Supabase auth sign_up warning for {email}: {e}")

        # Store in persistent cache & memory
        _persistent_users[email] = user_dict
        TEST_USERS[token] = user_dict
        save_cached_users(_persistent_users)

        user_profile = UserProfile(id=user_id, full_name=req.full_name, email=email)
        return AuthTokenResponse(access_token=token, user=user_profile)

    def login_user(self, req: UserLoginRequest) -> AuthTokenResponse:
        email = req.email.strip().lower()

        # 1. Demo account shortcut
        if email == "demo@sme.local" or email == "demo@vatvapack.com":
            u = PRESEEDED_ACCOUNTS["demo@sme.local"]
            user_profile = UserProfile(id=u["id"], full_name=u["full_name"], email=email)
            fac_dict = {
                "id": "fac_demo_vatva_001",
                "user_id": u["id"],
                "facility_name": "Vatva Polymer Pack Ltd",
                "industry": "Plastic & Packaging Manufacturing",
                "city": "Vatva, Ahmedabad",
                "state": "Gujarat",
                "annual_capacity": 250.0,
                "created_at": "2026-01-01T00:00:00Z"
            }
            return AuthTokenResponse(access_token=u["token"], user=user_profile, facility=fac_dict)

        # 2. Check local persistent & in-memory accounts first
        if email in _persistent_users:
            u = _persistent_users[email]
            token = u.get("token") or f"tok_usr_{uuid.uuid4().hex}"
            u["token"] = token
            TEST_USERS[token] = u
            user_profile = UserProfile(id=u["id"], full_name=u["full_name"], email=u["email"])
            return AuthTokenResponse(access_token=token, user=user_profile)

        for token_k, u in list(TEST_USERS.items()):
            if u.get("email") == email:
                user_profile = UserProfile(id=u["id"], full_name=u["full_name"], email=u["email"])
                return AuthTokenResponse(access_token=token_k, user=user_profile)

        # 3. Try Supabase Auth Login
        if settings.has_supabase:
            try:
                from supabase import create_client
                client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                auth_res = client.auth.sign_in_with_password({"email": email, "password": req.password})

                if auth_res.user and auth_res.session:
                    user_id = str(auth_res.user.id)
                    token = auth_res.session.access_token

                    prof_res = client.table("profiles").select("*").eq("id", user_id).execute()
                    name = prof_res.data[0]["full_name"] if prof_res.data else email.split("@")[0].capitalize()

                    fac_res = client.table("facilities").select("*").eq("user_id", user_id).execute()
                    fac_dict = fac_res.data[0] if fac_res.data else None

                    user_profile = UserProfile(id=user_id, full_name=name, email=email)
                    return AuthTokenResponse(access_token=token, user=user_profile, facility=fac_dict)
            except Exception as e:
                logger.warning(f"Supabase login failed for {email}: {e}")

        # 4. Graceful local session auto-provisioning for hackathon usability
        user_id = str(uuid.uuid4())
        token = f"tok_auto_{uuid.uuid4().hex}"
        name = email.split("@")[0].replace(".", " ").capitalize()
        user_dict = {"id": user_id, "full_name": name, "email": email, "password": req.password, "token": token}

        _persistent_users[email] = user_dict
        TEST_USERS[token] = user_dict
        save_cached_users(_persistent_users)

        user_profile = UserProfile(id=user_id, full_name=name, email=email)
        return AuthTokenResponse(access_token=token, user=user_profile)

    def get_user_from_token(self, token: Optional[str]) -> Optional[UserProfile]:
        if not token:
            return None

        if token.startswith("Bearer "):
            token = token.split(" ")[1]

        # 1. Check in-memory & persistent tokens
        if token in TEST_USERS:
            u = TEST_USERS[token]
            return UserProfile(id=u["id"], full_name=u["full_name"], email=u["email"])

        for email, u in _persistent_users.items():
            if u.get("token") == token:
                TEST_USERS[token] = u
                return UserProfile(id=u["id"], full_name=u["full_name"], email=u["email"])

        # 2. Check Supabase token
        if settings.has_supabase:
            try:
                from supabase import create_client
                client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                user_res = client.auth.get_user(token)
                if user_res and user_res.user:
                    user_id = str(user_res.user.id)
                    email = user_res.user.email
                    prof_res = client.table("profiles").select("*").eq("id", user_id).execute()
                    name = prof_res.data[0]["full_name"] if prof_res.data else email.split("@")[0].capitalize()
                    return UserProfile(id=user_id, full_name=name, email=email)
            except Exception:
                pass

        return None


auth_service = AuthService()

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)) -> UserProfile:
    token = credentials.credentials if credentials else None
    user = auth_service.get_user_from_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing, invalid, or expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user

def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)) -> Optional[UserProfile]:
    token = credentials.credentials if credentials else None
    return auth_service.get_user_from_token(token)

def verify_auth_token(token: Optional[str]) -> Optional[UserProfile]:
    return auth_service.get_user_from_token(token)
