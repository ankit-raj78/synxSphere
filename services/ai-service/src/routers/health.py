"""
Health Check Router
Simple health monitoring endpoints
"""

from fastapi import APIRouter
from datetime import datetime
import sys
import os
try:
    import psutil
except ImportError:
    psutil = None

router = APIRouter()

@router.get("/")
async def health_check():
    """Basic health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "ai-service"
    }

@router.get("/detailed")
async def detailed_health_check():
    """Detailed health check with system metrics"""
    system_info = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "ai-service",
        "environment": {
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            "port": os.getenv("PORT", "8004")
        }
    }
    
    # Add system metrics if psutil is available
    if psutil:
        system_info["system"] = {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent
        }
    else:
        system_info["system"] = {
            "cpu_percent": "unavailable",
            "memory_percent": "unavailable", 
            "disk_percent": "unavailable"
        }
    
    return system_info
