"""
Test suite for health check endpoints
"""

import pytest
from fastapi.testclient import TestClient


class TestHealthEndpoints:
    """Test health check functionality"""
    
    def test_basic_health_check(self, test_client):
        """Test basic health check endpoint"""
        response = test_client.get("/health/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "healthy"
        assert data["service"] == "ai-service"
        assert "timestamp" in data
    
    def test_detailed_health_check(self, test_client):
        """Test detailed health check endpoint"""
        response = test_client.get("/health/detailed")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "healthy"
        assert "system" in data  # Fixed: it's "system" not "system_info"
        assert "environment" in data
        assert "python_version" in data["environment"]
        assert "memory_percent" in data["system"]
    
    def test_root_endpoint(self, test_client):
        """Test root endpoint"""
        response = test_client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["service"] == "SyncSphere AI Service"
        assert data["version"] == "1.0.0"
        assert data["status"] == "running"
        assert "endpoints" in data
        
        # Check that all expected endpoints are listed
        expected_endpoints = ["health", "audio_analysis", "recommendations", "docs"]
        for endpoint in expected_endpoints:
            assert endpoint in data["endpoints"]
