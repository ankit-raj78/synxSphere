"""
Logging Configuration
Setup structured logging for the AI service
"""

import logging
import sys
from datetime import datetime

def setup_logger(name: str = "ai-service", level: str = "INFO") -> logging.Logger:
    """
    Setup structured logger with console and file output
    """
    logger = logging.getLogger(name)
    
    # Set level
    log_level = getattr(logging, level.upper(), logging.INFO)
    logger.setLevel(log_level)
    
    # Avoid duplicate handlers
    if logger.handlers:
        return logger
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(formatter)
    
    logger.addHandler(console_handler)
    
    # File handler (optional)
    try:
        file_handler = logging.FileHandler('ai-service.log')
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except Exception:
        # If file logging fails, continue with console only
        pass
    
    return logger
