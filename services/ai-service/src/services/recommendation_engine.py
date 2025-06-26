"""
Recommendation Engine Service
Handles room recommendations using various algorithms
"""

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    print("Warning: NumPy not available. Some features may be limited.")

from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import json

class RecommendationEngine:
    """
    Service for generating room recommendations
    """
    
    def __init__(self):
        # TODO: Initialize database connections and ML models
        pass
    
    async def get_room_recommendations(
        self, 
        user_id: str, 
        limit: int = 10,
        user_preferences=None,
        recent_interactions=None
    ) -> List[Dict]:
        """
        Get personalized room recommendations for a user
        """
        # Generate recommendations based on user preferences and interactions
        
        recommendations = []
        
        # Use user preferences if available
        if user_preferences:
            preferred_genres = getattr(user_preferences, 'genrePreferences', []) or []
            tempo_range = getattr(user_preferences, 'tempoRange', {}) or {}
            tempo_min = tempo_range.get('min', 60.0)
            tempo_max = tempo_range.get('max', 180.0)
            energy_range = getattr(user_preferences, 'energyRange', {}) or {}
            energy_level = energy_range.get('min', 0.5)  # Use min as baseline
        else:
            preferred_genres = ["electronic", "ambient"]
            tempo_min, tempo_max = 60.0, 180.0
            energy_level = 0.5
        
        # Analyze recent interactions for patterns
        interaction_patterns = self._analyze_interaction_patterns(recent_interactions)
        
        # Generate personalized recommendations
        for i in range(min(limit, 10)):
            score = 0.9 - (i * 0.05)
            
            # Adjust score based on user preferences
            if preferred_genres:
                score += 0.1  # Boost for matching preferences
            
            # Adjust based on interaction patterns
            if interaction_patterns.get('active_hours'):
                score += 0.05  # Boost for being active at this time
            
            room_name = f"Recommended Room {i+1}"
            reasoning = "Based on your preferences"
            
            if preferred_genres:
                reasoning = f"Matches your preference for {', '.join(preferred_genres[:2])}"
            
            recommendations.append({
                "room_id": f"rec_room_{user_id}_{i+1}",
                "room_name": room_name,
                "score": round(score, 3),
                "reasoning": reasoning,
                "participants": 3 + (i % 8),
                "genres": preferred_genres[:2] if preferred_genres else ["electronic", "ambient"],
                "tempo_range": [tempo_min, tempo_max],
                "energy_level": energy_level
            })
        
        return recommendations
    
    def _analyze_interaction_patterns(self, interactions) -> Dict:
        """
        Analyze user interaction patterns to improve recommendations
        """
        if not interactions:
            return {}
        
        patterns = {
            'most_common_interaction': None,
            'preferred_times': [],
            'room_preferences': [],
            'active_hours': False
        }
        
        try:
            # Count interaction types
            interaction_counts = {}
            for interaction in interactions:
                interaction_type = getattr(interaction, 'actionType', 'unknown')
                interaction_counts[interaction_type] = interaction_counts.get(interaction_type, 0) + 1
            
            if interaction_counts:
                most_common = max(interaction_counts.keys(), key=lambda k: interaction_counts[k])
                patterns['most_common_interaction'] = most_common
            
            # Analyze timing patterns (simplified)
            current_hour = datetime.now().hour
            patterns['active_hours'] = 9 <= current_hour <= 23  # Active during typical hours
            
        except Exception as e:
            print(f"Error analyzing interaction patterns: {e}")
        
        return patterns
    
    async def get_similar_rooms(self, room_id: str, limit: int = 5) -> List[Dict]:
        """
        Get rooms similar to a given room
        """
        # TODO: Implement content-based similarity
        similar_rooms = []
        for i in range(min(limit, 3)):
            similar_rooms.append({
                "room_id": f"similar_room_{i+1}",
                "room_name": f"Similar Room {i+1}",
                "similarity_score": 0.8 - (i * 0.1),
                "shared_features": ["tempo", "genre"],
                "participants": 3 + i
            })
        
        return similar_rooms
    
    async def update_user_preferences(self, user_id: str, preferences: Dict):
        """
        Update user preferences for recommendations
        """
        # TODO: Implement database update
        print(f"Updating preferences for user {user_id}: {preferences}")
    
    async def get_user_preferences(self, user_id: str) -> Dict:
        """
        Get current user preferences
        """
        # TODO: Implement database lookup
        return {
            "user_id": user_id,
            "genres": ["electronic", "jazz"],
            "tempo_range": [90, 140],
            "energy_level": "medium",
            "updated_at": datetime.utcnow().isoformat()
        }
    
    async def record_user_interaction(self, user_id: str, room_id: str, 
                                    interaction_type: str, timestamp: datetime):
        """
        Record user interaction for learning
        """
        # TODO: Implement database insert
        print(f"Recording interaction: {user_id} -> {room_id} ({interaction_type})")
    
    async def get_user_stats(self, user_id: str) -> Dict:
        """
        Get recommendation statistics for a user
        """
        # TODO: Implement actual stats calculation
        return {
            "user_id": user_id,
            "total_interactions": 42,
            "rooms_joined": 15,
            "recommendations_clicked": 28,
            "click_through_rate": 0.67,
            "favorite_genres": ["electronic", "ambient", "jazz"],
            "last_activity": datetime.utcnow().isoformat()
        }
    
    def _calculate_content_similarity(self, room1_features: Dict, room2_features: Dict) -> float:
        """
        Calculate content-based similarity between rooms
        """
        # TODO: Implement actual similarity calculation
        return 0.75
    
    def _get_collaborative_score(self, user_id: str, room_id: str) -> float:
        """
        Calculate collaborative filtering score
        """
        # TODO: Implement collaborative filtering
        return 0.65
    
    def _combine_scores(self, content_score: float, collaborative_score: float, 
                       context_score: float = 0.5) -> float:
        """
        Combine different recommendation scores
        """
        # Weighted combination
        weights = {"content": 0.4, "collaborative": 0.4, "context": 0.2}
        
        combined = (
            content_score * weights["content"] +
            collaborative_score * weights["collaborative"] +
            context_score * weights["context"]
        )
        
        return min(max(combined, 0.0), 1.0)  # Clamp to [0, 1]
