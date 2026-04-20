from typing import List, Dict, Any, Union
from ..schemas.models import DFADefinition, NFADefinition, TMDefinition, PDADefinition, CFGDefinition

class SimulationEngine:
    @staticmethod
    def simulate_dfa(dfa: DFADefinition, input_string: str):
        current_state = dfa.start_state
        path = [current_state]
        
        for symbol in input_string:
            if symbol not in dfa.alphabet:
                return {"accepted": False, "error": f"Symbol {symbol} not in alphabet", "steps": len(path) - 1}
            
            if current_state not in dfa.transitions or symbol not in dfa.transitions[current_state]:
                return {"accepted": False, "error": "No transition found", "steps": len(path) - 1}
            
            current_state = dfa.transitions[current_state][symbol]
            path.append(current_state)
            
        accepted = current_state in dfa.accept_states
        return {
            "accepted": accepted,
            "steps": len(path) - 1,
            "final_state": current_state,
            "path": path
        }

    @staticmethod
    def simulate_nfa(nfa: NFADefinition, input_string: str):
        current_states = {nfa.start_state}
        path = [list(current_states)]
        
        for symbol in input_string:
            next_states = set()
            for state in current_states:
                if state in nfa.transitions and symbol in nfa.transitions[state]:
                    for next_state in nfa.transitions[state][symbol]:
                        next_states.add(next_state)
            current_states = next_states
            path.append(list(current_states))
            if not current_states:
                break
                
        accepted = any(state in nfa.accept_states for state in current_states)
        return {
            "accepted": accepted,
            "final_states": list(current_states),
            "path": path
        }

    @staticmethod
    def simulate_tm(tm: TMDefinition, input_string: str, max_steps: int = 1000):
        tape = list(input_string) if input_string else ["_"]
        head = 0
        current_state = tm.start_state
        steps = 0
        path = [current_state]
        
        while steps < max_steps:
            if current_state == tm.accept_state:
                return {"accepted": True, "steps": steps, "tape": "".join(tape), "head": head, "path": path}
            
            symbol = tape[head] if head < len(tape) else "_"
            
            if current_state not in tm.transitions or symbol not in tm.transitions[current_state]:
                return {"accepted": False, "steps": steps, "tape": "".join(tape), "head": head, "halted": True, "path": path}
            
            trans = tm.transitions[current_state][symbol]
            
            symbol_to_write = trans.get("write", symbol)
            if head < len(tape):
                tape[head] = symbol_to_write
            else:
                tape.append(symbol_to_write)
            
            move = trans.get("move", "R")
            if move == "R":
                head += 1
                if head == len(tape):
                    tape.append("_")
            elif move == "L":
                head = max(0, head - 1)
            
            current_state = trans.get("next", current_state)
            path.append(current_state)
            steps += 1
            
        return {"accepted": False, "steps": steps, "error": "Max steps reached", "timeout": True, "path": path}

    @staticmethod
    def simulate_pda(pda: PDADefinition, input_string: str, max_steps: int = 2000):
        # State: (current_state, remaining_input, stack, path)
        initial_stack = (pda.start_stack_symbol,)
        nodes = [(pda.start_state, input_string, initial_stack, [pda.start_state])]
        steps = 0
        
        # We'll return the first accepting path found
        while nodes and steps < max_steps:
            new_nodes = []
            for state, remaining_input, stack, path in nodes:
                if not remaining_input and state in pda.accept_states:
                    return {"accepted": True, "steps": steps, "path": path}
                
                symbol = remaining_input[0] if remaining_input else None
                
                for t in pda.transitions:
                    if t["from_state"] == state:
                        pop_sym = t["stack_pop"]
                        if stack and (pop_sym == "" or stack[-1] == pop_sym):
                            # Case 1: Consume symbol
                            if symbol and t["input_symbol"] == symbol:
                                new_stack = list(stack)
                                if pop_sym != "":
                                    new_stack.pop()
                                push_val = t["stack_push"]
                                if push_val != "":
                                    for char in reversed(push_val): # Handle multi-char push
                                        new_stack.append(char)
                                new_nodes.append((t["to_state"], remaining_input[1:], tuple(new_stack), path + [t["to_state"]]))
                            
                            # Case 2: Epsilon transition
                            if t["input_symbol"] == "":
                                new_stack = list(stack)
                                if pop_sym != "":
                                    new_stack.pop()
                                push_val = t["stack_push"]
                                if push_val != "":
                                    for char in reversed(push_val):
                                        new_stack.append(char)
                                new_nodes.append((t["to_state"], remaining_input, tuple(new_stack), path + [t["to_state"]]))
            
            nodes = new_nodes[:50] # Branching limit
            steps += 1
            
        # If no accepting path, return one possible path or the start state
        if nodes:
            return {"accepted": False, "steps": steps, "path": nodes[0][3]}
        else:
            return {"accepted": False, "steps": steps, "path": [pda.start_state]}
