from google import genai

API_KEY = "AIzaSyB3xWugWbjKKmoWTMIyIsgMn7lLT9h_rtU"

client = genai.Client(api_key=API_KEY)

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="O'zbek tili haqida ma'lumot bering",
)

print(response.text)
