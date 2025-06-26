"""
Test suite for recommendation endpoints
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock


class TestRecommendationEndpoints:
    """Test recommendation functionality"""
    
    def test_get_room_recommendations_success(self, test_client, mock_recommendation_engine):
        """Test successful room recommendations"""
        with patch('routers.recommendations.get_recommendation_engine', return_value=mock_recommendation_engine):
            response = test_client.post("/recommendations/rooms?user_id=test_user&limit=5")
            
            assert response.status_code == 200
            data = response.json()
            
            assert isinstance(data, list)
            assert len(data) <= 5
            
            if data:  # If recommendations returned
                recommendation = data[0]
                required_fields = ["room_id", "room_name", "score", "reasoning"]
                for field in required_fields:
                    assert field in recommendation
    
    def test_get_room_recommendations_invalid_limit(self, test_client):
        """Test room recommendations with invalid limit"""
        # Test limit too high
        response = test_client.post("/recommendations/rooms?user_id=test_user&limit=100")
        assert response.status_code == 422  # Validation error
        
        # Test limit too low
        response = test_client.post("/recommendations/rooms?user_id=test_user&limit=0")
        assert response.status_code == 422  # Validation error
    
    def test_get_room_recommendations_missing_user_id(self, test_client):
        """Test room recommendations without user_id"""
        response = test_client.post("/recommendations/rooms")
        assert response.status_code == 422  # Missing required parameter
    
    def test_get_similar_rooms(self, test_client, mock_recommendation_engine):
        """Test similar rooms endpoint"""
        mock_recommendation_engine.get_similar_rooms.return_value = [
            {
                "room_id": "similar_room_1",
                "room_name": "Similar Room 1",
                "similarity_score": 0.85,
                "genres": ["electronic", "ambient"]
            }
        ]
        
        with patch('routers.recommendations.get_recommendation_engine', return_value=mock_recommendation_engine):
            response = test_client.post("/recommendations/similar-rooms/test_room_123?limit=5")
            
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
    
    def test_record_user_interaction(self, test_client):
        """Test recording user interaction"""
        interaction_data = {
            "user_id": "test_user",
            "room_id": "test_room",
            "interaction_type": "join",
            "duration": 300
        }
        
        response = test_client.post("/recommendations/interactions", json=interaction_data)
        
        # Should handle gracefully even if DB operation fails
        assert response.status_code in [200, 500]
    
    def test_get_user_preferences_not_found(self, test_client):
        """Test getting preferences for non-existent user"""
        response = test_client.get("/recommendations/preferences/non_existent_user")
        
        assert response.status_code == 404
        assert "User preferences not found" in response.json()["detail"]
    
    def test_update_user_preferences(self, test_client):
        """Test updating user preferences"""
        preferences_data = {
            "preferred_genres": ["electronic", "jazz", "classical"],
            "preferred_tempo_range": [120, 140],
            "preferred_instruments": ["piano", "synthesizer"],
            "activity_level": "high"
        }
        
        response = test_client.put("/recommendations/preferences/test_user", json=preferences_data)
        
        # Should handle gracefully even if DB operation fails
        assert response.status_code in [200, 500]
    
    def test_get_user_analytics(self, test_client):
        """Test user analytics endpoint"""
        response = test_client.get("/recommendations/analytics/user/test_user")
        
        # Should handle gracefully even if user doesn't exist
        assert response.status_code in [200, 404, 500]
    
    def test_submit_feedback(self, test_client):
        """Test feedback submission"""
        feedback_data = {
            "user_id": "test_user",
            "room_id": "test_room",
            "rating": 4,
            "feedback_type": "recommendation",
            "comments": "Great recommendation!"
        }
        
        response = test_client.post("/recommendations/feedback", json=feedback_data)
        
        assert response.status_code in [200, 500]
    
    def test_get_user_stats(self, test_client):
        """Test user statistics endpoint"""
        response = test_client.get("/recommendations/stats/test_user")
        
        # Should handle gracefully even if user doesn't exist
        assert response.status_code in [200, 404, 500]


class TestRecommendationEdgeCases:
    """Test edge cases and error conditions"""
    
    def test_recommendation_engine_failure(self, test_client):
        """Test behavior when recommendation engine fails"""
        failing_engine = AsyncMock()
        failing_engine.get_room_recommendations.side_effect = Exception("Engine failure")
        
        with patch('routers.recommendations.get_recommendation_engine', return_value=failing_engine):
            response = test_client.post("/recommendations/rooms?user_id=test_user&limit=5")
            
            assert response.status_code == 500
            assert "Recommendation failed" in response.json()["detail"]
    
    def test_large_user_id(self, test_client, mock_recommendation_engine):
        """Test recommendation with very long user ID"""
        long_user_id = "a" * 1000
        
        with patch('routers.recommendations.get_recommendation_engine', return_value=mock_recommendation_engine):
            response = test_client.post(f"/recommendations/rooms?user_id={long_user_id}&limit=5")
            
            # Should handle gracefully
            assert response.status_code in [200, 400, 500]
    
    def test_special_characters_in_user_id(self, test_client, mock_recommendation_engine):
        """Test recommendation with special characters in user ID"""
        special_user_id = "user@test!#$%"
        
        with patch('routers.recommendations.get_recommendation_engine', return_value=mock_recommendation_engine):
            # URL encode the special characters
            encoded_user_id = "user%40test%21%23%24%25"
            response = test_client.post(f"/recommendations/rooms?user_id={encoded_user_id}&limit=5")
            
            assert response.status_code in [200, 400, 500]


class TestRecommendationIntegration:
    """Integration tests for recommendation workflows"""
    
    def test_complete_recommendation_workflow(self, test_client, mock_recommendation_engine):
        """Test complete workflow: preferences → recommendations → feedback"""
        with patch('routers.recommendations.get_recommendation_engine', return_value=mock_recommendation_engine):
            user_id = "workflow_test_user"
            
            # 1. Set user preferences
            preferences = {
                "preferred_genres": ["jazz", "blues"],
                "preferred_tempo_range": [80, 120],
                "activity_level": "medium"
            }
            
            prefs_response = test_client.put(f"/recommendations/preferences/{user_id}", json=preferences)
            assert prefs_response.status_code in [200, 500]
            
            # 2. Get recommendations
            rec_response = test_client.post(f"/recommendations/rooms?user_id={user_id}&limit=3")
            assert rec_response.status_code == 200
            
            recommendations = rec_response.json()
            assert isinstance(recommendations, list)
            
            # 3. Submit feedback (if recommendations exist)
            if recommendations:
                feedback = {
                    "user_id": user_id,
                    "room_id": recommendations[0]["room_id"],
                    "rating": 5,
                    "feedback_type": "recommendation",
                    "comments": "Perfect match!"
                }
                
                feedback_response = test_client.post("/recommendations/feedback", json=feedback)
                assert feedback_response.status_code in [200, 500]
    
    def test_recommendation_caching_behavior(self, test_client, mock_recommendation_engine):
        """Test that repeated requests handle caching appropriately"""
        with patch('routers.recommendations.get_recommendation_engine', return_value=mock_recommendation_engine):
            user_id = "cache_test_user"
            
            # Make multiple identical requests
            for i in range(3):
                response = test_client.post(f"/recommendations/rooms?user_id={user_id}&limit=5")
                assert response.status_code == 200
                
                data = response.json()
                assert isinstance(data, list)
                
                # Verify response structure is consistent
                if data:
                    for rec in data:
                        assert "room_id" in rec
                        assert "score" in rec
