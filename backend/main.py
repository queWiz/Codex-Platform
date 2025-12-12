from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
import models
from database import engine, get_db
import boto3
from botocore.exceptions import NoCredentialsError
import os
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from botocore.config import Config

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION START ---
region = os.getenv("AWS_REGION")

# 1. Force the correct Regional URL
endpoint_url = f"https://s3.{region}.amazonaws.com"

# 2. Configure Signature Version 4 (Required for Presigned URLs)
my_config = Config(
    region_name=region,
    signature_version='s3v4'
)

# 3. Create the Client ONCE (and do not overwrite it later)
s3_client = boto3.client(
    's3',
    endpoint_url=endpoint_url,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    config=my_config
)
# --- CONFIGURATION END ---

@app.get("/")
def read_root():
    return {"message": "Codex API is running"}
    
@app.get("/videos/")
def read_videos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    videos = db.query(models.Video).offset(skip).limit(limit).all()
    return videos

class VideoCreate(BaseModel):
    filename: str
    content_type: str

@app.post("/videos/presigned-url")
def generate_presigned_url(video: VideoCreate, db: Session = Depends(get_db)):
    bucket_name = os.getenv("AWS_BUCKET_NAME")
    object_name = f"raw/{video.filename}"
    
    try:
        # Generate the URL
        url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': object_name,
                'ContentType': video.content_type
            },
            ExpiresIn=3600
        )
        return {"url": url, "key": object_name}
    except NoCredentialsError:
        return {"error": "AWS Credentials not available"}