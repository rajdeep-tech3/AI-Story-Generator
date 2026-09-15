import requests

try:
    response = requests.get("https://api-inference.huggingface.co")
    print("Status Code:", response.status_code)
    print("Connected Successfully!")
except Exception as e:
    print(e)