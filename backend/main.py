from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, defer
import models
from database import engine, get_db, SessionLocal # Import SessionLocal for background tasks
import boto3
from botocore.exceptions import NoCredentialsError
from botocore.config import Config
import os
import re
import shutil
import time
import json
import tempfile
from pydantic import BaseModel
import google.generativeai as genai
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from moviepy.editor import VideoFileClip
import PIL.Image
import subprocess
import imageio_ffmpeg

# --- 1. MONKEY PATCH (Fix for MoviePy/Pillow) ---
if not hasattr(PIL.Image, 'ANTIALIAS'):
    PIL.Image.ANTIALIAS = PIL.Image.LANCZOS

# --- 2. CONFIGURATION ---
# Database
# UNCOMMENT THIS LINE FOR ONE RUN:
# models.Base.metadata.drop_all(bind=engine) 
models.Base.metadata.create_all(bind=engine)

# App
app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AWS S3
region = os.getenv("AWS_REGION")
s3_config = Config(region_name=region, signature_version='s3v4')
s3_client = boto3.client(
    's3',
    endpoint_url=f"https://s3.{region}.amazonaws.com",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    config=s3_config
)

# Google AI
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# --- 3. HELPER FUNCTIONS ---

def normalize_visual_summary(visual_data):
    if isinstance(visual_data, str): return visual_data
    if isinstance(visual_data, list):
        return "\n".join([f"[{item.get('time', '')}] {item.get('content', '')}" for item in visual_data])
    return ""

def get_video_duration(ffmpeg_exe, video_path):
    try:
        result = subprocess.run([ffmpeg_exe, '-i', video_path], stderr=subprocess.PIPE, text=True)
        match = re.search(r"Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})", result.stderr)
        if match:
            h, m, s = map(float, match.groups())
            return h * 3600 + m * 60 + s
    except: return None
    return None

def scale_timestamps(chapters_data, ratio):
    new_chapters = []
    for chapter in chapters_data:
        time_str = chapter.get("timestamp", "00:00")
        try:
            parts = list(map(int, time_str.split(":")))
            seconds = sum(p * 60**i for i, p in enumerate(reversed(parts)))
            real_seconds = seconds * ratio
            m, s = divmod(real_seconds, 60)
            h, m = divmod(m, 60)
            new_time = f"{int(h):02d}:{int(m):02d}:{int(s):02d}" if h > 0 else f"{int(m):02d}:{int(s):02d}"
            new_chapters.append({"timestamp": new_time, "label": chapter.get("label", "")})
        except: new_chapters.append(chapter)
    return new_chapters

def optimize_video_for_ai(video_path):
    """
    STRATEGY: SYNCED SLIDESHOW
    Creates a single, low-FPS video file with full audio, but a compressed duration.
    Returns: (file_path, optimization_type)
    """
    try:
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        duration_sec = get_video_duration(ffmpeg_exe, video_path) or 0
        
        # Don't optimize short videos
        if duration_sec < 600:
            return video_path, 'original'

        print(f"📉 Generating 'Synced Slideshow' for {duration_sec}s video...")
        
        optimized_path = video_path.replace(".mp4", "_optimized.mp4")
        
        # We need ~700 frames max for safety. FPS = 700 / duration.
        target_fps = 700 / duration_sec
        target_fps = max(target_fps, 0.05) # At least 1 frame every 20s
        
        # THE MAGIC: We resample the video AND audio to a new, shorter timeline.
        # This creates ONE file that is 10x shorter but contains all the data.
        cmd = [
            ffmpeg_exe, '-y', '-i', video_path,
            '-vf', f"setpts=0.1*PTS,scale=-2:480", # Speed up video 10x
            '-af', 'atempo=2.0,atempo=2.0,atempo=2.0,atempo=1.25', # Speed up audio 10x (2*2*2*1.25)
            '-c:v', 'libx264', '-preset', 'ultrafast',
            optimized_path
        ]
        
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return optimized_path, 'synced_slideshow'

    except Exception as e:
        print(f"❌ Optimization failed: {e}. Fallback to Original.")
        return video_path, 'original'

def generate_with_fallback(contents, prompt_text=""):
    request_content = [contents, prompt_text]
    models_to_try = ["gemini-flash-latest", "gemini-robotics-er-1.5-preview"] 
    
    for model_name in models_to_try:
        try:
            print(f"🤖 Attempting analysis with {model_name}...")
            model = genai.GenerativeModel(model_name=model_name)
            return model.generate_content(request_content)
        except Exception as e:
            print(f"❌ Error with {model_name}: {str(e)}")
            continue
    raise RuntimeError("All AI models failed.")

# --- WORKER ---
def process_video_task(video_db_id: int, file_key: str):
    try:
        print(f"🎬 Processing Video {video_db_id}...")
        bucket_name = os.getenv("AWS_BUCKET_NAME")
        original_name = file_key.split("/")[-1]
        clean_name = original_name.replace(" ", "_")
        temp_dir = tempfile.gettempdir() 
        temp_path = os.path.join(temp_dir, clean_name)
        
        s3_client.download_file(bucket_name, file_key, temp_path)
        
        final_upload_path, opt_type = optimize_video_for_ai(temp_path)
        
        print(f"📤 Uploading ({opt_type} mode)...")
        video_file = genai.upload_file(path=final_upload_path)
        
        while video_file.state.name == "PROCESSING":
            time.sleep(5)
            video_file = genai.get_file(video_file.name)

        print(f"🧠 Analyzing ({opt_type})...")
        prompt = """
        Analyze this video lecture. The audio has been sped up significantly.
        I need a structured JSON output with:
        1. "transcript_summary": A detailed summary/notes of the spoken content.
        2. "visual_summary": A description of the visual slides or diagrams that was SHOWN.
        3. "chapters": A list of objects with "timestamp" (MM:SS) and a descriptive "label".
        4. "tags": List of 5-10 technical keywords.
        Output ONLY valid JSON, escaping all quotes.
        """

        response = generate_with_fallback(video_file, prompt)
        
        # Parse with robust error handling
        raw_text = response.text.replace("```json", "").replace("```", "").strip()
        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError as e:
            print(f"❌ JSON PARSE ERROR: {e}\nRAW TEXT: {raw_text}")
            raise ValueError("AI returned invalid JSON")
        
        transcript_sum = data.get("transcript_summary", "")
        visual_sum = normalize_visual_summary(data.get("visual_summary", ""))
        chapters_data = data.get("chapters", [])
        tags_data = data.get("tags", [])
        
        # SCALING IS STILL NEEDED
        final_chapters = chapters_data
        if opt_type == 'synced_slideshow':
            SPEEDUP_RATIO = 10.0 
            print(f"⏳ Scaling timestamps by {SPEEDUP_RATIO}x...")
            final_chapters = scale_timestamps(data.get("chapters", []), SPEEDUP_RATIO)

        # Embed
        print("🧮 Generating Embeddings...")
        embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
        combined_text = f"Visuals: {visual_sum}\nAudio: {transcript_sum}\nTags: {', '.join(tags_data)}"
        vector = embeddings.embed_query(combined_text[:8000]) # Truncate safety
        
        db = SessionLocal()
        try:
            print("💾 Saving to DB...")
            video = db.query(models.Video).filter(models.Video.id == video_db_id).first()
            if video:
                video.transcript_summary = transcript_sum
                video.visual_summary = visual_sum
                video.chapters = final_chapters
                video.tags = tags_data
                video.embedding = vector
                video.processed = True
                db.commit()
        finally:
            db.close()

        # Cleanup
        if os.path.exists(temp_path): os.remove(temp_path)
        if final_upload_path != temp_path and os.path.exists(final_upload_path): 
            os.remove(final_upload_path)
        genai.delete_file(video_file.name)
        
        print("✅ Done!")

    except Exception as e:
        print(f"❌ Worker Error: {str(e)}")

# --- 5. ENDPOINTS ---

class SearchQuery(BaseModel):
    query: str

class VideoCreate(BaseModel):
    filename: str
    content_type: str

@app.get("/")
def read_root():
    return {"message": "Codex API is running"}

@app.get("/videos/")
def read_videos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Defer embedding to prevent 500 error
    videos = db.query(models.Video).options(defer(models.Video.embedding)).order_by(models.Video.created_at.desc()).offset(skip).limit(limit).all()
    return videos

@app.post("/videos/presigned-url")
def generate_presigned_url(video: VideoCreate):
    bucket_name = os.getenv("AWS_BUCKET_NAME")
    object_name = video.filename # Storing at root to fix path issues
    try:
        url = s3_client.generate_presigned_url(
            'put_object',
            Params={'Bucket': bucket_name, 'Key': object_name, 'ContentType': video.content_type},
            ExpiresIn=3600
        )
        return {"url": url, "key": object_name}
    except NoCredentialsError:
        return {"error": "AWS Credentials not available"}

@app.post("/videos/process")
def start_processing(video_data: dict, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    s3_key = video_data.get("key")
    title = video_data.get("title", "Untitled")
    
    new_video = models.Video(title=title, s3_key=s3_key, user_id="demo_user", processed=False)
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    
    # Start worker WITHOUT passing 'db'
    background_tasks.add_task(process_video_task, new_video.id, s3_key)
    
    return {"status": "Processing started", "video_id": new_video.id}

@app.post("/search")
def search_videos(search: SearchQuery, db: Session = Depends(get_db)):
    print(f"🔍 Searching for: {search.query}")
    
    # 1. Get Vector Results (Semantic Match)
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
    query_vector = embeddings.embed_query(search.query)
    
    # Get top 5 semantically similar videos
    # We also fetch the 'distance' (similarity score) to filter bad results later
    results = db.query(models.Video).order_by(
        models.Video.embedding.cosine_distance(query_vector)
    ).limit(5).all()
    
    response = []
    bucket_name = os.getenv("AWS_BUCKET_NAME")
    
    for video in results:
        # A. Generate URL
        try:
            playback_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket_name, 'Key': video.s3_key},
                ExpiresIn=3600
            )
        except: playback_url = ""

        # B. Smart Hit Logic (Keyword match in Chapters)
        best_timestamp = "00:00"
        match_type = "semantic" # Default: just a general topic match
        query_lower = search.query.lower()
        
        if video.chapters:
            for c in video.chapters:
                # Check if search term exists in chapter label
                if query_lower in c.get('label', '').lower():
                    best_timestamp = c.get('timestamp', "00:00")
                    match_type = "chapter" # Upgrade: Specific chapter match!
                    break

        response.append({
            "id": video.id,
            "title": video.title,
            "description": (video.transcript_summary or "")[:200] + "...",
            "visuals": (video.visual_summary or "")[:100] + "...",
            "chapters": video.chapters or [],
            "s3_key": video.s3_key,
            "playback_url": playback_url,
            "start_at": best_timestamp,
            "match_type": match_type # Send this to frontend
        })

    # 2. THE RE-RANKING FIX
    # We sort the list in Python before sending it back.
    # Logic: If match_type is 'chapter' (Jump available), it goes to the TOP.
    response.sort(key=lambda x: 0 if x['match_type'] == 'chapter' else 1)

    return response

class VideoIDList(BaseModel):
    ids: list[int]

@app.post("/videos/urls")
def get_video_urls(video_ids: VideoIDList, db: Session = Depends(get_db)):
    """
    Takes a list of video IDs and returns a dictionary of signed playback URLs.
    This is much more efficient than fetching all video data.
    """
    urls = {}
    bucket_name = os.getenv("AWS_BUCKET_NAME")
    
    videos = db.query(models.Video).filter(models.Video.id.in_(video_ids.ids)).all()
    
    for video in videos:
        try:
            url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket_name, 'Key': video.s3_key},
                ExpiresIn=3600 # URLs are valid for 1 hour
            )
            urls[video.id] = url
        except Exception as e:
            print(f"Error signing URL for video {video.id}: {e}")
            urls[video.id] = None
            
    return urls