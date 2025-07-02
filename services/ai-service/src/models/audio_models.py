"""
Audio Analysis Pydantic Models
Data models for audio analysis requests and responses
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime

class AudioAnalysisRequest(BaseModel):
    """Request model for audio analysis"""
    file_id: str = Field(..., description="Unique identifier for the audio file")
    filename: str = Field(..., description="Original filename")
    extract_detailed: bool = Field(default=True, description="Extract detailed features")

class AudioFeaturesResponse(BaseModel):
    """Response model for audio feature extraction"""
    filename: str
    features: Dict
    status: str
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class AudioSimilarityRequest(BaseModel):
    """Request model for similarity calculation"""
    audio_ids: List[str] = Field(..., min_items=2, description="List of audio file IDs")
    similarity_threshold: float = Field(default=0.5, ge=0.0, le=1.0)

class AudioSimilarityResponse(BaseModel):
    """Response model for similarity calculation"""
    similarity_matrix: List[List[float]]
    audio_ids: List[str]
    threshold: float
