/**
 * Noise models for quantum error simulation
 */
import { QuantumSystem } from '../quantum/system';

export type NoiseType = 'bit-flip' | 'phase-flip' | 'bit-phase-flip' | 'depolarizing' | 'none';
export type NoiseMode = 'probability' | 'exact-count';

export interface NoiseConfig {
  type: NoiseType;
  probability: number; // Probability of error per qubit (for 'probability' mode)
  mode?: NoiseMode; // 'probability' (default) or 'exact-count'
  exactCount?: number; // Exact number of errors to apply (for 'exact-count' mode)
  targetQubits?: number[]; // Specific qubits to apply noise (undefined = all)
}

export interface NoiseEvent {
  qubitIndex: number;
  errorType: 'X' | 'Y' | 'Z' | 'none';
  applied: boolean;
}

/**
 * Apply bit-flip (X) error to a qubit with given probability
 */
export function applyBitFlip(system: QuantumSystem, qubitIndex: number, probability: number): boolean {
  if (Math.random() < probability) {
    system.applyGate({ name: 'X', qubits: [qubitIndex], label: `X${qubitIndex} (noise)` });
    system.logStep('noise', `Bit-flip error on qubit ${qubitIndex}`);
    return true;
  }
  return false;
}

/**
 * Apply phase-flip (Z) error to a qubit with given probability
 */
export function applyPhaseFlip(system: QuantumSystem, qubitIndex: number, probability: number): boolean {
  if (Math.random() < probability) {
    system.applyGate({ name: 'Z', qubits: [qubitIndex], label: `Z${qubitIndex} (noise)` });
    system.logStep('noise', `Phase-flip error on qubit ${qubitIndex}`);
    return true;
  }
  return false;
}

/**
 * Apply combined bit-phase-flip (Y) error to a qubit with given probability
 */
export function applyBitPhaseFlip(system: QuantumSystem, qubitIndex: number, probability: number): boolean {
  if (Math.random() < probability) {
    system.applyGate({ name: 'Y', qubits: [qubitIndex], label: `Y${qubitIndex} (noise)` });
    system.logStep('noise', `Bit-phase-flip (Y) error on qubit ${qubitIndex}`);
    return true;
  }
  return false;
}

/**
 * Apply depolarizing channel to a qubit
 * With probability p: apply X, Y, or Z each with probability p/3
 * With probability 1-p: no error
 */
export function applyDepolarizing(system: QuantumSystem, qubitIndex: number, probability: number): 'X' | 'Y' | 'Z' | 'none' {
  const r = Math.random();
  
  if (r < probability / 3) {
    system.applyGate({ name: 'X', qubits: [qubitIndex], label: `X${qubitIndex} (depolarizing)` });
    system.logStep('noise', `Depolarizing X error on qubit ${qubitIndex}`);
    return 'X';
  } else if (r < 2 * probability / 3) {
    system.applyGate({ name: 'Y', qubits: [qubitIndex], label: `Y${qubitIndex} (depolarizing)` });
    system.logStep('noise', `Depolarizing Y error on qubit ${qubitIndex}`);
    return 'Y';
  } else if (r < probability) {
    system.applyGate({ name: 'Z', qubits: [qubitIndex], label: `Z${qubitIndex} (depolarizing)` });
    system.logStep('noise', `Depolarizing Z error on qubit ${qubitIndex}`);
    return 'Z';
  }
  
  return 'none';
}

/**
 * Apply noise to the quantum system based on configuration
 */
export function applyNoise(system: QuantumSystem, config: NoiseConfig): NoiseEvent[] {
  const events: NoiseEvent[] = [];
  const qubits = config.targetQubits ?? Array.from({ length: system.numQubits }, (_, i) => i);
  const mode = config.mode ?? 'probability';
  
  if (config.type === 'none') {
    // No noise - return empty events
    return qubits.map(q => ({ qubitIndex: q, errorType: 'none' as const, applied: false }));
  }
  
  if (mode === 'exact-count' && config.exactCount !== undefined) {
    // Exact count mode: apply errors to exactly N random qubits
    const count = Math.min(config.exactCount, qubits.length);
    const shuffled = [...qubits].sort(() => Math.random() - 0.5);
    const selectedQubits = new Set(shuffled.slice(0, count));
    
    for (const qubitIndex of qubits) {
      if (selectedQubits.has(qubitIndex)) {
        // Apply error to this qubit (probability = 1)
        let errorType: NoiseEvent['errorType'] = 'none';
        
        switch (config.type) {
          case 'bit-flip':
            applyBitFlip(system, qubitIndex, 1);
            errorType = 'X';
            break;
          case 'phase-flip':
            applyPhaseFlip(system, qubitIndex, 1);
            errorType = 'Z';
            break;
          case 'bit-phase-flip':
            applyBitPhaseFlip(system, qubitIndex, 1);
            errorType = 'Y';
            break;
          case 'depolarizing':
            errorType = applyDepolarizing(system, qubitIndex, 1);
            break;
        }
        events.push({ qubitIndex, errorType, applied: true });
      } else {
        events.push({ qubitIndex, errorType: 'none', applied: false });
      }
    }
  } else {
    // Probability mode: each qubit independently has probability p of error
    for (const qubitIndex of qubits) {
      let errorType: NoiseEvent['errorType'] = 'none';
      let applied = false;
      
      switch (config.type) {
        case 'bit-flip':
          applied = applyBitFlip(system, qubitIndex, config.probability);
          errorType = applied ? 'X' : 'none';
          break;
          
        case 'phase-flip':
          applied = applyPhaseFlip(system, qubitIndex, config.probability);
          errorType = applied ? 'Z' : 'none';
          break;
          
        case 'bit-phase-flip':
          applied = applyBitPhaseFlip(system, qubitIndex, config.probability);
          errorType = applied ? 'Y' : 'none';
          break;
          
        case 'depolarizing':
          errorType = applyDepolarizing(system, qubitIndex, config.probability);
          applied = errorType !== 'none';
          break;
      }
      
      events.push({ qubitIndex, errorType, applied });
    }
  }
  
  return events;
}

/**
 * Apply specific error to a specific qubit (for manual error injection)
 */
export function injectError(
  system: QuantumSystem, 
  qubitIndex: number, 
  errorType: 'X' | 'Y' | 'Z'
): void {
  system.applyGate({ 
    name: errorType, 
    qubits: [qubitIndex], 
    label: `${errorType}${qubitIndex} (injected)` 
  });
  system.logStep('noise', `Manually injected ${errorType} error on qubit ${qubitIndex}`);
}

/**
 * Apply multiple errors at once
 */
export function injectErrors(
  system: QuantumSystem,
  errors: Array<{ qubit: number; type: 'X' | 'Y' | 'Z' }>
): void {
  for (const error of errors) {
    injectError(system, error.qubit, error.type);
  }
}

/**
 * Calculate theoretical logical error rate for repetition code
 * p_L = 3p^2(1-p) + p^3 ≈ 3p^2 for small p (probability of 2+ errors)
 */
export function repetitionLogicalErrorRate(physicalErrorRate: number): number {
  const p = physicalErrorRate;
  // Probability of 2 or more errors
  return 3 * p * p * (1 - p) + p * p * p;
}

/**
 * Calculate theoretical logical error rate for Shor code (simplified)
 * Shor code protects against X, Y, and Z errors simultaneously
 * Better than repetition code at low error rates
 */
export function shorLogicalErrorRate(physicalErrorRate: number): number {
  const p = physicalErrorRate;
  // Shor code: ~p² improvement (better than repetition's 3p²)
  // Simplified approximation for visualization
  return p * p * (1 + 2 * p);
}

/**
 * Generate noise description for UI
 */
export function getNoiseDescription(config: NoiseConfig): string {
  if (config.type === 'none') {
    return 'No noise';
  }
  
  const targetStr = config.targetQubits 
    ? `qubits ${config.targetQubits.join(', ')}`
    : 'all qubits';
  
  switch (config.type) {
    case 'bit-flip':
      return `Bit-flip (X) noise with p=${(config.probability * 100).toFixed(1)}% on ${targetStr}`;
    case 'phase-flip':
      return `Phase-flip (Z) noise with p=${(config.probability * 100).toFixed(1)}% on ${targetStr}`;
    case 'bit-phase-flip':
      return `Bit-phase-flip (Y) noise with p=${(config.probability * 100).toFixed(1)}% on ${targetStr}`;
    case 'depolarizing':
      return `Depolarizing noise with p=${(config.probability * 100).toFixed(1)}% on ${targetStr}`;
    default:
      return 'Unknown noise type';
  }
}

