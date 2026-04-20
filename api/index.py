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
from typing import Dict, Any

app = FastAPI(title="Universal Computation Sandbox API")

# CORS
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
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

from fastapi import APIRouter
from pydantic import ValidationError

api_router = APIRouter(prefix="/api")

@api_router.get("/")
def read_root():
    from app.models.db import DATABASE_URL
    db_status = "Connected" if "postgresql" in DATABASE_URL else "FALLBACK (MISSING DATABASE_URL)"
    return {
        "message": "Welcome to the Universal Computation Sandbox API",
        "database": db_status
    }

@api_router.post("/models")
def save_model(model_data: Dict[str, Any], db: Session = Depends(get_db)):
    model_id = model_data.get("id")
    user_id = model_data.get("user_id")
    
    if model_id:
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

@api_router.get("/models")
def list_models(user_id: str = None, db: Session = Depends(get_db)):
    query = db.query(ComputationModel)
    if user_id:
        query = query.filter(ComputationModel.user_id == user_id)
    return query.all()

@api_router.post("/simulate")
def simulate(payload: Dict[str, Any], db: Session = Depends(get_db)):
    model_id = payload.get("model_id")
    input_string = payload.get("input_string", "")
    user_id = payload.get("user_id")
    
    # Check if we have an inline definition (for unsaved simulations)
    inline_def = payload.get("definition")
    m_type = payload.get("type")
    
    if inline_def and m_type:
        dfn = inline_def
    else:
        if not model_id:
            raise HTTPException(status_code=400, detail="Missing model_id or inline definition")
        db_model = db.query(ComputationModel).filter(ComputationModel.id == int(model_id)).first()
        if not db_model:
            raise HTTPException(status_code=404, detail="Model not found")
        if db_model.user_id and db_model.user_id != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized access to this model")
        m_type = db_model.type
        dfn = db_model.definition
    
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

@api_router.post("/convert")
def convert(payload: Dict[str, Any], db: Session = Depends(get_db)):
    source_id = payload.get("source_model_id")
    target_type = payload.get("target_type", "").upper()
    
    db_model = db.query(ComputationModel).filter(ComputationModel.id == int(source_id)).first()
    if not db_model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    try:
        if db_model.type == "NFA" and target_type == "DFA":
            result = ConversionEngine.nfa_to_dfa(NFADefinition(**db_model.definition))
            return result.dict()
        elif db_model.type == "CFG" and target_type == "PDA":
            result = ConversionEngine.cfg_to_pda(CFGDefinition(**db_model.definition))
            return result.dict()
        elif db_model.type == "DFA" and target_type == "REGEX":
            result = ConversionEngine.dfa_to_regex(DFADefinition(**db_model.definition))
            return {"regex": result}
        elif db_model.type == "PDA" and target_type == "CFG":
            result = ConversionEngine.pda_to_cfg(PDADefinition(**db_model.definition))
            return result.dict()
    except ValidationError as e:
         raise HTTPException(status_code=400, detail=f"Invalid source model definition: {str(e)}")
    
    raise HTTPException(status_code=400, detail=f"Conversion from {db_model.type} to {target_type} is not supported.")

@api_router.post("/utm")
def run_utm(payload: Dict[str, Any]):
    machine_def = payload.get("machine_definition")
    input_string = payload.get("input_string", "")
    return UTMEngine.run_utm(TMDefinition(**machine_def), input_string)

@api_router.post("/decidability")
def analyze_decidability(payload: Dict[str, Any]):
    problem_type = payload.get("problem_type")
    return DecidabilityEngine.analyze(problem_type)

@api_router.post("/complexity")
def analyze_complexity(payload: Dict[str, Any], db: Session = Depends(get_db)):
    model_id = payload.get("model_id")
    input_string = payload.get("input_string", "")
    user_id = payload.get("user_id")
    
    db_model = db.query(ComputationModel).filter(ComputationModel.id == int(model_id)).first()
    if not db_model or db_model.type != "TM":
        raise HTTPException(status_code=400, detail="Complexity analysis currently optimized for TM")

    if db_model.user_id and db_model.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this model")
    
    res = SimulationEngine.simulate_tm(TMDefinition(**db_model.definition), input_string)
    return ComplexityEngine.analyze_complexity(res["steps"], len(res.get("tape", "")), len(input_string))

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
