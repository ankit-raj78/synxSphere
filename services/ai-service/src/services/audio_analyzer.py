"""
Audio Analysis Service - Version 2
Handles audio feature extraction and similarity calculations with proper typing
"""

from typing import Dict, List, Tuple, Optional, Union, Any
import json
import io
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Try to import audio processing libraries
AUDIO_LIBS_AVAILABLE = False
try:
    import librosa
    import numpy as np
    AUDIO_LIBS_AVAILABLE = True
except ImportError:
    print("Warning: Audio processing libraries not available. Install librosa and numpy for full functionality.")

class AudioAnalyzer:
    """
    Service for analyzing audio files and extracting features
    """
    
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=4)
        
    async def extract_features(self, audio_content: bytes, filename: str) -> Dict[str, Any]:
        """
        Extract comprehensive audio features from audio content
        """
        loop = asyncio.get_event_loop()
        
        # Run CPU-intensive audio processing in thread pool
        features = await loop.run_in_executor(
            self.executor, 
            self._extract_features_sync, 
            audio_content, 
            filename
        )
        
        return features
    
    def _extract_features_sync(self, audio_content: bytes, filename: str) -> Dict[str, Any]:
        """
        Synchronous feature extraction (runs in thread pool)
        """
        if not AUDIO_LIBS_AVAILABLE:
            return self._get_mock_features(filename)
            
        try:
            # Load audio from bytes
            audio_buffer = io.BytesIO(audio_content)
            y, sr = librosa.load(audio_buffer, sr=None)
            
            # Basic audio properties
            duration = librosa.get_duration(y=y, sr=sr)
            
            # Spectral features
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
            spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]
            zero_crossing_rate = librosa.feature.zero_crossing_rate(y)[0]
            
            # MFCC features (13 coefficients)
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            
            # Chroma features
            chroma = librosa.feature.chroma_stft(y=y, sr=sr)
            
            # Tempo and beat tracking
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
            
            # Spectral contrast
            contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
            
            # Tonnetz (harmonic network features)
            tonnetz = librosa.feature.tonnetz(y=librosa.effects.harmonic(y), sr=sr)
            
            # Aggregate statistics for each feature
            features = {
                "basic": {
                    "duration": float(duration),
                    "sample_rate": int(sr),
                    "tempo": float(tempo),
                    "beats_count": len(beats)
                },
                "spectral": {
                    "centroid_mean": float(np.mean(spectral_centroids)),
                    "centroid_std": float(np.std(spectral_centroids)),
                    "rolloff_mean": float(np.mean(spectral_rolloff)),
                    "rolloff_std": float(np.std(spectral_rolloff)),
                    "bandwidth_mean": float(np.mean(spectral_bandwidth)),
                    "bandwidth_std": float(np.std(spectral_bandwidth)),
                    "zcr_mean": float(np.mean(zero_crossing_rate)),
                    "zcr_std": float(np.std(zero_crossing_rate)),
                    "contrast_mean": float(np.mean(contrast)),
                    "contrast_std": float(np.std(contrast))
                },
                "mfcc": {
                    "mean": [float(x) for x in np.mean(mfccs, axis=1)],
                    "std": [float(x) for x in np.std(mfccs, axis=1)]
                },
                "chroma": {
                    "mean": [float(x) for x in np.mean(chroma, axis=1)],
                    "std": [float(x) for x in np.std(chroma, axis=1)]
                },
                "contrast": {
                    "mean": [float(x) for x in np.mean(contrast, axis=1)],
                    "std": [float(x) for x in np.std(contrast, axis=1)]
                },
                "tonnetz": {
                    "mean": [float(x) for x in np.mean(tonnetz, axis=1)],
                    "std": [float(x) for x in np.std(tonnetz, axis=1)]
                }
            }
            
            # Create a comprehensive feature vector for similarity calculations
            features["feature_vector"] = self._create_feature_vector(features)
            
            return features
            
        except Exception as e:
            print(f"Error extracting features from {filename}: {e}")
            return self._get_mock_features(filename)
    
    def _get_mock_features(self, filename: str) -> Dict[str, Any]:
        """Return mock features when audio processing is not available"""
        return {
            "error": "Audio processing libraries not available",
            "filename": filename,
            "basic": {
                "duration": 180.0,
                "sample_rate": 44100,
                "tempo": 120.0,
                "beats_count": 240
            },
            "spectral": {
                "centroid_mean": 2000.0,
                "centroid_std": 500.0,
                "rolloff_mean": 4000.0,
                "rolloff_std": 800.0,
                "bandwidth_mean": 1500.0,
                "bandwidth_std": 300.0,
                "zcr_mean": 0.1,
                "zcr_std": 0.05,
                "contrast_mean": 20.0,
                "contrast_std": 5.0
            },
            "mfcc": {
                "mean": [0.0] * 13,
                "std": [1.0] * 13
            },
            "chroma": {
                "mean": [0.0] * 12,
                "std": [1.0] * 12
            },
            "contrast": {
                "mean": [0.0] * 7,
                "std": [1.0] * 7
            },
            "tonnetz": {
                "mean": [0.0] * 6,
                "std": [1.0] * 6
            },
            "feature_vector": [0.5] * 45  # Mock vector with normalized values
        }
    
    def _create_feature_vector(self, features: Dict[str, Any]) -> List[float]:
        """
        Create a normalized feature vector for similarity calculations
        """
        if not AUDIO_LIBS_AVAILABLE:
            return [0.5] * 45  # Return mock vector
            
        vector_components = []
        
        # Basic features (normalized)
        basic = features["basic"]
        spectral = features["spectral"]
        
        vector_components.extend([
            basic["tempo"] / 200.0,  # Normalize tempo to [0,1] range
            basic["duration"] / 300.0,  # Normalize duration 
            spectral["centroid_mean"] / 8000.0,
            spectral["rolloff_mean"] / 8000.0,
            spectral["bandwidth_mean"] / 4000.0,
            spectral["zcr_mean"]
        ])
        
        # MFCC means (normalized)
        mfcc_means = np.array(features["mfcc"]["mean"])
        mfcc_normalized = (mfcc_means - np.mean(mfcc_means)) / (np.std(mfcc_means) + 1e-8)
        vector_components.extend(mfcc_normalized.tolist())
        
        # Chroma means
        vector_components.extend(features["chroma"]["mean"])
        
        # Contrast means
        vector_components.extend(features["contrast"]["mean"])
        
        return vector_components
    
    async def calculate_similarities(self, features_list: List[Any]) -> List[List[float]]:
        """
        Calculate similarity matrix between audio files using their stored features
        """
        try:
            # Extract feature vectors from database models
            vectors = []
            for features_model in features_list:
                if hasattr(features_model, 'feature_vector') and features_model.feature_vector:
                    if AUDIO_LIBS_AVAILABLE:
                        vectors.append(np.array(features_model.feature_vector))
                    else:
                        vectors.append(features_model.feature_vector)
                else:
                    # Construct feature vector from individual features if feature_vector is empty
                    vector = self._construct_vector_from_features(features_model)
                    vectors.append(vector)
            
            # Calculate similarity matrix
            n = len(vectors)
            similarity_matrix = []
            
            for i in range(n):
                row = []
                for j in range(n):
                    if i == j:
                        similarity = 1.0
                    else:
                        similarity = self.cosine_similarity(vectors[i], vectors[j])
                    row.append(float(similarity))
                similarity_matrix.append(row)
            
            return similarity_matrix
            
        except Exception as e:
            print(f"Error calculating similarities: {e}")
            # Return placeholder similarity matrix on error
            n = len(features_list)
            return [[1.0 if i == j else 0.3 for j in range(n)] for i in range(n)]
    
    def _construct_vector_from_features(self, features_model: Any) -> Union[List[float], Any]:
        """
        Construct a feature vector from individual stored features
        """
        vector_components = []
        
        # Basic features (normalized)
        tempo = getattr(features_model, 'tempo', 120.0) or 120.0
        duration = getattr(features_model, 'duration', 180.0) or 180.0
        vector_components.extend([
            tempo / 200.0,  # Normalize tempo
            duration / 300.0,  # Normalize duration
        ])
        
        # Spectral features (use energy or default)
        energy = getattr(features_model, 'energy', 0.5) or 0.5
        loudness = getattr(features_model, 'loudness', 0.0) or 0.0
        vector_components.extend([
            energy,  # Already normalized
            (loudness + 60) / 60.0,  # Normalize loudness from -60db to 0db
        ])
        
        # High-level features
        valence = getattr(features_model, 'valence', 0.5) or 0.5
        danceability = getattr(features_model, 'danceability', 0.5) or 0.5
        vector_components.extend([
            valence,
            danceability
        ])
        
        # MFCC features (use stored or default)
        mfcc_features = getattr(features_model, 'mfccFeatures', {})
        if mfcc_features and isinstance(mfcc_features, dict):
            # Extract mean MFCC values if available
            mfcc_means = mfcc_features.get('mean', [])
            if isinstance(mfcc_means, list) and len(mfcc_means) > 0:
                # Take first 10 MFCC coefficients and pad/truncate as needed
                mfcc_subset = mfcc_means[:10]
                while len(mfcc_subset) < 10:
                    mfcc_subset.append(0.0)
                vector_components.extend(mfcc_subset)
            else:
                vector_components.extend([0.0] * 10)
        else:
            vector_components.extend([0.0] * 10)
        
        # Spectral features from stored JSON
        spectral_features = getattr(features_model, 'spectralFeatures', {})
        if spectral_features and isinstance(spectral_features, dict):
            centroid_mean = spectral_features.get('centroid_mean', 2000.0)
            rolloff_mean = spectral_features.get('rolloff_mean', 4000.0)
            bandwidth_mean = spectral_features.get('bandwidth_mean', 1500.0)
            vector_components.extend([
                centroid_mean / 8000.0,
                rolloff_mean / 8000.0,
                bandwidth_mean / 4000.0
            ])
        else:
            vector_components.extend([0.25, 0.5, 0.375])  # Default normalized values
        
        if AUDIO_LIBS_AVAILABLE:
            return np.array(vector_components)
        else:
            return vector_components

    def cosine_similarity(self, vector1: Union[List[float], Any], vector2: Union[List[float], Any]) -> float:
        """
        Calculate cosine similarity between two feature vectors
        """
        if AUDIO_LIBS_AVAILABLE:
            # Use numpy for efficient calculation
            if not isinstance(vector1, np.ndarray):
                vector1 = np.array(vector1)
            if not isinstance(vector2, np.ndarray):
                vector2 = np.array(vector2)
                
            dot_product = np.dot(vector1, vector2)
            norm1 = np.linalg.norm(vector1)
            norm2 = np.linalg.norm(vector2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
                
            return float(dot_product / (norm1 * norm2))
        else:
            # Fallback implementation without numpy
            if len(vector1) != len(vector2):
                return 0.0
            
            dot_product = sum(a * b for a, b in zip(vector1, vector2))
            norm1 = sum(a * a for a in vector1) ** 0.5
            norm2 = sum(b * b for b in vector2) ** 0.5
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
                
            return dot_product / (norm1 * norm2)

    async def calculate_similarity(self, audio_ids: List[str]) -> List[List[float]]:
        """
        Calculate similarity matrix between audio files (legacy method)
        """
        # TODO: Implement database lookup and similarity calculation
        # For now, return placeholder
        n = len(audio_ids)
        similarity_matrix = [[1.0 if i == j else 0.5 for j in range(n)] for i in range(n)]
        return similarity_matrix
