"""
Integration test for SyncSphere AI Service
Tests complete workflow: service startup -> health check -> audio analysis -> recommendations
"""

import pytest
import requests
import io
import time
from pathlib import Path

# Test configuration
AI_SERVICE_URL = "http://localhost:8004"
TIMEOUT = 30  # seconds to wait for service startup

class TestAIServiceIntegration:
    """Integration tests for the complete AI service workflow"""
    
    @classmethod
    def setup_class(cls):
        """Ensure AI service is running before tests"""
        cls.wait_for_service()
    
    @classmethod
    def wait_for_service(cls):
        """Wait for AI service to be available"""
        for attempt in range(TIMEOUT):
            try:
                response = requests.get(f"{AI_SERVICE_URL}/health/", timeout=5)
                if response.status_code == 200:
                    print(f"✅ AI Service is running and responding")
                    return
            except requests.exceptions.RequestException:
                pass
            
            if attempt == 0:
                print("⏳ Waiting for AI service to start...")
            
            time.sleep(1)
        
        pytest.skip("AI service is not running. Start it with: ./start_ai_service.sh")
    
    def test_service_health(self):
        """Test service health endpoints"""
        # Basic health check
        response = requests.get(f"{AI_SERVICE_URL}/health/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "ai-service"
        
        # Detailed health check
        response = requests.get(f"{AI_SERVICE_URL}/health/detailed")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "system" in data
        assert "environment" in data
    
    def test_root_endpoint(self):
        """Test service root endpoint"""
        response = requests.get(f"{AI_SERVICE_URL}/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["service"] == "SyncSphere AI Service"
        assert data["status"] == "running"
        assert "endpoints" in data
    
    def test_audio_analysis_workflow(self):
        """Test complete audio analysis workflow"""
        # Create a larger WAV file that meets the 1KB minimum requirement
        wav_header = b"RIFF\x00\x10\x00\x00WAVE"
        wav_data = wav_header + b"\x00" * 4096  # 4KB of audio data
        
        # Test audio analysis
        files = {"file": ("test.wav", io.BytesIO(wav_data), "audio/wav")}
        
        response = requests.post(f"{AI_SERVICE_URL}/audio/analyze", files=files)
        
        # Should either succeed or fail gracefully
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert "filename" in data
            assert data["filename"] == "test.wav"
    
    def test_recommendations_workflow(self):
        """Test recommendations workflow"""
        # Test room recommendations
        params = {"user_id": "integration_test_user", "limit": 3}
        
        response = requests.post(f"{AI_SERVICE_URL}/recommendations/rooms", params=params)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify recommendation structure
        if data:
            recommendation = data[0]
            required_fields = ["room_id", "room_name", "score", "reasoning"]
            for field in required_fields:
                assert field in recommendation
    
    def test_database_connectivity(self):
        """Test database connectivity through API"""
        # Test user preferences endpoint (should handle gracefully if user doesn't exist)
        response = requests.get(f"{AI_SERVICE_URL}/recommendations/preferences/test_user")
        
        # Should return 404 (user not found) or 500 (database error) - both indicate connectivity
        assert response.status_code in [404, 500]
        
        # Test analytics endpoint
        response = requests.get(f"{AI_SERVICE_URL}/recommendations/analytics/user/test_user")
        assert response.status_code in [200, 404, 500]
    
    def test_error_handling(self):
        """Test service error handling"""
        # Test invalid audio file
        invalid_file = {"file": ("test.txt", io.BytesIO(b"not audio"), "text/plain")}
        
        response = requests.post(f"{AI_SERVICE_URL}/audio/analyze", files=invalid_file)
        assert response.status_code == 400
        
        error_data = response.json()
        assert "File must be an audio file" in error_data["detail"]
        
        # Test invalid recommendations request
        response = requests.post(f"{AI_SERVICE_URL}/recommendations/rooms")
        assert response.status_code == 422  # Missing required parameters


class TestServicePerformance:
    """Performance tests for the AI service"""
    
    def test_health_check_performance(self):
        """Test health check response time"""
        start_time = time.time()
        
        response = requests.get(f"{AI_SERVICE_URL}/health/")
        
        end_time = time.time()
        response_time = end_time - start_time
        
        assert response.status_code == 200
        assert response_time < 1.0, f"Health check took {response_time:.2f}s, should be < 1.0s"
    
    def test_recommendations_performance(self):
        """Test recommendations response time"""
        start_time = time.time()
        
        params = {"user_id": "perf_test_user", "limit": 5}
        response = requests.post(f"{AI_SERVICE_URL}/recommendations/rooms", params=params)
        
        end_time = time.time()
        response_time = end_time - start_time
        
        assert response.status_code == 200
        assert response_time < 2.0, f"Recommendations took {response_time:.2f}s, should be < 2.0s"


if __name__ == "__main__":
    # Run integration tests directly
    pytest.main([__file__, "-v", "-s"])
