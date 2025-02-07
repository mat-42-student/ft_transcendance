import requests

RESET = "\033[0m"
BLUE = "\033[1;34m"
GREEN = "\033[1;32m"
RED = "\033[1;31m"
YELLOW = "\033[1;33m"
CYAN = "\033[1;36m"
MAGENTA = "\033[1;35m"
LEFT = 0
RIGHT = 1

WIDTH = 1000
HEIGHT = 600
PADWIDTH = 100
PADTHICKNESS = 0
RADIUS = 20
FPS = 60
MAX_SCORE = 1

response = requests.get(f"http://users:8000/api/v1/auth/public-key/?form=oneline")
if response.status_code == 200:
    JWT_PUBLIC_KEY = response.text  # Or response.json()
else:
    raise RuntimeError("Could not get JWT public key")