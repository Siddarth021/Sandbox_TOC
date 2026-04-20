class DecidabilityEngine:
    @staticmethod
    def analyze(problem_type: str):
        classifications = {
            "Halting Problem": {"status": "Undecidable", "explanation": "Proven by Alan Turing. No general algorithm can decide if a program halts."},
            "Language Emptiness (DFA)": {"status": "Decidable", "explanation": "Check connectivity from start to accept states in the transition graph."},
            "Language Emptiness (TM)": {"status": "Undecidable", "explanation": "Related to the Halting Problem (Rice's Theorem)."},
            "Membership (DFA)": {"status": "Decidable", "explanation": "Simply simulate the DFA on the input."},
            "Membership (TM)": {"status": "Semi-decidable", "explanation": "Can be decided if it accepts, but may loop forever if it doesn't."}
        }
        return classifications.get(problem_type, {"status": "Unknown", "explanation": "Problem type not found in database."})
class ComplexityEngine:
    @staticmethod
    def analyze_complexity(steps: int, tape_usage: int, input_len: int):
        # Heuristic/Theoretical estimate
        return {
            "steps": steps,
            "space_usage": tape_usage,
            "time_complexity_est": "O(n)" if steps <= input_len * 2 else "O(n^2)" if steps <= input_len**2 else "O(e^n)",
            "space_complexity_est": "O(n)" if tape_usage <= input_len + 1 else "O(1)" if tape_usage <= 1 else "O(f(n))"
        }
