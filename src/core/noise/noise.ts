import { QuantumSystem } from '../quantum/system';

export type NoiseType = 'bit-flip' | 'phase-flip' | 'bit-phase-flip' | 'depolarizing' | 'none';
export type NoiseMode = 'probability' | 'exact-count';

export interface NoiseConfig {
  type: NoiseType;
  probability: number; 
  mode?: NoiseMode; 
  exactCount?: number; 
  targetQubits?: number[]; 
}

export interface NoiseEvent {
  qubitIndex: number;
  errorType: 'X' | 'Y' | 'Z' | 'none';
  applied: boolean;
}

export function applyBitFlip(system: QuantumSystem, qubitIndex: number, probability: number): boolean {
  if (Math.random() < probability) {
    system.applyGate({ name: 'X', qubits: [qubitIndex], label: `X${qubitIndex} (noise)` }, 'noise');
    return true;
  }
  return false;
}

export function applyPhaseFlip(system: QuantumSystem, qubitIndex: number, probability: number): boolean {
  if (Math.random() < probability) {
    system.applyGate({ name: 'Z', qubits: [qubitIndex], label: `Z${qubitIndex} (noise)` }, 'noise');
    return true;
  }
  return false;
}

export function applyBitPhaseFlip(system: QuantumSystem, qubitIndex: number, probability: number): boolean {
  if (Math.random() < probability) {
    system.applyGate({ name: 'Y', qubits: [qubitIndex], label: `Y${qubitIndex} (noise)` }, 'noise');
    return true;
  }
  return false;
}

export function applyDepolarizing(system: QuantumSystem, qubitIndex: number, probability: number): 'X' | 'Y' | 'Z' | 'none' {
  const r = Math.random();
  
  if (r < probability / 3) {
    system.applyGate({ name: 'X', qubits: [qubitIndex], label: `X${qubitIndex} (depolarizing)` }, 'noise');
    return 'X';
  } else if (r < 2 * probability / 3) {
    system.applyGate({ name: 'Y', qubits: [qubitIndex], label: `Y${qubitIndex} (depolarizing)` }, 'noise');
    return 'Y';
  } else if (r < probability) {
    system.applyGate({ name: 'Z', qubits: [qubitIndex], label: `Z${qubitIndex} (depolarizing)` }, 'noise');
    return 'Z';
  }
  
  return 'none';
}

export function applyNoise(system: QuantumSystem, config: NoiseConfig): NoiseEvent[] {
  const events: NoiseEvent[] = [];
  
  const allQubits = config.targetQubits ?? Array.from({ length: system.numQubits }, (_, i) => i);
  const qubits = allQubits.filter(i => system.qubits[i]?.role === 'data');
  const mode = config.mode ?? 'probability';
  
  if (config.type === 'none') {
    
    return allQubits.map(q => ({ qubitIndex: q, errorType: 'none' as const, applied: false }));
  }
  
  if (mode === 'exact-count' && config.exactCount !== undefined) {
    
    const count = Math.min(config.exactCount, qubits.length);
    const shuffled = [...qubits].sort(() => Math.random() - 0.5);
    const selectedQubits = new Set(shuffled.slice(0, count));
    
    for (const qubitIndex of qubits) {
      if (selectedQubits.has(qubitIndex)) {
        
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
    
    for (const qubitIndex of allQubits) {
      if (system.qubits[qubitIndex]?.role !== 'data') {
        events.push({ qubitIndex, errorType: 'none', applied: false });
      }
    }
  } else {
    
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
    
    for (const qubitIndex of allQubits) {
      if (system.qubits[qubitIndex]?.role !== 'data') {
        events.push({ qubitIndex, errorType: 'none', applied: false });
      }
    }
  }
  
  return events;
}

export function injectError(
  system: QuantumSystem, 
  qubitIndex: number, 
  errorType: 'X' | 'Y' | 'Z'
): void {
  system.applyGate({ 
    name: errorType, 
    qubits: [qubitIndex], 
    label: `${errorType}${qubitIndex} (injected)` 
  }, 'noise');
}

export function injectErrors(
  system: QuantumSystem,
  errors: Array<{ qubit: number; type: 'X' | 'Y' | 'Z' }>
): void {
  for (const error of errors) {
    injectError(system, error.qubit, error.type);
  }
}

export function repetitionLogicalErrorRate(physicalErrorRate: number): number {
  const p = physicalErrorRate;
  
  return 3 * p * p * (1 - p) + p * p * p;
}

export function shorLogicalErrorRate(physicalErrorRate: number): number {
  const p = physicalErrorRate;
  
  return p * p * (1 + 2 * p);
}

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
