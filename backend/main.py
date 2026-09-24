import sys
import os

# Add parent directory to path so absolute imports from backend work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.auth_router import auth_router
from backend.api.upload_router import upload_router

app = FastAPI(
    title="AI Business Growth Dashboard API",
    description="Backend API for the Advanced Business Growth AI Dashboard.",
    version="1.0.0"
)

# Configure CORS for React frontend (Vite default port 5173, fallback ports, and localhost regex)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175",
        "http://localhost:3000", "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(upload_router, prefix="/api")

@app.get("/")
def health_check():
    return {"status": "ok", "message": "API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
