"""
Database operations for audio features and recommendations
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta
import json

from .models import AudioFile, AudioFeatures, UserInteraction, UserPreferences, RecommendationCache
from .connection import get_db_session

class AudioFeatureService:
    """Service for managing audio features in the database"""
    
    @staticmethod
    async def save_audio_features(
        session: AsyncSession,
        audio_file_id: str,
        features: Dict[str, Any]
    ) -> AudioFeatures:
        """Save extracted audio features to database"""
        
        # Check if features already exist
        existing = await session.execute(
            select(AudioFeatures).where(AudioFeatures.audioFileId == audio_file_id)
        )
        existing_features = existing.scalar_one_or_none()
        
        if existing_features:
            # Update existing features
            existing_features.mfccFeatures = features.get("mfcc", {})
            existing_features.spectralFeatures = features.get("spectral", {})
            existing_features.rhythmFeatures = features.get("basic", {})
            existing_features.tempo = features.get("basic", {}).get("tempo")
            existing_features.energy = features.get("spectral", {}).get("centroid_mean", 0) / 8000.0
            existing_features.duration = features.get("basic", {}).get("duration")
            existing_features.embeddings = features.get("feature_vector", [])
            existing_features.extractedAt = datetime.utcnow()
            return existing_features
        else:
            # Create new features record
            audio_features = AudioFeatures(
                audioFileId=audio_file_id,
                mfccFeatures=features.get("mfcc", {}),
                spectralFeatures=features.get("spectral", {}),
                rhythmFeatures=features.get("basic", {}),
                tempo=features.get("basic", {}).get("tempo"),
                energy=features.get("spectral", {}).get("centroid_mean", 0) / 8000.0,
                duration=features.get("basic", {}).get("duration"),
                embeddings=features.get("feature_vector", []),
                analysisVersion="librosa-1.0",
                confidence=0.8
            )
            session.add(audio_features)
            return audio_features
    
    @staticmethod
    async def get_audio_features(
        session: AsyncSession,
        audio_file_id: str
    ) -> Optional[AudioFeatures]:
        """Get audio features by file ID"""
        result = await session.execute(
            select(AudioFeatures).where(AudioFeatures.audioFileId == audio_file_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_similar_audio_features(
        session: AsyncSession,
        feature_vector: List[float],
        limit: int = 10,
        exclude_file_id: Optional[str] = None
    ) -> List[AudioFeatures]:
        """Find similar audio files based on feature vectors"""
        # This is a simplified version - in production you'd use vector similarity
        query = select(AudioFeatures).where(AudioFeatures.embeddings.isnot(None))
        
        if exclude_file_id:
            query = query.where(AudioFeatures.audioFileId != exclude_file_id)
        
        result = await session.execute(query.limit(limit * 2))  # Get more for filtering
        features_list = result.scalars().all()
        
        # Calculate similarity (simplified cosine similarity)
        similarities = []
        for features in features_list:
            if features.embeddings:
                similarity = calculate_cosine_similarity(feature_vector, features.embeddings)
                similarities.append((features, similarity))
        
        # Sort by similarity and return top results
        similarities.sort(key=lambda x: x[1], reverse=True)
        return [features for features, _ in similarities[:limit]]

class UserInteractionService:
    """Service for managing user interactions"""
    
    @staticmethod
    async def record_interaction(
        session: AsyncSession,
        user_id: str,
        interaction_type: str,
        room_id: Optional[str] = None,
        audio_file_id: Optional[str] = None,
        duration: Optional[int] = None,
        metadata: Optional[Dict] = None
    ) -> UserInteraction:
        """Record a user interaction"""
        interaction = UserInteraction(
            userId=user_id,
            roomId=room_id,
            audioFileId=audio_file_id,
            actionType=interaction_type,  # Prisma uses actionType
            duration=duration,
            metadata=metadata
        )
        session.add(interaction)
        return interaction
    
    @staticmethod
    async def get_user_interactions(
        session: AsyncSession,
        user_id: str,
        interaction_types: Optional[List[str]] = None,
        limit: int = 100,
        days_back: int = 30
    ) -> List[UserInteraction]:
        """Get recent user interactions"""
        query = select(UserInteraction).where(
            UserInteraction.userId == user_id,
            UserInteraction.timestamp >= datetime.utcnow() - timedelta(days=days_back)
        )
        
        if interaction_types:
            query = query.where(UserInteraction.actionType.in_(interaction_types))
        
        query = query.order_by(UserInteraction.timestamp.desc()).limit(limit)
        result = await session.execute(query)
        return result.scalars().all()

class UserPreferencesService:
    """Service for managing user preferences"""
    
    @staticmethod
    async def get_or_create_preferences(
        session: AsyncSession,
        user_id: str
    ) -> UserPreferences:
        """Get user preferences or create default ones"""
        result = await session.execute(
            select(UserPreferences).where(UserPreferences.userId == user_id)
        )
        preferences = result.scalar_one_or_none()
        
        if not preferences:
            preferences = UserPreferences(
                userId=user_id,
                genrePreferences=[],
                tempoRange={"min": 60.0, "max": 180.0},
                energyRange={"min": 0.0, "max": 1.0},
                discoveryMode="balanced",
                confidenceScore=0.0,
                interactionCount=0,
                learningEnabled=True
            )
            session.add(preferences)
        
        return preferences
    
    @staticmethod
    async def update_preferences(
        session: AsyncSession,
        user_id: str,
        updates: Dict[str, Any]
    ) -> UserPreferences:
        """Update user preferences"""
        preferences = await UserPreferencesService.get_or_create_preferences(session, user_id)
        
        for key, value in updates.items():
            if hasattr(preferences, key):
                setattr(preferences, key, value)
        
        preferences.lastUpdated = datetime.utcnow()
        preferences.interactionCount += 1
        
        return preferences

class RecommendationCacheService:
    """Service for managing recommendation cache"""
    
    @staticmethod
    async def get_cached_recommendations(
        session: AsyncSession,
        user_id: str,
        recommendation_type: str
    ) -> Optional[RecommendationCache]:
        """Get cached recommendations if still valid"""
        result = await session.execute(
            select(RecommendationCache).where(
                RecommendationCache.userId == user_id,
                RecommendationCache.expiresAt > datetime.utcnow(),
                RecommendationCache.isValid == True
            )
        )
        cache_entry = result.scalar_one_or_none()
        
        if cache_entry:
            # Update access tracking
            cache_entry.hitCount += 1
            cache_entry.lastAccessed = datetime.utcnow()
        
        return cache_entry
    
    @staticmethod
    async def cache_recommendations(
        session: AsyncSession,
        user_id: str,
        recommendation_type: str,
        recommendations: List[Dict],
        expires_in_hours: int = 1,
        context_hash: Optional[str] = None,
        algorithm_version: Optional[str] = None
    ) -> RecommendationCache:
        """Cache recommendations for faster retrieval"""
        cache_entry = RecommendationCache(
            userId=user_id,
            recommendedRooms=recommendations,
            totalRecommendations=len(recommendations),
            algorithmVersion=algorithm_version or "v1.0",
            expiresAt=datetime.utcnow() + timedelta(hours=expires_in_hours),
            contextData={"type": recommendation_type, "hash": context_hash}
        )
        session.add(cache_entry)
        return cache_entry
    
    @staticmethod
    async def clear_expired_cache(session: AsyncSession) -> int:
        """Clear expired cache entries"""
        result = await session.execute(
            delete(RecommendationCache).where(
                RecommendationCache.expires_at <= datetime.utcnow()
            )
        )
        return result.rowcount

def calculate_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculate cosine similarity between two vectors"""
    try:
        import math
        
        if len(vec1) != len(vec2):
            return 0.0
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(a * a for a in vec2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)
    except:
        return 0.0
