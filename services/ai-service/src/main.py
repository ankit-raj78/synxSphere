"""
SyncSphere AI Service
Main FastAPI application for audio analysis and recommendations
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables explicitly
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

from routers import audio, recommendations, health
from services import AudioAnalyzer, RecommendationEngine
from utils.logger import setup_logger
from database.connection import init_db

# Setup logging
logger = setup_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting SyncSphere AI Service...")
    
    # Initialize database
    try:
        await init_db()
        logger.info("Database connection initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        # Continue without database for now
    
    # Initialize audio analyzer
    app.state.audio_analyzer = AudioAnalyzer()
    
    # Initialize recommendation engine
    app.state.recommendation_engine = RecommendationEngine()
    
    logger.info("AI Service started successfully!")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Service...")
    # Close database connections if needed
    try:
        from database.connection import close_db
        await close_db()
        logger.info("Database connections closed")
    except Exception as e:
        logger.warning(f"Error closing database: {e}")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="SyncSphere AI Service",
    description="AI-powered audio analysis and room recommendations",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(audio.router, prefix="/audio", tags=["audio"])
app.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "SyncSphere AI Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "audio_analysis": "/audio",
            "recommendations": "/recommendations",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8004)),
        reload=True
    )
