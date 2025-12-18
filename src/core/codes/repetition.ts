/**
 * 3-Qubit Repetition Code
 * 
 * Encodes logical |0⟩ → |000⟩ and |1⟩ → |111⟩
 * Can correct single X (bit-flip) errors
 * Cannot correct Z (phase-flip) errors
 */
import { QuantumSystem, create5QubitRepetitionSystem } from '../quantum/system';
import { Complex, StateVector } from '../quantum/complex';
import { applyGate } from '../quantum/gates';

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
 * 
 * CNOT операции теперь выполняются в initializeLogicalZero/One
 */
export function encodeRepetition(system: QuantumSystem): void {
  // Encoding already done in initialization
  system.logStep('encode', 'Кодирование завершено: 3-кубитный код');
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
  // Honest syndrome measurement uses 2 ancillas:
  // Measure Z0Z1 via a0, and Z1Z2 via a1.
  // Circuit for Zij with ancilla a (prepared in |0⟩):
  // CX(qi -> a), CX(qj -> a), measure a in Z.

  if (system.numQubits >= 5) {
    const a0 = 3;
    const a1 = 4;

    // --- S1 = Z0 Z1 on a0 ---
    system.applyGatesWithDescription(
      [
        { name: 'CNOT', qubits: [0, a0], label: 'CNOT₀→a₀ (syndrome)' },
        { name: 'CNOT', qubits: [1, a0], label: 'CNOT₁→a₀ (syndrome)' }
      ],
      'Syndrome coupling for Z₀Z₁',
      'measurement'
    );
    const s1 = system.measureQubit(a0, 'Measure a₀ (Z): s₁ = parity(q₀,q₁)');
    // Reset ancilla to |0⟩ to keep state comparable for fidelity / next steps
    if (s1 === 1) {
      applyGate(system.state, { name: 'X', qubits: [a0] });
    }

    // --- S2 = Z1 Z2 on a1 ---
    system.applyGatesWithDescription(
      [
        { name: 'CNOT', qubits: [1, a1], label: 'CNOT₁→a₁ (syndrome)' },
        { name: 'CNOT', qubits: [2, a1], label: 'CNOT₂→a₁ (syndrome)' }
      ],
      'Syndrome coupling for Z₁Z₂',
      'measurement'
    );
    const s2 = system.measureQubit(a1, 'Measure a₁ (Z): s₂ = parity(q₁,q₂)');
    if (s2 === 1) {
      applyGate(system.state, { name: 'X', qubits: [a1] });
    }

    return [s1, s2];
  }

  // Legacy (no ancillas): compute syndrome from expectation values without collapsing
  const state = system.state;
  let expZ01 = 0;
  let expZ12 = 0;

  for (let i = 0; i < state.dimension; i++) {
    const prob = state.amplitudes[i].absSquared();
    const q0 = (i >> 0) & 1;
    const q1 = (i >> 1) & 1;
    const q2 = (i >> 2) & 1;

    const z01 = (q0 ^ q1) === 0 ? 1 : -1;
    const z12 = (q1 ^ q2) === 0 ? 1 : -1;

    expZ01 += prob * z01;
    expZ12 += prob * z12;
  }

  const s1 = expZ01 < 0 ? 1 : 0;
  const s2 = expZ12 < 0 ? 1 : 0;

  return [s1, s2];
}

/**
 * Correct error based on syndrome
 */
export function correctErrorRepetition(system: QuantumSystem, syndrome: [number, number]): number | null {
  const [s1, s2] = syndrome;
  
  let correctedQubit: number | null = null;
  
  if (s1 === 0 && s2 === 0) {
    // No error detected
    correctedQubit = null;
  } else if (s1 === 1 && s2 === 0) {
    // Error on q0
    system.applyGatesWithDescription(
      [{ name: 'X', qubits: [0], label: 'X₀' }],
      '✅ Коррекция: X на q₀',
      'correction'
    );
    correctedQubit = 0;
  } else if (s1 === 1 && s2 === 1) {
    // Error on q1
    system.applyGatesWithDescription(
      [{ name: 'X', qubits: [1], label: 'X₁' }],
      '✅ Коррекция: X на q₁',
      'correction'
    );
    correctedQubit = 1;
  } else if (s1 === 0 && s2 === 1) {
    // Error on q2
    system.applyGatesWithDescription(
      [{ name: 'X', qubits: [2], label: 'X₂' }],
      '✅ Коррекция: X на q₂',
      'correction'
    );
    correctedQubit = 2;
  }
  
  return correctedQubit;
}

/**
 * Full QEC cycle for repetition code
 */
export function runRepetitionCodeCycle(
  initialState: 'zero' | 'one' = 'zero'
): RepetitionCodeResult {
  const system = create5QubitRepetitionSystem();
  
  // Initialize
  switch (initialState) {
    case 'zero':
      system.initializeLogicalZero();
      break;
    case 'one':
      system.initializeLogicalOne();
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
  const sv = new StateVector(5);
  sv.amplitudes[0b00000] = Complex.one();
  return sv;
}

export function getLogicalOneState(): StateVector {
  const sv = new StateVector(5);
  sv.amplitudes[0b00000] = Complex.zero(); // Clear default |00000⟩
  sv.amplitudes[0b00111] = Complex.one();  // |11100⟩ (data=111, ancilla=00)
  return sv;
}

export function getLogicalPlusState(): StateVector {
  const sv = new StateVector(5);
  const s = 1 / Math.sqrt(2);
  sv.amplitudes[0b00000] = new Complex(s);
  sv.amplitudes[0b00111] = new Complex(s);
  return sv;
}

export function getLogicalMinusState(): StateVector {
  const sv = new StateVector(5);
  const s = 1 / Math.sqrt(2);
  sv.amplitudes[0b00000] = new Complex(s);
  sv.amplitudes[0b00111] = new Complex(-s);
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

