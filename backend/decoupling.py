def get_video_duration(ffmpeg_exe, video_path):
    """
    Get video duration in seconds using raw FFmpeg.
    """
    try:
        # FFmpeg writes file info to stderr, not stdout
        result = subprocess.run(
            [ffmpeg_exe, '-i', video_path], 
            stderr=subprocess.PIPE, 
            stdout=subprocess.PIPE, 
            text=True
        )
        # Regex to find "Duration: 00:00:00.00"
        match = re.search(r"Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})", result.stderr)
        if match:
            hours, mins, secs = map(float, match.groups())
            return hours * 3600 + mins * 60 + secs
    except Exception as e:
        print(f"⚠️ Could not read duration: {e}")
        return None
    return None

def scale_timestamps(chapters_data, ratio):
    """
    Multiplies Gemini's compressed timestamps by the speedup ratio 
    to get real-world time.
    Example: "01:00" (Slideshow) * 20 -> "20:00" (Real Life)
    """
    new_chapters = []
    for chapter in chapters_data:
        time_str = chapter.get("timestamp", "00:00")
        try:
            # Convert "MM:SS" to seconds
            parts = list(map(int, time_str.split(":")))
            if len(parts) == 2:
                seconds = parts[0] * 60 + parts[1]
            elif len(parts) == 3:
                seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
            else:
                seconds = 0
            
            # MULTIPLY BY RATIO (The Fix)
            real_seconds = seconds * ratio
            
            # Convert back to "HH:MM:SS" or "MM:SS"
            m, s = divmod(real_seconds, 60)
            h, m = divmod(m, 60)
            
            if h > 0:
                new_time = f"{int(h):02d}:{int(m):02d}:{int(s):02d}"
            else:
                new_time = f"{int(m):02d}:{int(s):02d}"
                
            new_chapters.append({
                "timestamp": new_time,
                "label": chapter.get("label", "")
            })
        except:
            new_chapters.append(chapter) # Keep original on error
            
    return new_chapters

def optimize_video_for_ai(video_path):
    """
    STRATEGY: TIME DECOUPLING
    1. Extract Audio (Full Duration).
    2. Extract Visuals -> Compress 2 hours into ~6 minutes (Silent Hyper-Lapse).
    Returns: (audio_path, video_path, 'decoupled')
    """
    try:
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        duration_sec = get_video_duration(ffmpeg_exe, video_path) or 7200
        
        # Output paths
        audio_path = video_path.replace(".mp4", "_audio.mp3")
        visual_path = video_path.replace(".mp4", "_visuals.mp4")

        print(f"📉 Generating Decoupled Assets for {duration_sec}s video...")

        # 1. Extract Audio (Fast)
        subprocess.run([
            ffmpeg_exe, '-y', '-i', video_path, 
            '-vn', '-acodec', 'libmp3lame', '-q:a', '4', 
            audio_path
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # 2. Create Hyper-Lapse Video
        # Logic: Take 1 frame every 10 seconds. Play back at 1 FPS.
        # A 2-hour video (7200s) becomes 720 frames = 12 minutes long.
        # Gemini sees this as a 12-minute video (Cheap!)
        select_filter = "fps=1/10,scale=-2:360,setpts=N/((1)*TB)"
        
        cmd = [
            ffmpeg_exe, '-y', '-i', video_path,
            '-vf', select_filter, 
            '-an', 
            '-c:v', 'libx264', 
            '-preset', 'ultrafast',
            '-r', '1', # Force output metadata to 1 FPS
            visual_path
        ]
        
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        return (audio_path, visual_path), 'decoupled'

    except Exception as e:
        print(f"❌ Optimization failed: {e}. Fallback to Audio.")
        # Fallback to just audio if video processing crashes
        audio_path = video_path.replace(".mp4", "_audio.mp3")
        subprocess.run([ffmpeg_exe, '-y', '-i', video_path, '-vn', audio_path], check=True)
        return (audio_path, None), 'audio'
    

# Update signature to accept a LIST of contents
# --- REPLACEMENT FUNCTION ---
def generate_with_fallback(contents, prompt_text=""):
    # If contents is just a list of files, add the prompt to it
    if isinstance(contents, list) and isinstance(prompt_text, str):
        request_content = contents + [prompt_text]
    else:
        request_content = [contents, prompt_text]

    # FIX 1: ONLY use the high-capacity model. Removed the weak 2.5/Robotics models.
    models_to_try = ["gemini-flash-latest", "gemini-robotics-er-1.5-preview"] 
    
    for model_name in models_to_try:
        # We will try the SAME model up to 3 times if it's just a rate limit issue
        max_retries = 3
        for attempt in range(max_retries):
            try:
                print(f"🤖 Attempting analysis with {model_name} (Attempt {attempt + 1}/{max_retries})...")
                model = genai.GenerativeModel(model_name=model_name)
                
                # --- DEBUG: PRINT TOKEN COUNT ---
                try:
                    count_info = model.count_tokens(request_content)
                    print(f"🔢 TOKEN DEBUG: Used {count_info.total_tokens} / 1,000,000 limit")
                except Exception as e:
                    print(f"⚠️ Could not count tokens: {e}")
                # --------------------------------

                return model.generate_content(request_content)
            
            except Exception as e:
                error_str = str(e)
                # FIX 2: Check specifically for Rate Limit (429) errors
                if "429" in error_str or "ResourceExhausted" in error_str:
                    print(f"🛑 Rate Limit Hit on {model_name}. Sleeping for 60 seconds to reset quota...")
                    time.sleep(60) # WAIT for the bucket to drain
                    continue # Retry the loop
                else:
                    # If it's a real error (like invalid API key), fail immediately
                    print(f"❌ Non-retriable error with {model_name}: {error_str}")
                    break 
                    
    raise RuntimeError("All AI models failed or rate limits persisted.")


# --- 4. BACKGROUND TASK (The Worker) ---

# Note: We do NOT pass 'db' here. We create it inside.
def process_video_task(video_db_id: int, file_key: str):
    # OPEN FRESH DB CONNECTION
    db = SessionLocal() 
    
    try:
        print(f"🎬 Processing Video {video_db_id}...")
        
        # Download
        bucket_name = os.getenv("AWS_BUCKET_NAME")

        # 1. Get original name
        original_name = file_key.split("/")[-1]
        
        # 2. Sanitize: Replace spaces with underscores
        clean_name = original_name.replace(" ", "_")
        
        temp_dir = tempfile.gettempdir() 
        temp_path = os.path.join(temp_dir, clean_name)
        
        print(f"⬇️ Downloading to {temp_path} (Sanitized)...")
        s3_client.download_file(bucket_name, file_key, temp_path)
        
        # 1. OPTIMIZE
        # Returns a tuple of paths now!
        (path_a, path_b), opt_type = optimize_video_for_ai(temp_path)
        
        files_to_upload = []
        
        # 2. UPLOAD
        if opt_type == 'decoupled':
            print("📤 Uploading Audio Track...")
            audio_file = genai.upload_file(path=path_a)
            print("📤 Uploading Visual Hyper-Lapse...")
            visual_file = genai.upload_file(path=path_b)
            
            # Wait for both
            while audio_file.state.name == "PROCESSING":
                time.sleep(1)
                audio_file = genai.get_file(audio_file.name)
            while visual_file.state.name == "PROCESSING":
                time.sleep(1)
                visual_file = genai.get_file(visual_file.name)
                
            files_to_upload = [audio_file, visual_file]
            
        elif opt_type == 'audio':
            print("📤 Uploading Audio...")
            audio_file = genai.upload_file(path=path_a)
            files_to_upload = [audio_file]

        # Analyze
        print(f"🧠 Analyzing ({opt_type})...")
        base_reqs = """
        I need a structured JSON output.
        RULES:
        1. Output ONLY valid JSON.
        2. Do NOT use markdown code blocks (no ```json).
        3. Escape any quotes inside strings.
        4. "transcript_summary": Comprehensive detailed notes of the lecture concepts of what was SPOKEN.
        5. "visual_summary": Detailed description of slides/diagrams that was SHOWN (slides, diagrams, code blocks, physical objects). Be specific (e.g., "A diagram showing the Event Loop").
        6. "chapters": List of objects with "timestamp" (MM:SS) and "label".
        7. "tags": List of 5-10 technical keywords.
        """

        if opt_type == 'decoupled':
            # THE MAGIC PROMPT
            prompt = f"""
            I have provided two files:
            1. The FULL AUDIO of a lecture.
            2. A SILENT VIDEO of the slides, accelerated (Hyper-Lapse). 
               - In the video, 1 second of playback equals 10 seconds of real time.
            
            Please correlate the Audio transcript with the Visual slides. 
            Use the Audio for the timestamps and summary. 
            Use the Video to describe the visual context (slides/diagrams).
            {base_reqs}
            """
        else:
            prompt = f"Analyze this AUDIO. {base_reqs}"

        # --- SELF-HEALING RETRY LOOP ---
        max_retries = 3
        data = None
        for attempt in range(max_retries):
            print(f"🤖 AI Analysis Attempt {attempt + 1}/{max_retries}...")
            response = generate_with_fallback(files_to_upload, prompt)
            
            raw_text = response.text.replace("```json", "").replace("```", "").strip()
            clean_text = raw_text.replace('\\', '\\\\')
            
            try:
                data = json.loads(clean_text)
                print("✅ AI returned valid JSON.")
                break # Success! Exit the loop.
            except json.JSONDecodeError as e:
                print(f"⚠️ AI returned invalid JSON on attempt {attempt + 1}: {e}")
                prompt += "\n\nCRITICAL: Your previous response was not valid JSON. Please try again and strictly follow all JSON formatting rules. Escape all quotes."
                if attempt == max_retries - 1:
                    print(f"RAW TEXT WAS: {raw_text}")
                    raise ValueError("AI failed to produce valid JSON after multiple retries.")
        # --------------------------------

        
        transcript_sum = data.get("transcript_summary", "")
        visual_sum = normalize_visual_summary(data.get("visual_summary", ""))
        chapters_data = data.get("chapters", [])
        tags_data = data.get("tags", [])

        # --- FIX: SCALING LOGIC APPLIED CORRECTLY ---
        final_chapters = chapters_data
        if opt_type == 'decoupled':
            # Ratio is 10.0 because we captured 1 frame every 10s and played at 1fps.
            SPEEDUP_RATIO = 10.0 
            print(f"⏳ Scaling timestamps by {SPEEDUP_RATIO}x...")
            # Using correct variable 'chapters_data' here
            final_chapters = scale_timestamps(chapters_data, SPEEDUP_RATIO)

        # Embed
        print("🧮 Generating Embeddings...")
        embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
        combined_text = f"Visuals: {visual_sum}\nAudio: {transcript_sum}\nTags: {', '.join(tags_data)}"
        vector = embeddings.embed_query(combined_text[:8000]) # Truncate safety

        # Save to DB
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

        # --- CLEANUP START ---
        # 1. Remove the original downloaded file
        if os.path.exists(temp_path): 
            os.remove(temp_path)
            
        # 2. Remove the generated Audio file
        if path_a and path_a != temp_path and os.path.exists(path_a): 
            os.remove(path_a)
            
        # 3. Remove the generated Visual file (if exists)
        if path_b and path_b != temp_path and os.path.exists(path_b): 
            os.remove(path_b)
            
        # 4. Clean up Google Storage
        for f in files_to_upload: 
            try:
                genai.delete_file(f.name)
            except: pass
            
        print("✅ Done!")

    except Exception as e:
        print(f"❌ Worker Error: {str(e)}")
    finally:
        db.close() # CRITICAL: Close session