"""
Database models matching the Prisma schema
SQLAlchemy models for the AI service
"""

from sqlalchemy import Column, String, DateTime, Boolean, Text, Integer, Float, JSON, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    """User model matching Prisma schema"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False)
    username = Column(String, unique=True, nullable=False) 
    password = Column(String, nullable=False)
    profile = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    audio_files = relationship("AudioFile", back_populates="user")
    interactions = relationship("UserInteraction", back_populates="user")
    preferences = relationship("UserPreferences", back_populates="user", uselist=False)
    recommendations = relationship("RecommendationCache", back_populates="user")

class Room(Base):
    """Room model matching Prisma schema"""
    __tablename__ = "rooms"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    creator_id = Column(String, nullable=False)
    
    # Relationships
    audio_files = relationship("AudioFile", back_populates="room")
    interactions = relationship("UserInteraction", back_populates="room")
    room_profiles = relationship("UserRoomProfile", back_populates="room")

class AudioFile(Base):
    """AudioFile model matching Prisma schema"""
    __tablename__ = "audio_files"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    duration = Column(Float, nullable=True)
    format = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Foreign keys
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    room_id = Column(String, ForeignKey("rooms.id"), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="audio_files")
    room = relationship("Room", back_populates="audio_files")
    features = relationship("AudioFeatures", back_populates="audio_file", uselist=False)
    interactions = relationship("UserInteraction", back_populates="audio_file")

class AudioFeatures(Base):
    """AudioFeatures model for ML analysis"""
    __tablename__ = "audio_features"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    audio_file_id = Column(String, ForeignKey("audio_files.id"), nullable=False, unique=True)
    
    # Basic features
    duration = Column(Float, nullable=True)
    sample_rate = Column(Integer, nullable=True)
    tempo = Column(Float, nullable=True)
    
    # Spectral features
    spectral_centroid_mean = Column(Float, nullable=True)
    spectral_centroid_std = Column(Float, nullable=True)
    spectral_rolloff_mean = Column(Float, nullable=True)
    spectral_rolloff_std = Column(Float, nullable=True)
    spectral_bandwidth_mean = Column(Float, nullable=True)
    spectral_bandwidth_std = Column(Float, nullable=True)
    zero_crossing_rate_mean = Column(Float, nullable=True)
    zero_crossing_rate_std = Column(Float, nullable=True)
    
    # MFCC features (stored as JSON arrays)
    mfcc_mean = Column(JSON, nullable=True)
    mfcc_std = Column(JSON, nullable=True)
    
    # Chroma features
    chroma_mean = Column(JSON, nullable=True)
    chroma_std = Column(JSON, nullable=True)
    
    # Spectral contrast
    spectral_contrast_mean = Column(JSON, nullable=True)
    spectral_contrast_std = Column(JSON, nullable=True)
    
    # Tonnetz features
    tonnetz_mean = Column(JSON, nullable=True)
    tonnetz_std = Column(JSON, nullable=True)
    
    # Feature vector for similarity calculations
    feature_vector = Column(JSON, nullable=True)
    
    # Metadata
    extraction_algorithm = Column(String, nullable=True)
    extraction_version = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    audio_file = relationship("AudioFile", back_populates="features")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_audio_features_audio_file_id', 'audio_file_id'),
        Index('idx_audio_features_tempo', 'tempo'),
        Index('idx_audio_features_created_at', 'created_at'),
    )

class UserInteraction(Base):
    """User interaction tracking for recommendations"""
    __tablename__ = "user_interactions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    room_id = Column(String, ForeignKey("rooms.id"), nullable=True)
    audio_file_id = Column(String, ForeignKey("audio_files.id"), nullable=True)
    
    interaction_type = Column(String, nullable=False)  # like, dislike, play, skip, share
    duration = Column(Integer, nullable=True)  # seconds
    timestamp = Column(DateTime, default=func.now())
    interaction_metadata = Column(JSON, nullable=True)  # Renamed from metadata to avoid conflict
    
    # Relationships
    user = relationship("User", back_populates="interactions")
    room = relationship("Room", back_populates="interactions")
    audio_file = relationship("AudioFile", back_populates="interactions")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_user_interactions_user_id', 'user_id'),
        Index('idx_user_interactions_timestamp', 'timestamp'),
        Index('idx_user_interactions_type', 'interaction_type'),
        Index('idx_user_interactions_user_type', 'user_id', 'interaction_type'),
    )

class UserPreferences(Base):
    """User preferences for recommendations"""
    __tablename__ = "user_preferences"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Music preferences
    preferred_genres = Column(JSON, nullable=True)  # Array of strings
    tempo_range_min = Column(Float, nullable=True)
    tempo_range_max = Column(Float, nullable=True)
    energy_level = Column(String, nullable=True)  # low, medium, high
    
    # Listening patterns
    preferred_duration_min = Column(Float, nullable=True)
    preferred_duration_max = Column(Float, nullable=True)
    time_of_day_preferences = Column(JSON, nullable=True)
    
    # Recommendation settings
    discovery_factor = Column(Float, default=0.5)  # 0=familiar, 1=diverse
    explicit_preferences = Column(JSON, nullable=True)
    
    # Learning metadata
    confidence_score = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now())
    update_count = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="preferences")
    
    # Indexes
    __table_args__ = (
        Index('idx_user_preferences_user_id', 'user_id'),
        Index('idx_user_preferences_updated', 'last_updated'),
    )

class UserRoomProfile(Base):
    """User behavior profiles per room"""
    __tablename__ = "user_room_profiles"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    room_id = Column(String, ForeignKey("rooms.id"), nullable=False)
    
    # Activity metrics
    total_time_spent = Column(Float, default=0.0)  # minutes
    session_count = Column(Integer, default=0)
    contribution_score = Column(Float, default=0.0)
    
    # Preference adaptation
    adapted_preferences = Column(JSON, nullable=True)
    interaction_patterns = Column(JSON, nullable=True)
    
    # Timestamps
    first_interaction = Column(DateTime, default=func.now())
    last_interaction = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    room = relationship("Room", back_populates="room_profiles")
    
    # Ensure unique user-room combinations
    __table_args__ = (
        Index('idx_user_room_profiles_user_room', 'user_id', 'room_id', unique=True),
        Index('idx_user_room_profiles_last_interaction', 'last_interaction'),
    )

class RecommendationCache(Base):
    """Cache for recommendation results"""
    __tablename__ = "recommendation_cache"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Recommendation data
    recommendation_type = Column(String, nullable=False)  # rooms, similar_rooms, etc.
    recommendations = Column(JSON, nullable=False)  # Array of recommendation objects
    context_hash = Column(String, nullable=True)  # Hash of context used
    
    # Metadata
    algorithm_version = Column(String, nullable=True)
    confidence_scores = Column(JSON, nullable=True)
    reasoning = Column(JSON, nullable=True)
    
    # Cache management
    created_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime, nullable=False)
    access_count = Column(Integer, default=0)
    last_accessed = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="recommendations")
    
    # Indexes
    __table_args__ = (
        Index('idx_recommendation_cache_user_id', 'user_id'),
        Index('idx_recommendation_cache_type', 'recommendation_type'),
        Index('idx_recommendation_cache_expires', 'expires_at'),
        Index('idx_recommendation_cache_user_type', 'user_id', 'recommendation_type'),
    )
