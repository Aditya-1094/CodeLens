"""
Main FastAPI Application Entry Point for CarbonLens SME.
Run with: python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.routes.auth_routes import router as auth_router
from backend.routes.facilities_routes import router as facilities_router
from backend.routes.assessments import router as assessments_router
from backend.routes.simulations import router as simulations_router
from backend.routes.partners import router as partners_router
from backend.routes.calculations import router as calculations_router

app = FastAPI(
    title="CarbonLens SME API",
    description="Industrial Emission Leak-Point Detector & Circular Alternative Recommender API for HackOut'26",
    version="1.0.0"
)

# Enable CORS for local frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router)
app.include_router(facilities_router)
app.include_router(assessments_router)
app.include_router(simulations_router)
app.include_router(partners_router)
app.include_router(calculations_router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CarbonLens SME Business Engine",
        "sector": "Plastic & Packaging Manufacturing"
    }

# Resolve static frontend directory with multiple fallback paths
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
possible_frontend_dirs = [
    os.path.join(project_root, "frontend"),
    os.path.join(os.getcwd(), "frontend"),
    os.path.abspath("frontend")
]

frontend_dir = None
for p in possible_frontend_dirs:
    if os.path.exists(p) and os.path.isdir(p):
        frontend_dir = p
        break

if frontend_dir:
    @app.get("/")
    def serve_root_index():
        index_path = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"detail": "index.html not found"}

    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
