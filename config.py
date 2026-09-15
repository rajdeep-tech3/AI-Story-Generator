import os
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()

# Read OpenRouter API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
