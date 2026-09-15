from groq import Groq
from config import GROQ_API_KEY


# Create Groq client
client = Groq(api_key=GROQ_API_KEY)


def generate_story(prompt):
    """
    Generate a story using Groq's language model.
    """

    try:

        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",

            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a creative story writer. "
                        "Write engaging, original stories with "
                        "a clear beginning, middle, and ending."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],

            temperature=0.8,
            max_tokens=800
        )

        # Get generated story
        story = response.choices[0].message.content

        return story

    except Exception as e:

        print("Groq API Error:", e)

        return "Sorry, I could not generate the story."