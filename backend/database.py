from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# --- THE FIX: ROBUST CONNECTION SETTINGS ---
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    # 1. Check if connection is alive before using it (Fixes SSL Closed error)
    pool_pre_ping=True, 
    # 2. Recycle connections every 30 minutes to prevent stale timeouts
    pool_recycle=1800,
    # 3. Size of the connection pool
    pool_size=10,
    # 4. Allow temporary spikes in connections
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()