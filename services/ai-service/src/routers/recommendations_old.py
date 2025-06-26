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
        # Check cache first
        cached_recommendations = await RecommendationCacheService.get_cached_recommendations(
            db, user_id, "room_recommendations"
        )
        
        if cached_recommendations:
            # Return cached results if available and not expired
            return cached_recommendations.recommendations[:limit]
        
        # Get user preferences and interactions
        user_preferences = await UserPreferencesService.get_or_create_preferences(db, user_id)
        recent_interactions = await UserInteractionService.get_user_interactions(
            db, user_id, limit=50, days_back=30
        )
        
        # Generate recommendations using the engine
        recommendations = await engine.get_room_recommendations(
            user_id=user_id,
            limit=limit,
            user_preferences=user_preferences,
            recent_interactions=recent_interactions
        )
        
        # Cache the recommendations
        await RecommendationCacheService.cache_recommendations(
            db, user_id, "room_recommendations", recommendations
        )
        await db.commit()
        
        return recommendations
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")
@router.post("/user-interactions")
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

@router.get("/user-preferences/{user_id}")
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
            "user_id": preferences.user_id,
            "preferred_genres": preferences.preferred_genres,
            "tempo_range": [preferences.tempo_range_min, preferences.tempo_range_max],
            "energy_level": preferences.energy_level,
            "discovery_factor": preferences.discovery_factor,
            "last_updated": preferences.last_updated.isoformat() if preferences.last_updated else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get preferences: {str(e)}")

@router.put("/user-preferences/{user_id}")
async def update_user_preferences(
    user_id: str,
    updates: Dict[str, Any],
    db: AsyncSession = Depends(get_db_session)
):
    """
    Update user preferences for recommendations
    """
    try:
        preferences = await UserPreferencesService.update_preferences(db, user_id, updates)
        await db.commit()
        
        return {
            "status": "success",
            "user_id": preferences.user_id,
            "updated_preferences": {
                "preferred_genres": preferences.preferred_genres,
                "tempo_range": [preferences.tempo_range_min, preferences.tempo_range_max],
                "energy_level": preferences.energy_level,
                "discovery_factor": preferences.discovery_factor
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
            interaction_type = getattr(interaction, 'interaction_type', 'unknown')
            interaction_counts[interaction_type] = interaction_counts.get(interaction_type, 0) + 1
            
            # Count room visits
            room_id = getattr(interaction, 'room_id', None)
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
                "preferred_genres": preferences.preferred_genres,
                "energy_level": preferences.energy_level,
                "discovery_factor": preferences.discovery_factor
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get analytics: {str(e)}")

# Continue with existing endpoints...

@router.post("/similar-rooms/{room_id}")
async def get_similar_rooms(
    room_id: str,
    limit: int = Query(5, ge=1, le=20),
    engine: RecommendationEngine = Depends(get_recommendation_engine)
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
        raise HTTPException(status_code=500, detail=f"Similar room search failed: {str(e)}")

@router.post("/user-preferences/{user_id}")
async def update_user_preferences(
    user_id: str,
    preferences: dict,
    engine: RecommendationEngine = Depends(get_recommendation_engine)
):
    """
    Update user preferences for recommendations
    """
    try:
        await engine.update_user_preferences(user_id, preferences)
        return {"status": "success", "message": "Preferences updated"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preference update failed: {str(e)}")

@router.get("/user-preferences/{user_id}")
async def get_user_preferences(
    user_id: str,
    engine: RecommendationEngine = Depends(get_recommendation_engine)
):
    """
    Get current user preferences
    """
    try:
        preferences = await engine.get_user_preferences(user_id)
        return preferences
        
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"User preferences not found: {str(e)}")

@router.post("/feedback")
async def record_user_feedback(
    user_id: str,
    room_id: str,
    feedback_type: str,  # "like", "dislike", "join", "skip"
    engine: RecommendationEngine = Depends(get_recommendation_engine)
):
    """
    Record user feedback to improve recommendations
    """
    try:
        await engine.record_user_interaction(
            user_id=user_id,
            room_id=room_id,
            interaction_type=feedback_type,
            timestamp=datetime.utcnow()
        )
        
        return {"status": "success", "message": "Feedback recorded"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feedback recording failed: {str(e)}")

@router.get("/stats/{user_id}")
async def get_recommendation_stats(
    user_id: str,
    engine: RecommendationEngine = Depends(get_recommendation_engine)
):
    """
    Get recommendation statistics for a user
    """
    try:
        stats = await engine.get_user_stats(user_id)
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats retrieval failed: {str(e)}")
