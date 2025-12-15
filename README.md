# 🧠 Codex: The AI-Powered Second Brain for Your Video Library

> **Codex is a full-stack, multimodal AI search engine that transforms a chaotic library of video lectures and meetings into a queryable knowledge base. Users can ask questions in natural language and jump to the exact timestamp where a concept was discussed or shown on screen.**

🔴 **[\[Live Demo Link Here\]](https://codex-platform.vercel.app)** 

---

## ✨ Key Features

*   **🧠 Multimodal Semantic Search:** Go beyond keyword matching. Search for concepts, and Codex will find matches in both the spoken audio and the visual content (like text on a slide or code in an editor).
*   **⚡ Smart Timestamps:** Don't just find the right video, find the right **moment**. Search results with a direct chapter match allow you to jump instantly to the relevant section.
*   **🎞️ Adaptive Ingestion Pipeline:** Upload videos of any length. The backend intelligently analyzes the file and, for long videos (>45 mins), uses a custom **"Synced Slideshow"** strategy to compress the visual data, ensuring it fits within AI token limits while retaining full context.
*   **🎥 Live Video Previews:** Hover over a search result to see a silent, auto-playing preview of the video content.
*   **📊 Self-Healing AI Processing:** The system is built to be resilient. If the AI returns malformed data, a retry loop with an adaptive prompt automatically attempts to fix it.

---

## 🛠️ Tech Stack

| Component            | Technology                                           | Role                                                    |
| :------------------- | :--------------------------------------------------- | :------------------------------------------------------ |
| **Frontend**         | Next.js, React, TypeScript, Tailwind CSS, Framer Motion | A responsive, polished UI with complex state and animations. |
| **Backend**          | Python, FastAPI                                      | High-performance API for search, uploads, and AI tasks.   |
| **AI (Multimodal)**  | Google Gemini 1.5 Flash / Pro                        | Analysis of video/audio streams for summarization & chapters. |
| **Vector Search**    | `pgvector` on PostgreSQL (Neon)                      | Storing and querying vector embeddings for semantic search. |
| **Data Processing**  | FFmpeg (via `subprocess`)                            | The core engine for the "Synced Slideshow" optimization.  |
| **File Storage**     | AWS S3                                               | Scalable storage for large video files.                 |
| **Database**         | PostgreSQL (Neon)                                    | Storing relational metadata (users, videos, etc.).      |
| **Deployment**       | Vercel (Frontend), Render (Backend)                  | CI/CD pipeline for seamless updates.                    |

---

## 🧠 Technical Challenges & Solutions

This project went beyond a simple API wrapper and required solving several complex engineering problems:

### 1. Challenge: Exceeding AI Token Limits on Long Videos

A 2-hour video has over 200,000 frames, which would cost millions of tokens to analyze visually. My initial attempts at naive downsampling or sending separate audio/video streams resulted in token overflows or inaccurate, "hallucinated" timestamps from the AI.

**Solution: The "Synced Slideshow" Architecture.**
I engineered a pre-processing pipeline in Python using raw **FFmpeg**. For long videos, it creates a new, single video file where:
1.  The **audio track remains complete**.
2.  The **video track is aggressively downsampled** to ~1 frame every 10 seconds.
3.  Crucially, both tracks are **time-compressed** into a shorter duration (e.g., a 2-hour video becomes 12 minutes long).

The AI analyzes this small file, and the timestamps it generates are then mathematically scaled back up (e.g., `4:00 * 10 = 40:00`). This retained full visual context for a fraction of the token cost and guaranteed perfect timestamp accuracy.

### 2. Challenge: Unreliable AI JSON Output

The AI would occasionally return malformed JSON (e.g., with un-escaped quotes or extra characters), which would crash the Python backend.

**Solution: A Self-Healing Retry Loop.**
I wrapped the AI call in a loop that attempts to parse the JSON output. If it fails:
1.  It logs the invalid output for debugging.
2.  It appends a "correction" to the prompt: *"Your previous response was not valid JSON. Please try again and strictly follow all formatting rules."*
3.  It re-sends the request. This "scolds" the AI into compliance, making the pipeline resilient to intermittent model errors.

### 3. Challenge: Database Timeouts During Video Processing

Video processing in the background could take 10+ minutes, causing the initial PostgreSQL connection from the API request to time out and crash when the worker tried to save the final result.

**Solution: Just-In-Time DB Connections.**
I refactored the architecture to completely decouple the worker from the API's database session. The background task now runs without a DB connection and only opens a fresh, short-lived session at the very end of the process, just for the 1-second write operation. This eliminated all timeout errors.

---

## 📦 Local Development

**Prerequisites:** Node.js 18+, Python 3.9+, FFmpeg (installed locally).

1.  **Clone the repo.**
2.  **Backend:**
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    # Create a .env file and add your keys
    uvicorn main:app --reload
    ```
3.  **Frontend:**
    ```bash
    cd frontend
    npm install
    # Create a .env.local file and add your keys
    npm run dev
    ```