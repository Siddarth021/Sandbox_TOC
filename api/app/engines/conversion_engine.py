from ..schemas.models import NFADefinition, DFADefinition, CFGDefinition, PDADefinition
from typing import Dict, List, Set, Tuple

class ConversionEngine:
    @staticmethod
    def nfa_to_dfa(nfa: NFADefinition) -> DFADefinition:
        # Power-set construction
        start_state_set = frozenset([nfa.start_state])
        # Note: In a real NFA, you'd also include epsilon closure here if supported.
        # Our NFA schema doesn't explicitly have epsilon transitions in alphabet, 
        # but let's assume if "" is in transitions, it's epsilon.
        
        def get_epsilon_closure(states: Set[str]) -> Set[str]:
            closure = set(states)
            stack = list(states)
            while stack:
                s = stack.pop()
                if s in nfa.transitions and "" in nfa.transitions[s]:
                    for next_s in nfa.transitions[s][""]:
                        if next_s not in closure:
                            closure.add(next_s)
                            stack.append(next_s)
            return closure

        start_closure = frozenset(get_epsilon_closure({nfa.start_state}))
        dfa_states = {start_closure}
        unprocessed = [start_closure]
        dfa_transitions: Dict[str, Dict[str, str]] = {}
        
        state_to_name = {start_closure: f"S{0}"}
        name_count = 1
        
        while unprocessed:
            current_set = unprocessed.pop(0)
            current_name = state_to_name[current_set]
            dfa_transitions[current_name] = {}
            
            for symbol in nfa.alphabet:
                if symbol == "": continue
                
                next_set_raw = set()
                for nfa_s in current_set:
                    if nfa_s in nfa.transitions and symbol in nfa.transitions[nfa_s]:
                        for next_s in nfa.transitions[nfa_s][symbol]:
                            next_set_raw.add(next_s)
                
                if next_set_raw:
                    next_closure = frozenset(get_epsilon_closure(next_set_raw))
                    if next_closure not in dfa_states:
                        dfa_states.add(next_closure)
                        unprocessed.append(next_closure)
                        state_to_name[next_closure] = f"S{name_count}"
                        name_count += 1
                    
                    dfa_transitions[current_name][symbol] = state_to_name[next_closure]
                else:
                    # Trap state could be handled here
                    pass

        accept_states = [state_to_name[s] for s in dfa_states if any(sub_s in nfa.accept_states for sub_s in s)]
        
        return DFADefinition(
            states=list(state_to_name.values()),
            alphabet=nfa.alphabet,
            start_state=state_to_name[start_closure],
            accept_states=accept_states,
            transitions=dfa_transitions
        )

    @staticmethod
    def cfg_to_pda(cfg: CFGDefinition) -> PDADefinition:
        # Standard conversion to a single-state PDA
        pda_states = ["q_loop"]
        alphabet = cfg.terminals
        stack_alphabet = cfg.terminals + cfg.non_terminals + ["Z"] # Z is bottom
        
        transitions = []
        
        # Initial transition: pop Z, push Z and start symbol
        transitions.append({
            "from_state": "q_loop",
            "input_symbol": "",
            "stack_pop": "Z",
            "to_state": "q_loop",
            "stack_push": cfg.start_symbol + "Z" # Note: Schema needs to handle multi-push?
            # Let's simplify: Schema says stack_push is str. We'll interpret as string sequence.
        })
        
        # Productions: for each A -> alpha, transition from q_loop to q_loop popping A, pushing alpha
        for nt, rules in cfg.productions.items():
            for rule in rules:
                transitions.append({
                    "from_state": "q_loop",
                    "input_symbol": "",
                    "stack_pop": nt,
                    "to_state": "q_loop",
                    "stack_push": rule
                })
        
        # Terminals: for each a in terminals, transition popping a, consuming a
        for a in cfg.terminals:
            transitions.append({
                "from_state": "q_loop",
                "input_symbol": a,
                "stack_pop": a,
                "to_state": "q_loop",
                "stack_push": ""
            })

        return PDADefinition(
            states=pda_states,
            alphabet=alphabet,
            stack_alphabet=stack_alphabet,
            start_state="q_loop",
            start_stack_symbol="Z",
            accept_states=["q_loop"], # In empty stack PDA, accepting state doesn't really matter as much as empty stack, but here we use state.
            transitions=transitions
        )

    @staticmethod
    def simplify_regex(re: str) -> str:
        if not re or re == "∅" or re == "ε": return re
        
        # Iteratively apply core simplification rules
        prev = ""
        while prev != re:
            prev = re
            # 1. Double parentheses
            re = re.replace("((", "(").replace("))", ")")
            # 2. Epsilon identity
            re = re.replace("(ε)", "ε")
            re = re.replace("εε", "ε")
            re = re.replace("(ε)*", "ε")
            # 3. Concatenation with epsilon (simplified)
            import re as py_re
            re = py_re.sub(r'([^|()\[\]*])ε', r'\1', re)
            re = py_re.sub(r'ε([^|()\[\]*])', r'\1', re)
            # 4. Remove parentheses around single chars
            re = py_re.sub(r'\(([a-zA-Z0-9ε])\)', r'\1', re)
            # 5. Clean up around pipes
            re = re.replace("(ε)|", "|").replace("|(ε)", "|") if "|" in re else re.replace("ε", "") if len(re)>1 else re
            re = re.replace("||", "|").strip("|")
            
        return re if re else "ε"

    @staticmethod
    def dfa_to_regex(dfa: DFADefinition) -> str:
        states = list(dfa.states)
        start = dfa.start_state
        accepts = dfa.accept_states
        
        # GNFA construction
        R: Dict[str, Dict[str, str]] = {s1: {s2: "" for s2 in states + ["S", "A"]} for s1 in states + ["S", "A"]}
        
        for s1, trans in dfa.transitions.items():
            for sym, s2 in trans.items():
                if R[s1][s2]: R[s1][s2] += "|" + sym
                else: R[s1][s2] = sym
        
        R["S"][start] = "ε"
        for acc in accepts:
            R[acc]["A"] = "ε"
            
        def get_regex(s1, s2):
            val = R[s1][s2]
            return val if val else "∅"

        for k in states:
            for i in [s for s in states + ["S"] if s != k]:
                for j in [s for s in states + ["A"] if s != k]:
                    rik = get_regex(i, k)
                    rkk = get_regex(k, k)
                    rkj = get_regex(k, j)
                    rij = get_regex(i, j)
                    
                    if rik != "∅" and rkj != "∅":
                        # Rik Rkk* Rkj
                        term = f"({rik})"
                        if rkk != "∅":
                            term += f"({rkk})*"
                        term += f"({rkj})"
                        
                        if rij == "∅" or rij == "":
                            R[i][j] = term
                        else:
                            R[i][j] = f"({rij})|({term})"
            
        raw_res = R["S"]["A"] if R["S"]["A"] else "∅"
        return ConversionEngine.simplify_regex(raw_res)

    @staticmethod
    def pda_to_cfg(pda: PDADefinition) -> CFGDefinition:
        # Triplet method: Produces a lot of rules, but theoretically sounds
        # Variable: [q_i, A, q_j]
        non_terminals = ["S"]
        productions = {"S": []}
        
        states = pda.states
        stack_alphabet = pda.stack_alphabet
        
        # 1. Start rules: S -> [start_state, start_stack_symbol, q] for all q
        for q in states:
            var = f"[{pda.start_state},{pda.start_stack_symbol},{q}]"
            if var not in non_terminals: non_terminals.append(var)
            productions["S"].append(var)
            
        # 2. Transition rules
        for t in pda.transitions:
            p = t["from_state"]
            a = t["input_symbol"] if t["input_symbol"] else "ε"
            A = t["stack_pop"]
            q = t["to_state"]
            push = t["stack_push"]
            
            if not push: # Pop only: [p, A, q] -> a
                var = f"[{p},{A},{q}]"
                if var not in non_terminals: non_terminals.append(var)
                if var not in productions: productions[var] = []
                productions[var].append(a)
            else:
                # Push: A -> B1 B2 ... Bk
                # [p, A, q_k] -> a [q, B1, q1] [q1, B2, q2] ... [q_{k-1}, Bk, q_k]
                # For simplicity, we assume push is at most 2 symbols (standard PDA)
                if len(push) == 1:
                    B1 = push[0]
                    for r in states:
                        var_lhs = f"[{p},{A},{r}]"
                        var_rhs = f"[{q},{B1},{r}]"
                        if var_lhs not in non_terminals: non_terminals.append(var_lhs)
                        if var_rhs not in non_terminals: non_terminals.append(var_rhs)
                        if var_lhs not in productions: productions[var_lhs] = []
                        productions[var_lhs].append(f"{a}{var_rhs}")
                elif len(push) == 2:
                    B1, B2 = push[0], push[1]
                    for r1 in states:
                        for r2 in states:
                            var_lhs = f"[{p},{A},{r2}]"
                            var_rhs1 = f"[{q},{B1},{r1}]"
                            var_rhs2 = f"[{r1},{B2},{r2}]"
                            if var_lhs not in non_terminals: non_terminals.append(var_lhs)
                            if var_rhs1 not in non_terminals: non_terminals.append(var_rhs1)
                            if var_rhs2 not in non_terminals: non_terminals.append(var_rhs2)
                            if var_lhs not in productions: productions[var_lhs] = []
                            productions[var_lhs].append(f"{a}{var_rhs1}{var_rhs2}")

        return CFGDefinition(
            terminals=pda.alphabet,
            non_terminals=non_terminals,
            start_symbol="S",
            productions=productions
        )
