import logging
import logging.handlers
import os
import uuid
import json
from datetime import datetime
from .settings import settings

class RequestIdFilter(logging.Filter):
    """Filter that adds request_id to log records."""
    def __init__(self, name=''):
        super().__init__(name)
        self.request_id = None

    def filter(self, record):
        record.request_id = getattr(record, 'request_id', self.request_id or '-')
        return True

class JsonFormatter(logging.Formatter):
    """JSON formatter for structured logging."""
    def format(self, record):
        log_record = {
            'timestamp': self.formatTime(record, self.datefmt),
            'level': record.levelname,
            'logger': record.name,
            'request_id': getattr(record, 'request_id', '-'),
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_record['exception'] = self.formatException(record.exc_info)
        
        # Add extra fields if present
        if hasattr(record, 'extra'):
            log_record.update(record.extra)
            
        return json.dumps(log_record)

def setup_logging():
    """Set up application logging with enhanced features."""
    # Create logs directory if it doesn't exist
    if not os.path.exists(settings.LOG_DIR):
        os.makedirs(settings.LOG_DIR)

    # Generate filename with timestamp
    current_time = datetime.now().strftime("%Y%m%d")
    log_filename = os.path.join(
        settings.LOG_DIR, 
        f"{settings.LOG_FILENAME_PREFIX}_{current_time}.log"
    )

    # Create formatters
    standard_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - [%(request_id)s] - %(name)s - %(message)s'
    )
    
    json_formatter = JsonFormatter() if settings.LOG_FORMAT == 'json' else None
    
    # Get the root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL))

    # Create request ID filter
    request_id_filter = RequestIdFilter()

    # Create file handler with rotation
    file_handler = logging.handlers.TimedRotatingFileHandler(
        log_filename,
        when='midnight',
        backupCount=settings.LOG_BACKUP_COUNT
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(json_formatter if settings.LOG_FORMAT == 'json' else standard_formatter)
    file_handler.addFilter(request_id_filter)

    # Create console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(logging.Formatter('%(levelname)s - [%(request_id)s] - %(message)s'))
    console_handler.addFilter(request_id_filter)

    # Remove existing handlers to avoid duplicates
    root_logger.handlers = []

    # Add handlers to root logger
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)

    # Create logger for this module
    logger = logging.getLogger(__name__)
    logger.info(f"Logging setup complete. Writing to {log_filename}", extra={"request_id": "startup"})

    return logger, request_id_filter

def get_request_id():
    """Generate a unique request ID."""
    return str(uuid.uuid4()) 