import asyncio
import logging
import sys
from pythonjsonlogger import jsonlogger
from .config import settings
from .metrics import start_metrics_server
from .worker import run_worker

handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(jsonlogger.JsonFormatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
logging.root.handlers = [handler]
logging.root.setLevel(settings.log_level.upper())

if __name__ == "__main__":
    start_metrics_server()
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        pass
