# Models package
from .audio_models import AudioAnalysisRequest, AudioFeaturesResponse, AudioSimilarityRequest, AudioSimilarityResponse
from .recommendation_models import RecommendationRequest, RecommendationResponse, UserPreferencesUpdate, UserInteractionRecord

__all__ = [
    "AudioAnalysisRequest", 
    "AudioFeaturesResponse",
    "AudioSimilarityRequest", 
    "AudioSimilarityResponse",
    "RecommendationRequest", 
    "RecommendationResponse",
    "UserPreferencesUpdate", 
    "UserInteractionRecord"
]
