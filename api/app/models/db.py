import os
from sqlalchemy import Column, Integer, String, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class ComputationModel(Base):
    __tablename__ = "computation_models"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String) # DFA, NFA, PDA, TM, CFG
    definition = Column(JSON)
    user_id = Column(String, index=True) # Clerk User ID

# Production Database (Supabase / Vercel Postgres)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Use a persistent local file if possible, or in-memory for Vercel
    if os.getenv("VERCEL"):
         DATABASE_URL = "sqlite:///:memory:"
         print("WARNING: Using in-memory SQLite on Vercel. Data will not persist across restarts.")
    else:
         DATABASE_URL = "sqlite:///./models.db"
         print(f"Using local SQLite: {DATABASE_URL}")

# Normalize postgres URL for SQLAlchemy 1.4+
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine_args = {}
if "sqlite" in DATABASE_URL:
    engine_args["connect_args"] = {"check_same_thread": False}
else:
    # Production PostgreSQL (Supabase/Vercel)
    # Using psycopg2 driver explicitly and requiring SSL
    if "postgresql" in DATABASE_URL and "sslmode" not in DATABASE_URL:
        engine_args["connect_args"] = {"sslmode": "require"}

try:
    engine = create_engine(DATABASE_URL, **engine_args)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    print(f"Database engine created for: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'local'}")
except Exception as e:
    print(f"CRITICAL: Failed to create database engine: {e}")
    # Fallback to in-memory to prevent complete crash of the serverless function
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        print("Schema ensured.")
    except Exception as e:
        print(f"Schema creation failed: {e}")
        raise e
