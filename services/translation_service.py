import requests
import time

# Registering your email with MyMemory raises the free daily limit
# from ~5,000 words/day to ~50,000 words/day. Replace with your own email.
MYMEMORY_EMAIL = "rajeducation2706@gmail.com"


def translate_story(story, target_language, max_retries=3):
    """
    Translate English story into Hindi or Punjabi
    using MyMemory Translation API.
    Handles MyMemory's ~500 byte per-request limit by chunking text,
    and retries on rate-limit (429) errors.
    """

    language_codes = {
        "Hindi": "hi",
        "Punjabi": "pa"
    }

    target_code = language_codes.get(target_language)

    if not target_code:
        raise ValueError("Unsupported target language.")

    url = "https://api.mymemory.translated.net/get"

    chunks = _split_into_chunks(story, max_bytes=450)

    translated_parts = []

    for chunk in chunks:
        translated_parts.append(
            _translate_chunk(url, chunk, target_code, max_retries)
        )

        # Small delay between requests so we don't burst past the rate limit
        time.sleep(0.6)

    return " ".join(translated_parts)


def _translate_chunk(url, chunk, target_code, max_retries):

    params = {
        "q": chunk,
        "langpair": f"en|{target_code}",
        "de": MYMEMORY_EMAIL
    }

    for attempt in range(max_retries):

        response = requests.get(url, params=params, timeout=30)

        if response.status_code == 429:
            # Rate limited — wait longer each retry, then try again
            wait_time = 2 * (attempt + 1)
            time.sleep(wait_time)
            continue

        response.raise_for_status()

        data = response.json()

        status = data.get("responseStatus")
        if str(status) != "200":
            raise Exception(f"Translation API error (status {status}): {data}")

        translated_text = data.get("responseData", {}).get("translatedText")

        if not translated_text or "QUERY LENGTH LIMIT" in translated_text.upper():
            raise Exception(f"Translation failed or chunk too long: {translated_text}")

        return translated_text

    # If we got here, every retry hit a 429
    raise Exception(
        "Translation service is rate-limited right now. Please wait a minute and try again."
    )


def _split_into_chunks(text, max_bytes=450):
    """
    Split text into chunks (by sentence) that stay under max_bytes
    when UTF-8 encoded, so we don't exceed MyMemory's per-request limit.
    """
    sentences = text.replace("\n", " ").split(". ")
    chunks = []
    current = ""

    for sentence in sentences:
        candidate = (current + ". " + sentence).strip() if current else sentence
        if len(candidate.encode("utf-8")) > max_bytes:
            if current:
                chunks.append(current.strip())
            current = sentence
        else:
            current = candidate

    if current:
        chunks.append(current.strip())

    return chunks