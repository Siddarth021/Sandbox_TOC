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
from typing import Dict, Any, List, Union
import os

app = FastAPI(title="Computation Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency (only for endpoints that need DB)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from fastapi.responses import JSONResponse
from starlette.requests import Request

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Engine Error: {str(exc)}"},
        headers={"Access-Control-Allow-Origin": "*"}
    )

def canonicalize(dfn: Dict, m_type: str) -> Dict:
    if not dfn or "transitions" not in dfn: return dfn
    trans = dfn["transitions"]
    if isinstance(trans, dict): return dfn
    
    obj = {}
    for t in trans:
        f, s, to = t.get("from"), t.get("symbol") or t.get("read"), t.get("target") or t.get("next")
        if f is None or s is None: continue
        if f not in obj: obj[f] = {}
        if m_type == "NFA":
            if s not in obj[f]: obj[f][s] = []
            obj[f][s].append(to)
        elif m_type == "TM":
            obj[f][s] = { "next": to, "write": t.get("write", s), "move": t.get("move", "R") }
        else: obj[f][s] = to
    dfn["transitions"] = obj
    return dfn

@app.get("/api")
@app.get("/")
def health():
    return {"status": "ready"}

@app.post("/api/convert")
@app.post("/convert")
def convert(payload: Dict[str, Any]):
    target = payload.get("target_type", "").upper()
    dfn = payload.get("definition")
    m_type = payload.get("source_type")
    
    if not dfn: raise HTTPException(status_code=400, detail="No definition provided")
    dfn = canonicalize(dfn, m_type)
    
    try:
        if m_type == "NFA" and target == "DFA":
            return ConversionEngine.nfa_to_dfa(NFADefinition(**dfn)).dict()
        if m_type == "CFG" and target == "PDA":
            return ConversionEngine.cfg_to_pda(CFGDefinition(**dfn)).dict()
        if m_type == "DFA" and target == "REGEX":
            return {"regex": ConversionEngine.dfa_to_regex(DFADefinition(**dfn))}
        if m_type == "PDA" and target == "CFG":
            return ConversionEngine.pda_to_cfg(PDADefinition(**dfn)).dict()
        raise HTTPException(status_code=400, detail="Conversion not supported")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/simulate")
@app.post("/simulate")
def simulate(payload: Dict[str, Any]):
    dfn = payload.get("definition")
    m_type = payload.get("type")
    input_str = payload.get("input_string", "")
    
    if not dfn: raise HTTPException(status_code=400, detail="No definition")
    dfn = canonicalize(dfn, m_type)
    
    try:
        if m_type == "DFA": return SimulationEngine.simulate_dfa(DFADefinition(**dfn), input_str)
        if m_type == "NFA": return SimulationEngine.simulate_nfa(NFADefinition(**dfn), input_str)
        if m_type == "TM": return SimulationEngine.simulate_tm(TMDefinition(**dfn), input_str)
        if m_type == "PDA": return SimulationEngine.simulate_pda(PDADefinition(**dfn), input_str)
        raise HTTPException(status_code=400, detail="Type not supported")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/models")
@app.post("/models")
def save_model(model_data: Dict[str, Any], db: Session = Depends(get_db)):
    try:
        db_model = ComputationModel(
            name=model_data.get("name"),
            type=model_data.get("type"),
            definition=model_data.get("definition"),
            user_id=model_data.get("user_id")
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
        if user_id: query = query.filter(ComputationModel.user_id == user_id)
        return query.all()
    except: return []

@app.post("/api/utm")
@app.post("/utm")
def utm(payload: Dict[str, Any]):
    dfn = canonicalize(payload.get("machine_definition"), "TM")
    return UTMEngine.run_utm(TMDefinition(**dfn), payload.get("input_string", ""))

@app.post("/api/decidability")
@app.post("/decidability")
def decidability(payload: Dict[str, Any]):
    return DecidabilityEngine.analyze(payload.get("problem_type"))

@app.post("/api/complexity")
@app.post("/complexity")
def complexity(payload: Dict[str, Any]):
    dfn = canonicalize(payload.get("definition"), "TM")
    res = SimulationEngine.simulate_tm(TMDefinition(**dfn), payload.get("input_string", ""))
    return ComplexityEngine.analyze_complexity(res["steps"], len(res.get("tape", "")), len(payload.get("input_string", "")))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
