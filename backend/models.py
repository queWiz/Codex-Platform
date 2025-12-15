from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from sqlalchemy.sql import func
from database import Base
from pgvector.sqlalchemy import Vector

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    s3_key = Column(String, unique=True, index=True) # path in S3 bucket
    user_id = Column(String, index=True) # From Clerk Auth
    
    # AI Processing Status
    processed = Column(Boolean, default=False)
    
    # --- 1. THE CONTENT ---
    # The detailed spoken content (Audio)
    transcript_summary = Column(Text, nullable=True) 
    
    # What was shown on screen? (Visuals - Critical for "Tabayyun" vibes)
    visual_summary = Column(Text, nullable=True) 
    
    # --- 2. THE STRUCTURE ---
    # [{"timestamp": "02:15", "label": "Live Coding"}]
    chapters = Column(JSON, nullable=True) 
    
    # --- 3. THE METADATA ---
    # ["React", "Hooks", "Frontend", "Tutorial"] - Great for UI filters
    tags = Column(JSON, nullable=True) 
    
    # --- 4. THE BRAIN ---
    # Vector embedding of ALL the above combined
    embedding = Column(Vector(768)) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())