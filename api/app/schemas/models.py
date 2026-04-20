from pydantic import BaseModel, Field
from typing import Dict, List, Set, Union, Optional

class DFADefinition(BaseModel):
    states: List[str]
    alphabet: List[str]
    start_state: str
    accept_states: List[str]
    transitions: Dict[str, Dict[str, str]]

class NFADefinition(BaseModel):
    states: List[str]
    alphabet: List[str]
    start_state: str
    accept_states: List[str]
    transitions: Dict[str, Dict[str, List[str]]]  # State -> Symbol -> List of next states

class PDADefinition(BaseModel):
    states: List[str]
    alphabet: List[str]
    stack_alphabet: List[str]
    start_state: str
    start_stack_symbol: str
    accept_states: List[str]
    transitions: List[Dict]  # List of {from_state, input_symbol, stack_pop, to_state, stack_push}

class TMDefinition(BaseModel):
    states: List[str]
    alphabet: List[str]
    tape_symbols: List[str]
    start_state: str
    accept_state: str
    transitions: Dict[str, Dict[str, Dict[str, str]]]  # state -> symbol -> {write, move, next}

class CFGDefinition(BaseModel):
    terminals: List[str]
    non_terminals: List[str]
    start_symbol: str
    productions: Dict[str, List[str]]  # Non-terminal -> List of strings
