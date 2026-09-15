import os
from flask import Flask, render_template, request, jsonify

from services.ai_service import generate_story
from services.translation_service import translate_story

app = Flask(__name__)


@app.route("/")
def home():
    """
    Show the home page.
    """
    return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json()

    genre = data.get("genre", "")
    characters = data.get("characters", "")
    setting = data.get("setting", "")
    length = data.get("length", "Short")

    prompt = f"""
Write a {length.lower()} {genre} story.

Characters:
{characters}

Setting:
{setting}

The story should have a beginning,
middle, and ending.
"""

    story = generate_story(prompt)

    return jsonify({
        "story": story
    })


@app.route("/translate", methods=["POST"])
def translate():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data received."}), 400

        story = data.get("story", "")
        target_language = data.get("language", "")

        if not story:
            return jsonify({"error": "No story provided."}), 400

        if not target_language:
            return jsonify({"error": "No language selected."}), 400

        translated_story = translate_story(
            story,
            target_language
        )

        return jsonify({
            "translation": translated_story
        })

    except Exception as e:
        print("TRANSLATION ERROR:", repr(e))
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)