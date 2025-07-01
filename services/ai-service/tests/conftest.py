"""
Test configuration and fixtures for AI Service
"""

import pytest
import asyncio
import os
from pathlib import Path
from unittest.mock import AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import text

# Import the app
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from main import app
from database.connection import get_db_session
from database.models import Base

# Test database URL (use in-memory SQLite for tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    """Create test database engine"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
        echo=False
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    await engine.dispose()

@pytest.fixture
async def test_db_session(test_engine):
    """Create test database session"""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with async_session() as session:
        # Clean up all tables at the start of each test
        await session.execute(text("DELETE FROM audio_features"))
        await session.execute(text("DELETE FROM user_interactions"))
        await session.execute(text("DELETE FROM user_preferences"))
        await session.execute(text("DELETE FROM recommendation_cache"))
        await session.execute(text("DELETE FROM room_analytics"))
        await session.execute(text("DELETE FROM ml_models"))
        await session.commit()
        
        yield session
        
        # Clean up after test
        await session.rollback()

@pytest.fixture
def test_client(test_db_session):
    """Create test client with database override"""
    def override_get_db():
        return test_db_session
    
    app.dependency_overrides[get_db_session] = override_get_db
    
    with TestClient(app) as client:
        yield client
    
    app.dependency_overrides.clear()

@pytest.fixture
def sample_audio_data():
    """Provide sample audio data for testing"""
    # Create WAV data that meets minimum size requirement (>1KB)
    wav_header = b"RIFF\x00\x10\x00\x00WAVE"
    wav_data = wav_header + b"\x00" * 4096  # 4KB of audio data
    
    # Create MP3 data that meets minimum size requirement (>1KB)
    mp3_header = b"ID3\x03\x00\x00\x00"
    mp3_data = mp3_header + b"\x00" * 4096  # 4KB of audio data
    
    return {
        "wav_content": wav_data,
        "mp3_content": mp3_data,
        "filename": "test_audio.wav"
    }

@pytest.fixture
def sample_features():
    """Provide sample audio features for testing"""
    return {
        "basic": {
            "duration": 30.5,
            "sample_rate": 44100,
            "tempo": 120.0,
            "beats_count": 60
        },
        "spectral": {
            "centroid_mean": 2500.0,
            "centroid_std": 500.0,
            "rolloff_mean": 8000.0,
            "rolloff_std": 1000.0,
            "bandwidth_mean": 2000.0,
            "bandwidth_std": 300.0,
            "contrast_mean": 0.7,
            "contrast_std": 0.1
        },
        "mfcc": [1.0, 0.5, -0.3] * 13,  # 13 MFCC coefficients
        "chroma": [0.8, 0.6, 0.4] * 12, # 12 chroma features
        "tonnetz": [0.2, 0.1, -0.1, 0.3, -0.2, 0.4],
        "feature_vector": [0.1] * 128  # 128-dimensional feature vector
    }

@pytest.fixture
def mock_audio_analyzer():
    """Mock audio analyzer for testing"""
    analyzer = AsyncMock()
    analyzer.extract_features.return_value = {
        "basic": {"duration": 30.0, "sample_rate": 44100, "tempo": 120.0, "beats_count": 60},
        "spectral": {"centroid_mean": 2500.0, "centroid_std": 500.0},
        "mfcc": [1.0] * 13,
        "chroma": [0.8] * 12,
        "tonnetz": [0.2] * 6,
        "feature_vector": [0.1] * 128
    }
    return analyzer

@pytest.fixture
def mock_recommendation_engine():
    """Mock recommendation engine for testing"""
    engine = AsyncMock()
    engine.get_room_recommendations.return_value = [
        {
            "room_id": "test_room_1",
            "room_name": "Test Room 1",
            "score": 0.95,
            "reasoning": "Test recommendation",
            "participants": 5,
            "genres": ["electronic", "ambient"],
            "metadata": None
        }
    ]
    return engine
