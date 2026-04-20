from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.models.db import SessionLocal, init_db, ComputationModel
from app.schemas.models import DFADefinition, NFADefinition, TMDefinition, PDADefinition, CFGDefinition
from app.engines.simulation_engine import SimulationEngine
from app.engines.conversion_engine import ConversionEngine
from app.engines.utm_engine import UTMEngine
from app.engines.decidability_engine import DecidabilityEngine
from app.engines.complexity_engine import ComplexityEngine
from typing import Dict, Any, List
import os

# root_path handles the /api prefix from Vercel's rewrite rule
app = FastAPI(title="Universal Computation Sandbox API", root_path="/api")

# CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from fastapi.responses import JSONResponse
from starlette.requests import Request

@app.on_event("startup")
def startup():
    try:
        init_db()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Database initialization failed: {e}")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    print(traceback.format_exc()) # Log to Vercel console
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
        headers={"Access-Control-Allow-Origin": "*"}
    )

from fastapi import APIRouter
from pydantic import ValidationError

# Define routes without /api prefix because root_path handles it
api_router = APIRouter()

@api_router.get("/")
def read_root():
    from app.models.db import DATABASE_URL
    db_status = "Connected" if DATABASE_URL and "postgresql" in DATABASE_URL else "SQLITE_FALLBACK"
    return {
        "message": "Universal Computation Sandbox API Online",
        "database": db_status,
        "env": "Production" if os.getenv("VERCEL") else "Local"
    }

@api_router.get("/debug")
def debug_info():
    db_url = os.getenv("DATABASE_URL", "NOT_SET")
    censored_url = db_url.split("@")[-1] if "@" in db_url else "HIDDEN"
    return {
        "database_url_host": censored_url,
        "python_path": os.sys.path[:5],
        "cwd": os.getcwd()
    }

@api_router.post("/models")
def save_model(model_data: Dict[str, Any], db: Session = Depends(get_db)):
    try:
        model_id = model_data.get("id")
        user_id = model_data.get("user_id")
        
        # Validation
        if not model_data.get("name") or not model_data.get("type"):
            raise HTTPException(status_code=400, detail="Missing name or type")

        if model_id and not str(model_id).startswith("model_"):
            try:
                db_model = db.query(ComputationModel).filter(ComputationModel.id == int(model_id)).first()
                if db_model:
                    if db_model.user_id and db_model.user_id != user_id:
                        raise HTTPException(status_code=403, detail="Unauthorized")
                    db_model.name = model_data.get("name")
                    db_model.definition = model_data.get("definition")
                    db.commit()
                    db.refresh(db_model)
                    return db_model
            except (ValueError, TypeError):
                 pass

        db_model = ComputationModel(
            name=model_data.get("name"),
            type=model_data.get("type"),
            definition=model_data.get("definition"),
            user_id=user_id
        )
        db.add(db_model)
        db.commit()
        db.refresh(db_model)
        return db_model
    except Exception as e:
        print(f"Error in save_model: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database operational error: {str(e)}")

@api_router.get("/models")
def list_models(user_id: str = None, db: Session = Depends(get_db)):
    try:
        query = db.query(ComputationModel)
        if user_id:
            query = query.filter(ComputationModel.user_id == user_id)
        return query.all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(e)}")

@api_router.post("/simulate")
def simulate(payload: Dict[str, Any], db: Session = Depends(get_db)):
    model_id = payload.get("model_id")
    input_string = payload.get("input_string", "")
    user_id = payload.get("user_id")
    
    inline_def = payload.get("definition")
    m_type = payload.get("type")
    
    if inline_def and m_type:
        dfn = inline_def
    else:
        if not model_id:
            raise HTTPException(status_code=400, detail="Missing model_id or inline definition")
        try:
            db_model = db.query(ComputationModel).filter(ComputationModel.id == int(model_id)).first()
            if not db_model:
                raise HTTPException(status_code=404, detail="Model not found")
            m_type = db_model.type
            dfn = db_model.definition
        except Exception as e:
             raise HTTPException(status_code=500, detail=f"DB Error: {str(e)}")
    
    try:
        if m_type == "DFA":
            return SimulationEngine.simulate_dfa(DFADefinition(**dfn), input_string)
        elif m_type == "NFA":
            return SimulationEngine.simulate_nfa(NFADefinition(**dfn), input_string)
        elif m_type == "TM":
            return SimulationEngine.simulate_tm(TMDefinition(**dfn), input_string)
        elif m_type == "PDA":
            return SimulationEngine.simulate_pda(PDADefinition(**dfn), input_string)
        else:
            raise HTTPException(status_code=400, detail=f"Simulation not supported for type {m_type}")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"Invalid {m_type} definition: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation logic crash: {str(e)}")

@api_router.post("/convert")
def convert(payload: Dict[str, Any], db: Session = Depends(get_db)):
    source_id = payload.get("source_model_id")
    target_type = payload.get("target_type", "").upper()
    
    # Support stateless conversion with inline definition
    inline_def = payload.get("definition")
    source_type = payload.get("source_type")
    
    if inline_def and source_type:
        m_type = source_type
        dfn = inline_def
    else:
        if not source_id:
            raise HTTPException(status_code=400, detail="Missing source_model_id or inline definition")
        try:
            db_model = db.query(ComputationModel).filter(ComputationModel.id == int(source_id)).first()
            if not db_model:
                raise HTTPException(status_code=404, detail="Source model not found")
            m_type = db_model.type
            dfn = db_model.definition
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database Access Error: {str(e)}")
    
    try:
        if m_type == "NFA" and target_type == "DFA":
            result = ConversionEngine.nfa_to_dfa(NFADefinition(**dfn))
            return result.dict()
        elif m_type == "CFG" and target_type == "PDA":
            result = ConversionEngine.cfg_to_pda(CFGDefinition(**dfn))
            return result.dict()
        elif m_type == "DFA" and target_type == "REGEX":
            result = ConversionEngine.dfa_to_regex(DFADefinition(**dfn))
            return {"regex": result}
        elif m_type == "PDA" and target_type == "CFG":
            result = ConversionEngine.pda_to_cfg(PDADefinition(**dfn))
            return result.dict()
    except ValidationError as e:
         raise HTTPException(status_code=400, detail=f"Invalid source model: {str(e)}")
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")
    
    raise HTTPException(status_code=400, detail=f"Conversion from {m_type} to {target_type} is not supported.")

@api_router.post("/utm")
def run_utm(payload: Dict[str, Any]):
    try:
        machine_def = payload.get("machine_definition")
        input_string = payload.get("input_string", "")
        return UTMEngine.run_utm(TMDefinition(**machine_def), input_string)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/decidability")
def analyze_decidability(payload: Dict[str, Any]):
    try:
        problem_type = payload.get("problem_type")
        return DecidabilityEngine.analyze(problem_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/complexity")
def analyze_complexity(payload: Dict[str, Any], db: Session = Depends(get_db)):
    try:
        model_id = payload.get("model_id")
        input_string = payload.get("input_string", "")
        user_id = payload.get("user_id")
        
        # Support stateless
        inline_def = payload.get("definition")
        m_type = payload.get("type")

        if inline_def and m_type:
             dfn = inline_def
        else:
            db_model = db.query(ComputationModel).filter(ComputationModel.id == int(model_id)).first()
            if not db_model:
                raise HTTPException(status_code=400, detail="Complexity analysis requires a TM model")
            m_type = db_model.type
            dfn = db_model.definition

        if m_type != "TM":
             raise HTTPException(status_code=400, detail="Complexity analysis currently optimized for TM")
        
        res = SimulationEngine.simulate_tm(TMDefinition(**dfn), input_string)
        return ComplexityEngine.analyze_complexity(res["steps"], len(res.get("tape", "")), len(input_string))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
