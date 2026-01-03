export type GateErrorType = 'bit-flip' | 'phase-flip' | 'bit-phase-flip' | 'depolarizing' | 'none';

export type GateErrorScope = 'all' | 'single-qubit' | 'two-qubit';

export interface GateErrorConfig {
  enabled: boolean;
  type: GateErrorType;
  probability: number; 
  applyTo?: GateErrorScope;
}

export const defaultGateErrorConfig: GateErrorConfig = {
  enabled: false,
  type: 'depolarizing',
  probability: 0.0,
  applyTo: 'all'
};
