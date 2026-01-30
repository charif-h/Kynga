from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(exercises.router, prefix="/api/exercises", tags=["Exercises"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])

@app.get("/")
def read_root():
    return {
        "message": "Welcome to Kynga - Sports Management API",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
