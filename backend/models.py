from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    s3_key = Column(String, unique=True, index=True) # path in S3 bucket
    user_id = Column(String, index=True) # From Clerk Auth
    
    # Processing Status
    processed = Column(Boolean, default=False)
    transcript_generated = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())