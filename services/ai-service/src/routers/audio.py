"""
Audio Analysis Router
Endpoints for audio feature extraction and analysis
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
import json
import uuid

from services.audio_analyzer import AudioAnalyzer
from models.audio_models import AudioFeaturesResponse, AudioAnalysisRequest
from database.connection import get_db_session
from database.operations import AudioFeatureService

router = APIRouter()

def get_audio_analyzer():
    """Dependency to get audio analyzer instance"""
    # This will be injected from app.state in main.py
    from main import app
    return app.state.audio_analyzer

@router.post("/analyze", response_model=AudioFeaturesResponse)
async def analyze_audio(
    file: UploadFile = File(...),
    audio_file_id: Optional[str] = None,
    analyzer: AudioAnalyzer = Depends(get_audio_analyzer),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Analyze an audio file and extract features, optionally saving to database
    """
    # Check if file is an audio file by content type or extension
    is_audio_content_type = file.content_type and file.content_type.startswith('audio/')
    is_audio_extension = file.filename and any(
        file.filename.lower().endswith(ext) 
        for ext in ['.wav', '.mp3', '.m4a', '.flac', '.aac', '.ogg']
    )
    
    if not (is_audio_content_type or is_audio_extension):
        raise HTTPException(
            status_code=400, 
            detail=f"File must be an audio file. Got content_type: {file.content_type}, filename: {file.filename}"
        )
    
    try:
        # Read file content
        audio_content = await file.read()
        
        # Analyze audio
        features = await analyzer.extract_features(audio_content, file.filename)
        
        # If audio_file_id is provided, save features to database
        if audio_file_id:
            try:
                await AudioFeatureService.save_audio_features(
                    db, audio_file_id, features
                )
                await db.commit()
            except Exception as db_error:
                await db.rollback()
                # Log the error but don't fail the analysis
                print(f"Failed to save features to database: {db_error}")
        
        return AudioFeaturesResponse(
            filename=file.filename,
            features=features,
            status="success"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio analysis failed: {str(e)}")

@router.post("/batch-analyze")
async def batch_analyze_audio(
    files: List[UploadFile] = File(...),
    analyzer: AudioAnalyzer = Depends(get_audio_analyzer)
):
    """
    Analyze multiple audio files in batch
    """
    results = []
    
    for file in files:
        if not file.content_type.startswith('audio/'):
            results.append({
                "filename": file.filename,
                "status": "error",
                "error": "File must be an audio file"
            })
            continue
            
        try:
            audio_content = await file.read()
            features = await analyzer.extract_features(audio_content, file.filename)
            
            results.append({
                "filename": file.filename,
                "features": features,
                "status": "success"
            })
            
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "error", 
                "error": str(e)
            })
    
    return {"results": results}

@router.get("/features/{audio_file_id}")
async def get_audio_features(
    audio_file_id: str,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Retrieve stored audio features by file ID
    """
    try:
        features = await AudioFeatureService.get_audio_features(db, audio_file_id)
        
        if not features:
            raise HTTPException(status_code=404, detail="Audio features not found")
        
        # Convert SQLAlchemy model to dict
        features_dict = {
            "audio_file_id": features.audio_file_id,
            "basic": {
                "duration": features.duration,
                "sample_rate": features.sample_rate,
                "tempo": features.tempo,
                "beats_count": features.beats_count
            },
            "spectral": {
                "centroid_mean": features.spectral_centroid_mean,
                "centroid_std": features.spectral_centroid_std,
                "rolloff_mean": features.spectral_rolloff_mean,
                "rolloff_std": features.spectral_rolloff_std,
                "bandwidth_mean": features.spectral_bandwidth_mean,
                "bandwidth_std": features.spectral_bandwidth_std,
                "contrast_mean": features.spectral_contrast_mean,
                "contrast_std": features.spectral_contrast_std
            },
            "mfcc": features.mfcc_features,
            "chroma": features.chroma_features,
            "tonnetz": features.tonnetz_features,
            "feature_vector": features.feature_vector,
            "metadata": {
                "created_at": features.created_at.isoformat() if features.created_at else None,
                "updated_at": features.updated_at.isoformat() if features.updated_at else None
            }
        }
        
        return AudioFeaturesResponse(
            filename=f"audio_{audio_file_id}",
            features=features_dict,
            status="success"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve features: {str(e)}")

@router.post("/similarity")
async def calculate_similarity(
    audio_ids: List[str],
    analyzer: AudioAnalyzer = Depends(get_audio_analyzer),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Calculate similarity between audio files using stored features
    """
    try:
        if len(audio_ids) < 2:
            raise HTTPException(status_code=400, detail="At least 2 audio IDs required for similarity calculation")
        
        # Get features for all audio files
        features_list = []
        for audio_id in audio_ids:
            features = await AudioFeatureService.get_audio_features(db, audio_id)
            if not features:
                raise HTTPException(status_code=404, detail=f"Features not found for audio ID: {audio_id}")
            features_list.append(features)
        
        # Calculate similarities using the analyzer
        similarities = await analyzer.calculate_similarities(features_list)
        
        return {
            "audio_ids": audio_ids,
            "similarities": similarities,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Similarity calculation failed: {str(e)}")

@router.post("/analyze-and-save")
async def analyze_and_save_audio(
    audio_file_id: str,
    file: UploadFile = File(...),
    analyzer: AudioAnalyzer = Depends(get_audio_analyzer),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Analyze an audio file and save features to database
    """
    # Check if file is an audio file by content type or extension
    is_audio_content_type = file.content_type and file.content_type.startswith('audio/')
    is_audio_extension = file.filename and any(
        file.filename.lower().endswith(ext) 
        for ext in ['.wav', '.mp3', '.m4a', '.flac', '.aac', '.ogg']
    )
    
    if not (is_audio_content_type or is_audio_extension):
        raise HTTPException(
            status_code=400, 
            detail=f"File must be an audio file. Got content_type: {file.content_type}, filename: {file.filename}"
        )
    
    try:
        # Read file content
        audio_content = await file.read()
        
        # Analyze audio
        features = await analyzer.extract_features(audio_content, file.filename)
        
        # Save features to database
        saved_features = await AudioFeatureService.save_audio_features(
            db, audio_file_id, features
        )
        await db.commit()
        
        return {
            "audio_file_id": audio_file_id,
            "filename": file.filename,
            "features": features,
            "status": "success",
            "message": "Audio analyzed and features saved to database"
        }
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Audio analysis and save failed: {str(e)}")
