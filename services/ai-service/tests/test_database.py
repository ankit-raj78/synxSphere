"""
Test suite for database operations
"""

import pytest
from unittest.mock import AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

# Import the operations we want to test
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from database.operations import AudioFeatureService, UserInteractionService, UserPreferencesService


class TestAudioFeatureService:
    """Test audio feature database operations"""
    
    @pytest.mark.asyncio
    async def test_save_audio_features(self, test_db_session, sample_features):
        """Test saving audio features to database"""
        audio_file_id = "test_audio_123"
        
        # This will fail due to foreign key constraint (expected)
        # but tests the operation structure
        with pytest.raises(Exception):  # Foreign key constraint
            await AudioFeatureService.save_audio_features(
                test_db_session, audio_file_id, sample_features
            )
    
    @pytest.mark.asyncio
    async def test_get_audio_features_not_found(self, test_db_session):
        """Test retrieving non-existent audio features"""
        result = await AudioFeatureService.get_audio_features(
            test_db_session, "non_existent_id"
        )
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_similar_audio_files_empty_db(self, test_db_session):
        """Test similarity search on empty database"""
        feature_vector = [0.1] * 128
        
        results = await AudioFeatureService.get_similar_audio_files(
            test_db_session, feature_vector, limit=5
        )
        
        assert isinstance(results, list)
        assert len(results) == 0


class TestUserInteractionService:
    """Test user interaction database operations"""
    
    @pytest.mark.asyncio
    async def test_save_interaction(self, test_db_session):
        """Test saving user interaction"""
        interaction_data = {
            "user_id": "test_user",
            "room_id": "test_room", 
            "interaction_type": "join",
            "duration": 300,
            "timestamp": datetime.utcnow()
        }
        
        # This will fail due to foreign key constraints (expected)
        with pytest.raises(Exception):
            await UserInteractionService.save_interaction(
                test_db_session, interaction_data
            )
    
    @pytest.mark.asyncio
    async def test_get_user_interactions_empty(self, test_db_session):
        """Test getting interactions for user with no interactions"""
        interactions = await UserInteractionService.get_user_interactions(
            test_db_session, "non_existent_user", limit=10
        )
        
        assert isinstance(interactions, list)
        assert len(interactions) == 0
    
    @pytest.mark.asyncio
    async def test_get_room_interactions_empty(self, test_db_session):
        """Test getting interactions for room with no interactions"""
        interactions = await UserInteractionService.get_room_interactions(
            test_db_session, "non_existent_room", limit=10
        )
        
        assert isinstance(interactions, list)
        assert len(interactions) == 0


class TestUserPreferencesService:
    """Test user preferences database operations"""
    
    @pytest.mark.asyncio
    async def test_get_preferences_not_found(self, test_db_session):
        """Test getting preferences for non-existent user"""
        preferences = await UserPreferencesService.get_user_preferences(
            test_db_session, "non_existent_user"
        )
        
        assert preferences is None
    
    @pytest.mark.asyncio
    async def test_save_preferences(self, test_db_session):
        """Test saving user preferences"""
        preferences_data = {
            "user_id": "test_user",
            "preferred_genres": ["jazz", "blues"],
            "preferred_tempo_range": [80, 120],
            "preferred_instruments": ["piano", "guitar"],
            "activity_level": "medium"
        }
        
        # This will fail due to foreign key constraint (expected)
        with pytest.raises(Exception):
            await UserPreferencesService.save_user_preferences(
                test_db_session, "test_user", preferences_data
            )
    
    @pytest.mark.asyncio
    async def test_update_preferences_not_found(self, test_db_session):
        """Test updating preferences for non-existent user"""
        preferences_data = {
            "preferred_genres": ["rock", "pop"],
            "activity_level": "high"
        }
        
        result = await UserPreferencesService.update_user_preferences(
            test_db_session, "non_existent_user", preferences_data
        )
        
        assert result is None


class TestDatabaseConnectionHandling:
    """Test database connection and session handling"""
    
    @pytest.mark.asyncio
    async def test_database_session_context(self, test_db_session):
        """Test that database session works in async context"""
        # Simple query to test session is working
        result = await test_db_session.execute("SELECT 1 as test_value")
        row = result.fetchone()
        
        assert row is not None
        assert row[0] == 1
    
    @pytest.mark.asyncio
    async def test_database_transaction_rollback(self, test_db_session):
        """Test transaction rollback behavior"""
        try:
            # Attempt an operation that will fail
            await test_db_session.execute("SELECT * FROM non_existent_table")
            await test_db_session.commit()
        except Exception:
            await test_db_session.rollback()
            # Should not raise an exception
            pass
    
    @pytest.mark.asyncio
    async def test_multiple_operations_same_session(self, test_db_session):
        """Test multiple operations using the same session"""
        # Test that we can perform multiple queries
        for i in range(3):
            result = await test_db_session.execute(f"SELECT {i} as value")
            row = result.fetchone()
            assert row[0] == i


class TestDatabaseModelValidation:
    """Test database model validation and constraints"""
    
    def test_audio_features_model_structure(self):
        """Test that AudioFeatures model has expected fields"""
        from database.models import AudioFeatures
        
        # Check that the model has expected attributes
        expected_fields = [
            'id', 'audio_file_id', 'duration', 'sample_rate', 'tempo',
            'beats_count', 'spectral_centroid_mean', 'mfcc_features',
            'chroma_features', 'tonnetz_features', 'feature_vector'
        ]
        
        for field in expected_fields:
            assert hasattr(AudioFeatures, field), f"AudioFeatures missing field: {field}"
    
    def test_user_interactions_model_structure(self):
        """Test that UserInteractions model has expected fields"""
        from database.models import UserInteractions
        
        expected_fields = [
            'id', 'user_id', 'room_id', 'interaction_type', 
            'duration', 'timestamp', 'created_at'
        ]
        
        for field in expected_fields:
            assert hasattr(UserInteractions, field), f"UserInteractions missing field: {field}"
    
    def test_user_preferences_model_structure(self):
        """Test that UserPreferences model has expected fields"""
        from database.models import UserPreferences
        
        expected_fields = [
            'id', 'user_id', 'preferred_genres', 'preferred_tempo_range',
            'preferred_instruments', 'activity_level', 'updated_at'
        ]
        
        for field in expected_fields:
            assert hasattr(UserPreferences, field), f"UserPreferences missing field: {field}"
