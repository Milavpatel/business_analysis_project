from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.models.schemas import UserRegister, UserLogin, Token
from backend.services.auth_service import (
    register_user, authenticate_user,
    create_access_token, decode_token
)

auth_router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


# ─── Register ─────────────────────────────────────────────────────────────────
@auth_router.post("/register", response_model=Token)
def register(body: UserRegister):
    try:
        user = register_user(body.name, body.email, body.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    token = create_access_token({"sub": user["email"]})
    return {"access_token": token, "token_type": "bearer", "user": user}


# ─── Login ────────────────────────────────────────────────────────────────────
@auth_router.post("/login", response_model=Token)
def login(body: UserLogin):
    try:
        user = authenticate_user(body.email, body.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    
    token = create_access_token({"sub": user["email"]})
    return {"access_token": token, "token_type": "bearer", "user": user}


# ─── Verify / Me ──────────────────────────────────────────────────────────────
@auth_router.get("/me")
def get_me(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    
    email = decode_token(credentials.credentials)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    
    return {"email": email, "authenticated": True}


# ─── Logout (client-side) ─────────────────────────────────────────────────────
@auth_router.post("/logout")
def logout():
    # JWT is stateless — logout is handled by the client dropping the token.
    return {"message": "Logged out successfully."}
