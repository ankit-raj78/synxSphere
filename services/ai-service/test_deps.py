#!/usr/bin/env python3
"""
Test script to verify AI service dependencies
"""
import sys
import os

def test_dependencies():
    """Test if all dependencies are available"""
    print("🧪 Testing AI Service Dependencies...")
    
    # Add src to path
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
    
    try:
        import fastapi
        print("✅ FastAPI imported successfully")
    except ImportError as e:
        print(f"❌ FastAPI import failed: {e}")
        return False
    
    try:
        import uvicorn
        print("✅ Uvicorn imported successfully")
    except ImportError as e:
        print(f"❌ Uvicorn import failed: {e}")
        return False
    
    try:
        import pydantic
        print("✅ Pydantic imported successfully")
    except ImportError as e:
        print(f"❌ Pydantic import failed: {e}")
        return False
    
    try:
        import numpy as np
        print("✅ NumPy imported successfully")
    except ImportError as e:
        print(f"❌ NumPy import failed: {e}")
        return False
    
    try:
        import librosa
        print("✅ Librosa imported successfully")
    except ImportError as e:
        print(f"❌ Librosa import failed: {e}")
        return False
    
    try:
        import psutil
        print("✅ Psutil imported successfully")
    except ImportError as e:
        print(f"❌ Psutil import failed: {e}")
        return False
    
    # Test our modules
    try:
        from src.services.audio_analyzer import AudioAnalyzer
        print("✅ AudioAnalyzer imported successfully")
    except ImportError as e:
        print(f"❌ AudioAnalyzer import failed: {e}")
        return False
    
    try:
        from src.services.recommendation_engine import RecommendationEngine
        print("✅ RecommendationEngine imported successfully")
    except ImportError as e:
        print(f"❌ RecommendationEngine import failed: {e}")
        return False
    
    print("🎉 All dependencies working correctly!")
    return True

if __name__ == "__main__":
    success = test_dependencies()
    sys.exit(0 if success else 1)
