"""
Recommendation Pydantic Models
Data models for recommendation requests and responses
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime

class RecommendationRequest(BaseModel):
    """Request model for room recommendations"""
    user_id: str = Field(..., description="User ID requesting recommendations")
    limit: int = Field(default=10, ge=1, le=50, description="Number of recommendations")
    context: Optional[Dict] = Field(default=None, description="Additional context")

class RecommendationResponse(BaseModel):
    """Response model for a single recommendation"""
    room_id: str
    room_name: str
    score: float = Field(ge=0.0, le=1.0)
    reasoning: str
    participants: int
    genres: List[str]
    metadata: Optional[Dict] = None

class UserPreferencesUpdate(BaseModel):
    """Model for updating user preferences"""
    genres: Optional[List[str]] = None
    tempo_range: Optional[List[int]] = Field(default=None, min_items=2, max_items=2)
    energy_level: Optional[str] = Field(default=None, pattern="^(low|medium|high)$")
    additional_preferences: Optional[Dict] = None

class UserInteractionRecord(BaseModel):
    """Model for recording user interactions"""
    user_id: str
    room_id: str
    interaction_type: str = Field(..., pattern="^(like|dislike|join|skip|share)$")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    duration: Optional[int] = Field(default=None, description="Duration in seconds")
    metadata: Optional[Dict] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
