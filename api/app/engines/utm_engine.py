from .simulation_engine import SimulationEngine
from ..schemas.models import TMDefinition

class UTMEngine:
    @staticmethod
    def run_utm(machine_def: TMDefinition, input_string: str):
        # A UTM is conceptually a TM. Here we simulate it by using our TM simulator
        # with the provided definition.
        return SimulationEngine.simulate_tm(machine_def, input_string)
