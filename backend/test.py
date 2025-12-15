import google.generativeai as genai
import os

# 1. SETUP: Put your API key here
# OR use os.environ["GOOGLE_API_KEY"] if you have it set in your system
API_KEY = "AIzaSyDgML6w1QwY7BteKCbQHzkfOhIWj5mhqFM" 

try:
    genai.configure(api_key=API_KEY)
except Exception as e:
    print(f"Error configuring API: {e}")
    exit()

print(f"{'MODEL ID (Use this in code)':<35} | {'DISPLAY NAME'}")
print("-" * 65)

try:
    # 2. FETCH: Get all models
    for m in genai.list_models():
        # 3. FILTER: We only care about models that can generate text/video (not embeddings)
        if 'generateContent' in m.supported_generation_methods:
            # Clean up the name (it usually comes as 'models/gemini-1.5-flash')
            model_id = m.name
            display_name = m.display_name
            
            print(f"{model_id:<35} | {display_name}")
            
except Exception as e:
    print(f"Failed to list models. Error: {e}")