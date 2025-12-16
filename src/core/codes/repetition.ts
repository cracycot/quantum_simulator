/**
 * 3-Qubit Repetition Code
 * 
 * Encodes logical |0⟩ → |000⟩ and |1⟩ → |111⟩
 * Can correct single X (bit-flip) errors
 * Cannot correct Z (phase-flip) errors
 */
import { QuantumSystem, create3QubitSystem } from '../quantum/system';
import { Complex, StateVector } from '../quantum/complex';

export interface RepetitionCodeResult {
  system: QuantumSystem;
  syndrome: [number, number];
  errorDetected: boolean;
  correctedQubit: number | null;
  logicalState: 'zero' | 'one' | 'superposition';
}

/**
 * Encode a single qubit into 3-qubit repetition code
 * |ψ⟩ = α|0⟩ + β|1⟩ → α|000⟩ + β|111⟩
 */
export function encodeRepetition(system: QuantumSystem): void {
  // CNOT from q0 to q1
  // These are automatic encoding operations (not from palette), so mark as initialization
  system.applyGate({ name: 'CNOT', qubits: [0, 1], label: 'CNOT₀₁' }, true);
  // CNOT from q0 to q2
  system.applyGate({ name: 'CNOT', qubits: [0, 2], label: 'CNOT₀₂' }, true);
  
  system.logStep('encode', 'Encoded into 3-qubit repetition code: |ψ⟩ → α|000⟩ + β|111⟩');
}

/**
 * Decode 3-qubit repetition code back to single qubit
 * α|000⟩ + β|111⟩ → α|0⟩ + β|1⟩ ⊗ |00⟩
 */
export function decodeRepetition(system: QuantumSystem): void {
  // Reverse encoding
  system.applyGate({ name: 'CNOT', qubits: [0, 2], label: 'CNOT₀₂' });
  system.applyGate({ name: 'CNOT', qubits: [0, 1], label: 'CNOT₀₁' });
  
  system.logStep('decode', 'Decoded from 3-qubit repetition code');
}

/**
 * Measure syndrome bits for X-error detection
 * Uses parity checks: Z₀Z₁ and Z₁Z₂
 * 
 * Syndrome table:
 * (0,0) → No error
 * (1,0) → Error on q0
 * (1,1) → Error on q1
 * (0,1) → Error on q2
 */
export function measureSyndromeRepetition(system: QuantumSystem): [number, number] {
  // For simulation, we compute syndrome from state without collapsing
  // In real QEC, we'd use ancilla qubits
  
  const state = system.state;
  const n = state.numQubits;
  
  // Compute ⟨Z₀Z₁⟩ and ⟨Z₁Z₂⟩
  // Z₀Z₁|abc⟩ = (-1)^(a⊕b)|abc⟩
  // Z₁Z₂|abc⟩ = (-1)^(b⊕c)|abc⟩
  
  let expZ01 = 0;
  let expZ12 = 0;
  
  for (let i = 0; i < state.dimension; i++) {
    const prob = state.amplitudes[i].absSquared();
    const q0 = (i >> 0) & 1;
    const q1 = (i >> 1) & 1;
    const q2 = (i >> 2) & 1;
    
    // Eigenvalue of Z₀Z₁ on |abc⟩
    const z01 = (q0 ^ q1) === 0 ? 1 : -1;
    const z12 = (q1 ^ q2) === 0 ? 1 : -1;
    
    expZ01 += prob * z01;
    expZ12 += prob * z12;
  }
  
  // Convert expectation values to syndrome bits
  // If ⟨ZᵢZⱼ⟩ ≈ +1 → syndrome = 0 (no error in that pair)
  // If ⟨ZᵢZⱼ⟩ ≈ -1 → syndrome = 1 (error detected)
  const s1 = expZ01 < 0 ? 1 : 0;
  const s2 = expZ12 < 0 ? 1 : 0;
  
  system.logStep('measurement', `Syndrome measurement: (${s1}, ${s2})`);
  
  return [s1, s2];
}

/**
 * Correct error based on syndrome
 */
export function correctErrorRepetition(system: QuantumSystem, syndrome: [number, number]): number | null {
  const [s1, s2] = syndrome;
  
  let correctedQubit: number | null = null;
  
  if (s1 === 0 && s2 === 0) {
    system.logStep('correction', 'No error detected - no correction needed');
  } else if (s1 === 1 && s2 === 0) {
    // Error on q0
    system.applyGate({ name: 'X', qubits: [0], label: 'X₀ (correction)' });
    system.logStep('correction', 'Corrected X error on q₀');
    correctedQubit = 0;
  } else if (s1 === 1 && s2 === 1) {
    // Error on q1
    system.applyGate({ name: 'X', qubits: [1], label: 'X₁ (correction)' });
    system.logStep('correction', 'Corrected X error on q₁');
    correctedQubit = 1;
  } else if (s1 === 0 && s2 === 1) {
    // Error on q2
    system.applyGate({ name: 'X', qubits: [2], label: 'X₂ (correction)' });
    system.logStep('correction', 'Corrected X error on q₂');
    correctedQubit = 2;
  }
  
  return correctedQubit;
}

/**
 * Full QEC cycle for repetition code
 */
export function runRepetitionCodeCycle(
  initialState: 'zero' | 'one' | 'plus' | 'minus' = 'zero'
): RepetitionCodeResult {
  const system = create3QubitSystem();
  
  // Initialize
  switch (initialState) {
    case 'zero':
      system.initializeLogicalZero();
      break;
    case 'one':
      system.initializeLogicalOne();
      break;
    case 'plus':
      system.initializeLogicalPlus();
      break;
    case 'minus':
      system.initializeLogicalMinus();
      break;
  }
  
  // Encode
  encodeRepetition(system);
  
  // Measure syndrome
  const syndrome = measureSyndromeRepetition(system);
  
  // Correct error
  const correctedQubit = correctErrorRepetition(system, syndrome);
  
  // Determine logical state
  let logicalState: 'zero' | 'one' | 'superposition';
  const prob000 = system.state.probability(0b000);
  const prob111 = system.state.probability(0b111);
  
  if (prob000 > 0.99) {
    logicalState = 'zero';
  } else if (prob111 > 0.99) {
    logicalState = 'one';
  } else {
    logicalState = 'superposition';
  }
  
  return {
    system,
    syndrome,
    errorDetected: syndrome[0] !== 0 || syndrome[1] !== 0,
    correctedQubit,
    logicalState
  };
}

/**
 * Create reference logical states for fidelity calculation
 */
export function getLogicalZeroState(): StateVector {
  const sv = new StateVector(3);
  sv.amplitudes[0b000] = Complex.one();
  return sv;
}

export function getLogicalOneState(): StateVector {
  const sv = new StateVector(3);
  sv.amplitudes[0b000] = Complex.zero(); // Clear default |000⟩
  sv.amplitudes[0b111] = Complex.one();  // Set |111⟩
  return sv;
}

export function getLogicalPlusState(): StateVector {
  const sv = new StateVector(3);
  const s = 1 / Math.sqrt(2);
  sv.amplitudes[0b000] = new Complex(s);
  sv.amplitudes[0b111] = new Complex(s);
  return sv;
}

export function getLogicalMinusState(): StateVector {
  const sv = new StateVector(3);
  const s = 1 / Math.sqrt(2);
  sv.amplitudes[0b000] = new Complex(s);
  sv.amplitudes[0b111] = new Complex(-s);
  return sv;
}

/**
 * Syndrome lookup table for display
 */
export const repetitionSyndromeTable = [
  { syndrome: '(0, 0)', meaning: 'No error', correction: 'None' },
  { syndrome: '(1, 0)', meaning: 'Error on q₀', correction: 'Apply X₀' },
  { syndrome: '(1, 1)', meaning: 'Error on q₁', correction: 'Apply X₁' },
  { syndrome: '(0, 1)', meaning: 'Error on q₂', correction: 'Apply X₂' },
];

