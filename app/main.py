from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from app.database import engine, Base
from app.routes import auth, exercises, sessions, programs
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

# Include ALL routers FIRST - before static files
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(exercises.router, prefix="/api/exercises", tags=["Exercises"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(programs.router, prefix="/api/programs", tags=["Programs"])

@app.get("/api")
def read_api():
    return {"message": "API is working", "version": "1.0.0"}

@app.get("/api/test")
def test_api():
    return {"message": "Test endpoint working"}

# Mount media files
app.mount("/media", StaticFiles(directory="media"), name="media")

# Serve frontend files and index.html
@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    if full_path.startswith("api") or full_path.startswith("media"):
        raise HTTPException(status_code=404, detail="Not Found")

    frontend_path = os.path.join("frontend", full_path)
    if full_path and os.path.isfile(frontend_path):
        return FileResponse(frontend_path)

    return FileResponse(os.path.join("frontend", "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
