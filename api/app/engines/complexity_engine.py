class ComplexityEngine:
    @staticmethod
    def analyze_complexity(steps: int, tape_usage: int, input_len: int):
        # Heuristic/Theoretical estimate based on execution trace
        time_est = "O(n)"
        if steps > input_len * 2: time_est = "O(n^2)"
        if steps > (input_len**2) + 10: time_est = "O(e^n)"
        
        space_est = "O(n)"
        if tape_usage <= 1: space_est = "O(1)"
        
        return {
            "steps": steps,
            "tape_usage": tape_usage,
            "time_complexity_estimate": time_est,
            "space_complexity_estimate": space_est
        }
