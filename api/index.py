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

app = FastAPI(title="Universal Computation Sandbox API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    except Exception as e:
        print(f"Startup DB Error: {e}")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    print(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server Error: {str(exc)}"},
        headers={"Access-Control-Allow-Origin": "*"}
    )

from pydantic import ValidationError

# Use both /api/ and / prefixes to be ultra-safe with Vercel rewrites
@app.get("/api")
@app.get("/")
def read_root():
    return {"status": "online", "message": "Stateless Engine Active"}

@app.post("/api/models")
@app.post("/models")
def save_model(model_data: Dict[str, Any], db: Session = Depends(get_db)):
    try:
        model_id = model_data.get("id")
        user_id = model_data.get("user_id")
        if model_id and not str(model_id).startswith("model_"):
            db_model = db.query(ComputationModel).filter(ComputationModel.id == int(model_id)).first()
            if db_model:
                db_model.name = model_data.get("name")
                db_model.definition = model_data.get("definition")
                db.commit()
                return db_model
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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/models")
@app.get("/models")
def list_models(user_id: str = None, db: Session = Depends(get_db)):
    try:
        query = db.query(ComputationModel)
        if user_id:
            query = query.filter(ComputationModel.user_id == user_id)
        return query.all()
    except Exception as e:
        return []

@app.post("/api/simulate")
@app.post("/simulate")
def simulate(payload: Dict[str, Any], db: Session = Depends(get_db)):
    input_string = payload.get("input_string", "")
    dfn = payload.get("definition")
    m_type = payload.get("type")
    
    if not dfn or not m_type:
        model_id = payload.get("model_id")
        if not model_id: raise HTTPException(status_code=400, detail="Missing definition")
        db_model = db.query(ComputationModel).filter(ComputationModel.id == int(model_id)).first()
        if not db_model: raise HTTPException(status_code=404, detail="Not found")
        m_type, dfn = db_model.type, db_model.definition

    try:
        if m_type == "DFA": return SimulationEngine.simulate_dfa(DFADefinition(**dfn), input_string)
        if m_type == "NFA": return SimulationEngine.simulate_nfa(NFADefinition(**dfn), input_string)
        if m_type == "TM": return SimulationEngine.simulate_tm(TMDefinition(**dfn), input_string)
        if m_type == "PDA": return SimulationEngine.simulate_pda(PDADefinition(**dfn), input_string)
        raise HTTPException(status_code=400, detail=f"Type {m_type} not supported")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/convert")
@app.post("/convert")
def convert(payload: Dict[str, Any], db: Session = Depends(get_db)):
    target_type = payload.get("target_type", "").upper()
    dfn = payload.get("definition")
    m_type = payload.get("source_type")
    
    if not dfn or not m_type:
        source_id = payload.get("source_model_id")
        if not source_id: raise HTTPException(status_code=400, detail="Missing definition")
        db_model = db.query(ComputationModel).filter(ComputationModel.id == int(source_id)).first()
        if not db_model: raise HTTPException(status_code=404, detail="Not found")
        m_type, dfn = db_model.type, db_model.definition
    
    try:
        if m_type == "NFA" and target_type == "DFA":
            return ConversionEngine.nfa_to_dfa(NFADefinition(**dfn)).dict()
        if m_type == "CFG" and target_type == "PDA":
            return ConversionEngine.cfg_to_pda(CFGDefinition(**dfn)).dict()
        if m_type == "DFA" and target_type == "REGEX":
            return {"regex": ConversionEngine.dfa_to_regex(DFADefinition(**dfn))}
        if m_type == "PDA" and target_type == "CFG":
            return ConversionEngine.pda_to_cfg(PDADefinition(**dfn)).dict()
        raise HTTPException(status_code=400, detail=f"Conversion {m_type}->{target_type} not supported")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/utm")
@app.post("/utm")
def run_utm(payload: Dict[str, Any]):
    try:
        return UTMEngine.run_utm(TMDefinition(**payload.get("machine_definition")), payload.get("input_string", ""))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/decidability")
@app.post("/decidability")
def analyze_decidability(payload: Dict[str, Any]):
    return DecidabilityEngine.analyze(payload.get("problem_type"))

@app.post("/api/complexity")
@app.post("/complexity")
def analyze_complexity(payload: Dict[str, Any], db: Session = Depends(get_db)):
    try:
        dfn = payload.get("definition")
        m_type = payload.get("type")
        if not dfn:
            db_model = db.query(ComputationModel).filter(ComputationModel.id == int(payload.get("model_id"))).first()
            m_type, dfn = db_model.type, db_model.definition
        res = SimulationEngine.simulate_tm(TMDefinition(**dfn), payload.get("input_string", ""))
        return ComplexityEngine.analyze_complexity(res["steps"], len(res.get("tape", "")), len(payload.get("input_string", "")))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
