"""
Recommendation Router
Endpoints for room recommendations and user preferences
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from datetime import datetime

from services.recommendation_engine import RecommendationEngine
from models.recommendation_models import RecommendationRequest, RecommendationResponse
from database.connection import get_db_session
from database.operations import UserInteractionService, UserPreferencesService, RecommendationCacheService

router = APIRouter()

def get_recommendation_engine():
    """Dependency to get recommendation engine instance"""
    from main import app
    return app.state.recommendation_engine

@router.post("/rooms", response_model=List[RecommendationResponse])
async def get_room_recommendations(
    user_id: str,
    limit: int = Query(10, ge=1, le=50),
    engine: RecommendationEngine = Depends(get_recommendation_engine),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Get personalized room recommendations for a user
    """
    try:
        # For now, skip database operations and generate recommendations directly
        # TODO: Integrate with database when schema is aligned
        
        # Generate recommendations using the engine
        recommendations = await engine.get_room_recommendations(
            user_id=user_id,
            limit=limit,
            user_preferences=None,  # Will be loaded from DB later
            recent_interactions=None  # Will be loaded from DB later
        )
        
        return recommendations
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")

@router.post("/similar-rooms/{room_id}")
async def get_similar_rooms(
    room_id: str,
    limit: int = Query(5, ge=1, le=20),
    engine: RecommendationEngine = Depends(get_recommendation_engine),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Get rooms similar to a given room
    """
    try:
        similar_rooms = await engine.get_similar_rooms(
            room_id=room_id,
            limit=limit
        )
        
        return similar_rooms
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Similar rooms lookup failed: {str(e)}")

@router.post("/interactions")
async def record_user_interaction(
    user_id: str,
    interaction_type: str,
    room_id: Optional[str] = None,
    audio_file_id: Optional[str] = None,
    duration: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Record a user interaction for improving recommendations
    """
    try:
        interaction = await UserInteractionService.record_interaction(
            db, user_id, interaction_type, room_id, audio_file_id, duration, metadata
        )
        await db.commit()
        
        return {
            "status": "success",
            "interaction_id": interaction.id if hasattr(interaction, 'id') else None,
            "message": "Interaction recorded successfully"
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record interaction: {str(e)}")

@router.get("/preferences/{user_id}")
async def get_user_preferences(
    user_id: str,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Get user preferences for recommendations
    """
    try:
        preferences = await UserPreferencesService.get_or_create_preferences(db, user_id)
        
        return {
            "user_id": preferences.userId,
            "genre_preferences": preferences.genrePreferences,
            "tempo_range": preferences.tempoRange,
            "energy_range": preferences.energyRange,
            "discovery_mode": preferences.discoveryMode,
            "confidence_score": preferences.confidenceScore,
            "last_updated": preferences.lastUpdated.isoformat() if preferences.lastUpdated else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get preferences: {str(e)}")

@router.put("/preferences/{user_id}")
async def update_user_preferences(
    user_id: str,
    updates: Dict[str, Any],
    db: AsyncSession = Depends(get_db_session)
):
    """
    Update user preferences for recommendations
    """
    try:
        # Validate required fields
        if not user_id or len(user_id.strip()) == 0:
            raise HTTPException(status_code=422, detail="Invalid user_id")
        
        # Validate updates structure
        if not updates or not isinstance(updates, dict):
            raise HTTPException(status_code=422, detail="Updates must be a non-empty dictionary")
            
        # Validate preference keys
        valid_keys = [
            "preferred_genres", "preferred_tempo_range", "activity_level",
            "genre_preferences", "tempo_range", "energy_range", 
            "discovery_mode", "confidence_score"
        ]
        
        for key in updates.keys():
            if key not in valid_keys:
                raise HTTPException(status_code=422, detail=f"Invalid preference key: {key}")
        
        # Validate specific field types if present
        if "tempo_range" in updates:
            tempo_range = updates["tempo_range"]
            if not isinstance(tempo_range, (list, tuple)) or len(tempo_range) != 2:
                raise HTTPException(status_code=422, detail="tempo_range must be a list/tuple of 2 numbers")
            if not all(isinstance(x, (int, float)) for x in tempo_range):
                raise HTTPException(status_code=422, detail="tempo_range values must be numbers")
        
        preferences = await UserPreferencesService.update_preferences(db, user_id, updates)
        await db.commit()
        
        return {
            "status": "success",
            "user_id": preferences.userId,
            "updated_preferences": {
                "genre_preferences": preferences.genrePreferences,
                "tempo_range": preferences.tempoRange,
                "energy_range": preferences.energyRange,
                "discovery_mode": preferences.discoveryMode,
                "confidence_score": preferences.confidenceScore
            },
            "message": "Preferences updated successfully"
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update preferences: {str(e)}")

@router.get("/analytics/user/{user_id}")
async def get_user_analytics(
    user_id: str,
    days_back: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Get analytics about user behavior for recommendations
    """
    try:
        # Get user interactions
        interactions = await UserInteractionService.get_user_interactions(
            db, user_id, limit=1000, days_back=days_back
        )
        
        # Get user preferences
        preferences = await UserPreferencesService.get_or_create_preferences(db, user_id)
        
        # Basic analytics
        interaction_counts = {}
        room_counts = {}
        total_duration = 0
        
        for interaction in interactions:
            # Count interaction types
            interaction_type = getattr(interaction, 'actionType', 'unknown')
            interaction_counts[interaction_type] = interaction_counts.get(interaction_type, 0) + 1
            
            # Count room visits
            room_id = getattr(interaction, 'roomId', None)
            if room_id:
                room_counts[room_id] = room_counts.get(room_id, 0) + 1
            
            # Sum duration
            duration = getattr(interaction, 'duration', 0)
            if duration:
                total_duration += duration
        
        return {
            "user_id": user_id,
            "period_days": days_back,
            "total_interactions": len(interactions),
            "interaction_breakdown": interaction_counts,
            "top_rooms": dict(sorted(room_counts.items(), key=lambda x: x[1], reverse=True)[:10]),
            "total_listening_time": total_duration,
            "avg_session_length": total_duration / max(len(interactions), 1),
            "preferences": {
                "genre_preferences": preferences.genrePreferences,
                "discovery_mode": preferences.discoveryMode,
                "confidence_score": preferences.confidenceScore
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get analytics: {str(e)}")

@router.post("/feedback")
async def record_user_feedback(
    user_id: str,
    room_id: Optional[str] = None,
    audio_file_id: Optional[str] = None,
    feedback_type: str = "like",  # like, dislike, skip, save
    rating: Optional[float] = None,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Record user feedback for improving recommendations
    """
    try:
        metadata = {
            "feedback_type": feedback_type,
            "rating": rating,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        interaction = await UserInteractionService.record_interaction(
            db, user_id, "feedback", room_id, audio_file_id, 
            duration=None, metadata=metadata
        )
        await db.commit()
        
        return {
            "status": "success",
            "message": f"Feedback '{feedback_type}' recorded successfully"
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record feedback: {str(e)}")

@router.get("/stats/{user_id}")
async def get_recommendation_stats(
    user_id: str,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Get recommendation statistics for a user
    """
    try:
        # Get cached recommendations count
        # This would need to be implemented in RecommendationCacheService
        
        # Get recent interactions count
        recent_interactions = await UserInteractionService.get_user_interactions(
            db, user_id, limit=100, days_back=7
        )
        
        preferences = await UserPreferencesService.get_or_create_preferences(db, user_id)
        
        return {
            "user_id": user_id,
            "total_interactions_week": len(recent_interactions),
            "recommendation_accuracy": 0.85,  # Placeholder - would calculate from feedback
            "discovery_rate": preferences.discovery_factor,
            "last_activity": recent_interactions[0].timestamp.isoformat() if recent_interactions else None,
            "preferences_completeness": _calculate_preferences_completeness(preferences)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

def _calculate_preferences_completeness(preferences) -> float:
    """Calculate how complete user preferences are (0.0 to 1.0)"""
    completeness = 0.0
    total_fields = 5
    
    if preferences.preferred_genres:
        completeness += 0.3
    if preferences.tempo_range_min and preferences.tempo_range_max:
        completeness += 0.2
    if preferences.energy_level:
        completeness += 0.2
    if preferences.discovery_factor is not None:
        completeness += 0.15
    if getattr(preferences, 'last_updated', None):
        completeness += 0.15
    
    return min(completeness, 1.0)
