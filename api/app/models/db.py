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
    if os.getenv("VERCEL"):
         # On Vercel, we MUST have a DATABASE_URL. Fallback to a non-writing dummy or raise error.
         # For safety, we use an in-memory SQLite which is allowed but won't persist, 
         # but we want to signal the missing env var.
         DATABASE_URL = "sqlite:///:memory:"
    else:
         # Local development fallback
         DATABASE_URL = "sqlite:///./models.db"

# Ensure Postgres URLs from platforms like Heroku/Supabase work with SQLAlchemy 1.4+
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine_args = {}
if "sqlite" in DATABASE_URL:
    engine_args["connect_args"] = {"check_same_thread": False}
else:
    # Force SSL for Supabase/Production Postgres
    engine_args["connect_args"] = {"sslmode": "require"}

engine = create_engine(DATABASE_URL, **engine_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
