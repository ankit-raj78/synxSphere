"""
Database models matching the Prisma schema exactly
SQLAlchemy models for the AI service
"""

from sqlalchemy import Column, String, DateTime, Boolean, Text, Integer, Float, JSON, BigInteger, Index
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    """User model matching Prisma schema"""
    __tablename__ = "User"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False)
    username = Column(String, unique=True, nullable=False) 
    password = Column(String, nullable=False)
    profile = Column(JSON, nullable=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())

class Room(Base):
    """Room model matching Prisma schema"""
    __tablename__ = "Room"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    isPublic = Column(Boolean, default=False)
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())
    creatorId = Column(String, nullable=False)

class AudioFile(Base):
    """AudioFile model matching Prisma schema exactly"""
    __tablename__ = "AudioFile"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    originalName = Column(String, nullable=False)
    filePath = Column(String, nullable=False)
    fileSize = Column(BigInteger, nullable=False)
    mimeType = Column(String, nullable=False)
    isProcessed = Column(Boolean, default=False)
    isPublic = Column(Boolean, default=False)
    file_metadata = Column("metadata", JSON, nullable=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())
    userId = Column(String, nullable=False)
    roomId = Column(String, nullable=True)
    duration = Column(Integer, nullable=True)
    bitrate = Column(Integer, nullable=True)
    sampleRate = Column(Integer, nullable=True)
    channels = Column(Integer, nullable=True)
    format = Column(String, nullable=True)
    quality = Column(String, nullable=True)
    encoding = Column(String, nullable=True)
    tags = Column(JSON, nullable=True)
    isAnalyzed = Column(Boolean, default=False)
    analysisStatus = Column(String, default="pending")
    lastAnalyzed = Column(DateTime, nullable=True)
    playCount = Column(Integer, default=0)
    likeCount = Column(Integer, default=0)
    downloadCount = Column(Integer, default=0)
    shareCount = Column(Integer, default=0)

class AudioFeatures(Base):
    """AudioFeatures model matching Prisma schema exactly"""
    __tablename__ = "audio_features"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    audioFileId = Column(String, unique=True, nullable=False)
    mfccFeatures = Column(JSON, nullable=True)
    spectralFeatures = Column(JSON, nullable=True)
    rhythmFeatures = Column(JSON, nullable=True)
    harmonicFeatures = Column(JSON, nullable=True)
    tempo = Column(Float, nullable=True)
    key = Column(String, nullable=True)
    energy = Column(Float, nullable=True)
    valence = Column(Float, nullable=True)
    danceability = Column(Float, nullable=True)
    loudness = Column(Float, nullable=True)
    duration = Column(Integer, nullable=True)
    embeddings = Column(JSON, nullable=True)
    analysisVersion = Column(String, nullable=True)
    processingTime = Column(Integer, nullable=True)
    extractedAt = Column(DateTime, default=func.now())
    confidence = Column(Float, default=0.0)

class UserInteraction(Base):
    """UserInteraction model matching Prisma schema exactly"""
    __tablename__ = "user_interactions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    userId = Column(String, nullable=False)
    roomId = Column(String, nullable=True)
    audioFileId = Column(String, nullable=True)
    actionType = Column(String, nullable=False)  # Prisma uses actionType, not interaction_type
    timestamp = Column(DateTime, default=func.now())
    duration = Column(Integer, nullable=True)
    rating = Column(Integer, nullable=True)
    sessionId = Column(String, nullable=True)
    deviceType = Column(String, nullable=True)
    timeOfDay = Column(String, nullable=True)
    location = Column(String, nullable=True)
    interaction_metadata = Column("metadata", JSON, nullable=True)

class UserPreferences(Base):
    """UserPreferences model matching Prisma schema exactly"""
    __tablename__ = "user_preferences"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    userId = Column(String, unique=True, nullable=False)
    genrePreferences = Column(JSON, nullable=True)
    explicitGenres = Column(JSON, nullable=True)
    tempoRange = Column(JSON, nullable=True)
    energyRange = Column(JSON, nullable=True)
    valenceRange = Column(JSON, nullable=True)
    loudnessRange = Column(JSON, nullable=True)
    danceabilityRange = Column(JSON, nullable=True)
    preferredRoomSizes = Column(JSON, nullable=True)
    activityTimes = Column(JSON, nullable=True)
    sessionLengthPreference = Column(Integer, nullable=True)
    preferredRoomTypes = Column(JSON, nullable=True)
    discoveryMode = Column(String, default="balanced")
    confidenceScore = Column(Float, default=0.0)
    lastUpdated = Column(DateTime, default=func.now(), onupdate=func.now())
    interactionCount = Column(Integer, default=0)
    learningEnabled = Column(Boolean, default=True)

class RecommendationCache(Base):
    """RecommendationCache model matching Prisma schema exactly"""
    __tablename__ = "recommendation_cache"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    userId = Column(String, nullable=False)
    recommendedRooms = Column(JSON, nullable=False)
    reasoning = Column(JSON, nullable=True)
    totalRecommendations = Column(Integer, default=0)
    algorithmVersion = Column(String, nullable=False)
    contentScore = Column(Float, nullable=True)
    collaborativeScore = Column(Float, nullable=True)
    sessionScore = Column(Float, nullable=True)
    hybridWeights = Column(JSON, nullable=True)
    contextData = Column(JSON, nullable=True)
    queryParameters = Column(JSON, nullable=True)
    createdAt = Column(DateTime, default=func.now())
    expiresAt = Column(DateTime, nullable=False)
    hitCount = Column(Integer, default=0)
    lastAccessed = Column(DateTime, default=func.now())
    isValid = Column(Boolean, default=True)
    generationTimeMs = Column(Integer, nullable=True)
    cacheEfficiency = Column(Float, nullable=True)

class RoomAnalytics(Base):
    """RoomAnalytics model matching Prisma schema"""
    __tablename__ = "room_analytics"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    roomId = Column(String, unique=True, nullable=False)
    dominantGenres = Column(JSON, nullable=True)
    averageTempo = Column(Float, nullable=True)
    averageEnergy = Column(Float, nullable=True)
    averageValence = Column(Float, nullable=True)
    averageDanceability = Column(Float, nullable=True)
    averageLoudness = Column(Float, nullable=True)
    audioDiversityScore = Column(Float, nullable=True)
    totalAudioDuration = Column(Integer, nullable=True)
    totalSessions = Column(Integer, default=0)
    uniqueParticipants = Column(Integer, default=0)
    activeParticipants = Column(Integer, default=0)
    averageSessionTime = Column(Float, nullable=True)
    peakActivityTimes = Column(JSON, nullable=True)
    lastActivityAt = Column(DateTime, nullable=True)
    likesRatio = Column(Float, nullable=True)
    retentionRate = Column(Float, nullable=True)
    diversityIndex = Column(Float, nullable=True)
    interactionRate = Column(Float, nullable=True)
    popularityScore = Column(Float, default=0.0)
    trendingScore = Column(Float, default=0.0)
    growthRate = Column(Float, default=0.0)
    uploadsPerDay = Column(Float, default=0.0)
    averageUploadQuality = Column(Float, nullable=True)
    contentFreshness = Column(Float, nullable=True)
    lastCalculated = Column(DateTime, default=func.now())
    calculationVersion = Column(String, default="1.0")

class MLModel(Base):
    """MLModel model matching Prisma schema"""
    __tablename__ = "ml_models"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    version = Column(String, nullable=False)
    type = Column(String, nullable=False)
    framework = Column(String, nullable=False)
    architecture = Column(String, nullable=True)
    parameters = Column(JSON, nullable=True)
    inputShape = Column(JSON, nullable=True)
    outputShape = Column(JSON, nullable=True)
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1Score = Column(Float, nullable=True)
    performance = Column(JSON, nullable=True)
    isActive = Column(Boolean, default=False)
    isProduction = Column(Boolean, default=False)
    modelPath = Column(String, nullable=True)
    apiEndpoint = Column(String, nullable=True)
    deploymentConfig = Column(JSON, nullable=True)
    trainedOn = Column(DateTime, nullable=True)
    trainingDataSize = Column(Integer, nullable=True)
    trainingDuration = Column(Integer, nullable=True)
    validationMetrics = Column(JSON, nullable=True)
    trainingConfig = Column(JSON, nullable=True)
    datasetVersion = Column(String, nullable=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())
    deprecatedAt = Column(DateTime, nullable=True)
