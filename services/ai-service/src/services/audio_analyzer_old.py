"""
Audio Analysis Service
Handles audio feature extraction and similarity calculations
"""

try:
    import librosa
    import numpy as np
    AUDIO_PROCESSING_AVAILABLE = True
except ImportError:
    librosa = None
    np = None
    AUDIO_PROCESSING_AVAILABLE = False
    print("Warning: Audio processing libraries not available. Install librosa and numpy for full functionality.")

import json
import io
import asyncio
from typing import Dict, List, Tuple, Optional, Union, Any
from concurrent.futures import ThreadPoolExecutor

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
        if not AUDIO_PROCESSING_AVAILABLE or not librosa or not np:
        """
        Synchronous feature extraction (runs in thread pool)
        """
        if not AUDIO_PROCESSING_AVAILABLE:
            return {
                "error": "Audio processing libraries not available",
                "filename": filename,
                "basic": {
                    "duration": 0.0,
                    "sample_rate": 44100,
                    "tempo": 120.0,
                    "beats_count": 0
                },
                "feature_vector": [0.0] * 25  # Placeholder vector
            }
            
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
                    "zcr_std": float(np.std(zero_crossing_rate))
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
            
            # Create feature vector for similarity calculations
            feature_vector = self._create_feature_vector(features)
            features["feature_vector"] = feature_vector.tolist()
            
            return features
            
        except Exception as e:
            raise Exception(f"Feature extraction failed for {filename}: {str(e)}")
    
    def _create_feature_vector(self, features: Dict) -> np.ndarray:
        """
        Create a normalized feature vector for similarity calculations
        """
        vector_components = []
        
        # Basic features
        vector_components.extend([
            features["basic"]["tempo"] / 200.0,  # Normalize tempo
            features["basic"]["duration"] / 300.0  # Normalize duration (5 minutes max)
        ])
        
        # Spectral features
        spectral = features["spectral"]
        vector_components.extend([
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
        
        return np.array(vector_components)
    
    async def calculate_similarities(self, features_list) -> List[List[float]]:
        """
        Calculate similarity matrix between audio files using their stored features
        """
        if not AUDIO_PROCESSING_AVAILABLE:
            # Return placeholder similarity matrix
            n = len(features_list)
            return [[1.0 if i == j else 0.5 for j in range(n)] for i in range(n)]
        
        try:
            # Extract feature vectors from database models
            vectors = []
            for features_model in features_list:
                if features_model.feature_vector:
                    vectors.append(np.array(features_model.feature_vector))
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
    
    def _construct_vector_from_features(self, features_model) -> np.ndarray:
        """
        Construct a feature vector from individual stored features
        """
        vector_components = []
        
        # Basic features (normalized)
        vector_components.extend([
            features_model.tempo / 200.0 if features_model.tempo else 0.6,  # Normalize tempo
            features_model.duration / 300.0 if features_model.duration else 0.5,  # Normalize duration
        ])
        
        # Spectral features (normalized)
        if features_model.spectral_centroid_mean:
            vector_components.append(features_model.spectral_centroid_mean / 8000.0)
        else:
            vector_components.append(0.5)
            
        if features_model.spectral_rolloff_mean:
            vector_components.append(features_model.spectral_rolloff_mean / 8000.0)
        else:
            vector_components.append(0.5)
            
        if features_model.spectral_bandwidth_mean:
            vector_components.append(features_model.spectral_bandwidth_mean / 4000.0)
        else:
            vector_components.append(0.5)
        
        # MFCC features (use stored or default)
        if features_model.mfcc_features and isinstance(features_model.mfcc_features, list):
            mfcc_means = features_model.mfcc_features[:13]  # Take first 13 MFCC coefficients
            # Pad with zeros if less than 13
            while len(mfcc_means) < 13:
                mfcc_means.append(0.0)
            vector_components.extend(mfcc_means)
        else:
            vector_components.extend([0.0] * 13)
        
        # Chroma features (use stored or default)
        if features_model.chroma_features and isinstance(features_model.chroma_features, list):
            chroma_means = features_model.chroma_features[:12]  # 12 chroma bins
            while len(chroma_means) < 12:
                chroma_means.append(0.0)
            vector_components.extend(chroma_means)
        else:
            vector_components.extend([0.0] * 12)
        
        return np.array(vector_components)

    async def calculate_similarity(self, audio_ids: List[str]) -> List[List[float]]:
        """
        Calculate similarity matrix between audio files
        """
        # TODO: Implement database lookup and similarity calculation
        # For now, return placeholder
        n = len(audio_ids)
        similarity_matrix = [[1.0 if i == j else 0.5 for j in range(n)] for i in range(n)]
        return similarity_matrix
    
    def cosine_similarity(self, vector1: np.ndarray, vector2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two feature vectors
        """
        dot_product = np.dot(vector1, vector2)
        norm1 = np.linalg.norm(vector1)
        norm2 = np.linalg.norm(vector2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
            
        return float(dot_product / (norm1 * norm2))
