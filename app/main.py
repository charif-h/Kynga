from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.routes import auth, exercises, sessions
import os

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Kynga - Sports Management API",
    description="A sports management application for tracking exercises and workout sessions",
    version="1.0.0"
)

# Configure CORS - use environment variable in production
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure media directory exists
os.makedirs(os.path.join("media", "exercises"), exist_ok=True)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(exercises.router, prefix="/api/exercises", tags=["Exercises"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])

# Mount media files
app.mount("/media", StaticFiles(directory="media"), name="media")

# Mount static files (frontend)
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

@app.get("/api")
def read_root():
    return {
        "message": "Welcome to Kynga - Sports Management API",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
