# print(response.text)

import vertexai
from vertexai.generative_models import GenerativeModel

# Initialize Vertex AI (ADC is auto-detected, DO NOT pass credentials manually)
vertexai.init(
    project="project-ca265e68-9d90-4187-a94",
    location="us-central1"
)

# Load Gemini model
model = GenerativeModel("gemini-1.5-flash")

# Send request
response = model.generate_content("Say hello")

# Print response
print(response.text)