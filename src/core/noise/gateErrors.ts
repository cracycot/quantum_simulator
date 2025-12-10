/**
 * Gate error configuration (errors occurring during gate application)
 */
export type GateErrorType = 'bit-flip' | 'phase-flip' | 'bit-phase-flip' | 'depolarizing' | 'none';

export type GateErrorScope = 'all' | 'single-qubit' | 'two-qubit';

export interface GateErrorConfig {
  enabled: boolean;
  type: GateErrorType;
  probability: number; // Probability per gate/qubit application
  applyTo?: GateErrorScope;
}

export const defaultGateErrorConfig: GateErrorConfig = {
  enabled: false,
  type: 'depolarizing',
  probability: 0.0,
  applyTo: 'all'
};


