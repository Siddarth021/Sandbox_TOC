export type MachineType = 'DFA' | 'NFA' | 'PDA' | 'TM' | 'CFG';

export interface MachineDefinition {
  states: string[];
  alphabet: string[];
  start_state: string;
  accept_states: string[];
  transitions: Record<string, Record<string, string | string[] | any>> | any[];
  // PDA specific
  stack_alphabet?: string[];
  stack_start_symbol?: string;
  // TM specific
  tape_symbols?: string[];
  accept_state?: string;
  // CFG specific
  non_terminals?: string[];
  terminals?: string[];
  start_symbol?: string;
  productions?: Record<string, string[]>;
}

export interface SimulationResult {
  accepted: boolean;
  steps: number;
  path: (string | string[])[];
  final_state?: string;
  final_states?: string[];
  tape?: string;
  error?: string;
}

export interface TransformationResult {
  regex?: string;
  states?: string[];
  alphabet?: string[];
  start_state?: string;
  accept_states?: string[];
  accept_state?: string;
  non_terminals?: string[];
  terminals?: string[];
  start_symbol?: string;
  productions?: Record<string, string[]>;
  [key: string]: any;
}
