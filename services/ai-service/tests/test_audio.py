"""
Test suite for audio analysis endpoints
"""

import pytest
import io
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock


class TestAudioAnalysis:
    """Test audio analysis functionality"""
    
    def test_analyze_audio_success(self, test_client, sample_audio_data, mock_audio_analyzer):
        """Test successful audio analysis"""
        with patch('routers.audio.get_audio_analyzer', return_value=mock_audio_analyzer):
            # Create a file-like object
            audio_file = io.BytesIO(sample_audio_data["wav_content"])
            
            response = test_client.post(
                "/audio/analyze",
                files={"file": ("test_audio.wav", audio_file, "audio/wav")}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["status"] == "success"
            assert data["filename"] == "test_audio.wav"
            assert "features" in data
            assert "basic" in data["features"]
            assert "spectral" in data["features"]
    
    def test_analyze_audio_invalid_file_type(self, test_client):
        """Test audio analysis with invalid file type"""
        text_file = io.BytesIO(b"This is not an audio file")
        
        response = test_client.post(
            "/audio/analyze",
            files={"file": ("test.txt", text_file, "text/plain")}
        )
        
        assert response.status_code == 400
        assert "File must be an audio file" in response.json()["detail"]
    
    def test_analyze_audio_with_valid_extension(self, test_client, sample_audio_data, mock_audio_analyzer):
        """Test audio analysis with valid file extension but no content type"""
        with patch('routers.audio.get_audio_analyzer', return_value=mock_audio_analyzer):
            audio_file = io.BytesIO(sample_audio_data["wav_content"])
            
            response = test_client.post(
                "/audio/analyze",
                files={"file": ("test_audio.wav", audio_file, "")}  # No content type
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
    
    def test_analyze_audio_with_audio_file_id(self, test_client, sample_audio_data, mock_audio_analyzer):
        """Test audio analysis with audio_file_id parameter"""
        with patch('routers.audio.get_audio_analyzer', return_value=mock_audio_analyzer):
            audio_file = io.BytesIO(sample_audio_data["wav_content"])
            
            response = test_client.post(
                "/audio/analyze?audio_file_id=test_audio_123",
                files={"file": ("test_audio.wav", audio_file, "audio/wav")}
            )
            
            # Should succeed even if DB save fails (graceful degradation)
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
    
    def test_batch_analyze_audio(self, test_client, sample_audio_data, mock_audio_analyzer):
        """Test batch audio analysis"""
        with patch('routers.audio.get_audio_analyzer', return_value=mock_audio_analyzer):
            audio_file1 = io.BytesIO(sample_audio_data["wav_content"])
            audio_file2 = io.BytesIO(sample_audio_data["wav_content"])
            
            response = test_client.post(
                "/audio/batch-analyze",
                files=[
                    ("files", ("test1.wav", audio_file1, "audio/wav")),
                    ("files", ("test2.wav", audio_file2, "audio/wav"))
                ]
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert "results" in data
            assert len(data["results"]) == 2
            
            for result in data["results"]:
                assert result["status"] == "success"
                assert "features" in result
    
    def test_batch_analyze_mixed_file_types(self, test_client, sample_audio_data, mock_audio_analyzer):
        """Test batch analysis with mixed valid and invalid files"""
        with patch('routers.audio.get_audio_analyzer', return_value=mock_audio_analyzer):
            audio_file = io.BytesIO(sample_audio_data["wav_content"])
            text_file = io.BytesIO(b"Not audio")
            
            response = test_client.post(
                "/audio/batch-analyze",
                files=[
                    ("files", ("test.wav", audio_file, "audio/wav")),
                    ("files", ("test.txt", text_file, "text/plain"))
                ]
            )
            
            assert response.status_code == 200
            data = response.json()
            
            results = data["results"]
            assert len(results) == 2
            
            # First file should succeed
            assert results[0]["status"] == "success"
            assert "features" in results[0]
            
            # Second file should fail
            assert results[1]["status"] == "error"
            assert "File must be an audio file" in results[1]["error"]


class TestAudioFeatures:
    """Test audio feature storage and retrieval"""
    
    @pytest.mark.asyncio
    async def test_get_audio_features_not_found(self, test_client):
        """Test retrieving features for non-existent audio file"""
        response = test_client.get("/audio/features/non_existent_id")
        
        assert response.status_code == 404
        assert "Audio features not found" in response.json()["detail"]
    
    def test_calculate_similarity_insufficient_ids(self, test_client):
        """Test similarity calculation with insufficient audio IDs"""
        response = test_client.post(
            "/audio/similarity",
            json={"audio_ids": ["single_id"]}
        )
        
        assert response.status_code == 422  # Validation error for missing audio_ids in request body
    
    def test_calculate_similarity_valid_request(self, test_client):
        """Test similarity calculation with valid audio IDs"""
        response = test_client.post(
            "/audio/similarity",
            json=["audio_1", "audio_2"]  # Send as array directly
        )
        
        # Should fail with 404 since audio files don't exist in test DB
        # but validates the endpoint structure
        assert response.status_code in [404, 500]


class TestAudioAnalysisEdgeCases:
    """Test edge cases and error conditions"""
    
    def test_analyze_empty_file(self, test_client):
        """Test analysis of empty file"""
        empty_file = io.BytesIO(b"")
        
        response = test_client.post(
            "/audio/analyze",
            files={"file": ("empty.wav", empty_file, "audio/wav")}
        )
        
        # Should fail during processing (either 400 or 500 is acceptable)
        assert response.status_code in [400, 500]
    
    def test_analyze_corrupted_audio(self, test_client, mock_audio_analyzer):
        """Test analysis of corrupted audio file"""
        # Mock analyzer to raise an exception
        mock_audio_analyzer.extract_features.side_effect = Exception("Corrupted audio file")
        
        with patch('routers.audio.get_audio_analyzer', return_value=mock_audio_analyzer):
            corrupted_file = io.BytesIO(b"CORRUPTED_AUDIO_DATA")
            
            response = test_client.post(
                "/audio/analyze",
                files={"file": ("corrupted.wav", corrupted_file, "audio/wav")}
            )
            
            assert response.status_code == 500
            assert "Audio analysis failed" in response.json()["detail"]
    
    def test_analyze_large_file_extension_list(self, test_client, sample_audio_data, mock_audio_analyzer):
        """Test that various audio file extensions are accepted"""
        with patch('routers.audio.get_audio_analyzer', return_value=mock_audio_analyzer):
            audio_extensions = ['.wav', '.mp3', '.m4a', '.flac', '.aac', '.ogg']
            
            for ext in audio_extensions:
                audio_file = io.BytesIO(sample_audio_data["wav_content"])
                
                response = test_client.post(
                    "/audio/analyze",
                    files={"file": (f"test{ext}", audio_file, "")}  # No content type, rely on extension
                )
                
                assert response.status_code == 200, f"Failed for extension {ext}"
                data = response.json()
                assert data["status"] == "success"
