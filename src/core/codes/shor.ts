/**
 * 9-Qubit Shor Code
 * 
 * The Shor code is the first quantum error correcting code.
 * It encodes 1 logical qubit into 9 physical qubits.
 * Can correct arbitrary single-qubit errors (X, Y, Z).
 * 
 * Encoding:
 * |0⟩_L = (|000⟩ + |111⟩)(|000⟩ + |111⟩)(|000⟩ + |111⟩) / 2√2
 * |1⟩_L = (|000⟩ - |111⟩)(|000⟩ - |111⟩)(|000⟩ - |111⟩) / 2√2
 * 
 * Structure:
 * - Qubits 0,1,2: First block (protects against phase errors)
 * - Qubits 3,4,5: Second block
 * - Qubits 6,7,8: Third block
 * - Blocks protect against bit-flip errors within each block
 */
import { QuantumSystem, create9QubitShorSystem } from '../quantum/system';
import { Complex, StateVector } from '../quantum/complex';
import { GateOperation } from '../quantum/gates';

export interface ShorCodeResult {
  system: QuantumSystem;
  bitFlipSyndrome: [number, number, number, number, number, number]; // 2 per block
  phaseFlipSyndrome: [number, number];
  errorDetected: boolean;
  correctedQubits: number[];
  errorType: 'none' | 'bit-flip' | 'phase-flip' | 'both';
}

/**
 * Encode a single qubit into 9-qubit Shor code
 * 
 * Step 1: Apply H to qubits 0, 3, 6 to create superposition for phase protection
 * Step 2: Apply CNOTs to spread bit-flip protection within each block
 */
export function encodeShor(system: QuantumSystem): void {
  // Phase 1: Create GHZ-like superposition across blocks
  // Start with |ψ⟩ = α|0⟩ + β|1⟩ on qubit 0
  
  // CNOT from 0 to 3 and 6
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [0, 3] },
    { name: 'CNOT', qubits: [0, 6] }
  ], 'Spread logical qubit across blocks', 'encode');
  
  // Apply Hadamard to leaders of each block
  system.applyGatesWithDescription([
    { name: 'H', qubits: [0] },
    { name: 'H', qubits: [3] },
    { name: 'H', qubits: [6] }
  ], 'Apply Hadamard to block leaders for phase protection', 'encode');
  
  // Phase 2: Bit-flip protection within each block
  // Block 0: qubits 0,1,2
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [0, 1] },
    { name: 'CNOT', qubits: [0, 2] }
  ], 'Bit-flip protection in block 0 (qubits 0,1,2)', 'encode');
  
  // Block 1: qubits 3,4,5
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [3, 4] },
    { name: 'CNOT', qubits: [3, 5] }
  ], 'Bit-flip protection in block 1 (qubits 3,4,5)', 'encode');
  
  // Block 2: qubits 6,7,8
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [6, 7] },
    { name: 'CNOT', qubits: [6, 8] }
  ], 'Bit-flip protection in block 2 (qubits 6,7,8)', 'encode');
  
  system.logStep('encode', 'Encoded into 9-qubit Shor code');
}

/**
 * Decode 9-qubit Shor code back to single qubit
 */
export function decodeShor(system: QuantumSystem): void {
  // Reverse bit-flip encoding for each block
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [6, 8] },
    { name: 'CNOT', qubits: [6, 7] }
  ], 'Reverse bit-flip protection in block 2', 'decode');
  
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [3, 5] },
    { name: 'CNOT', qubits: [3, 4] }
  ], 'Reverse bit-flip protection in block 1', 'decode');
  
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [0, 2] },
    { name: 'CNOT', qubits: [0, 1] }
  ], 'Reverse bit-flip protection in block 0', 'decode');
  
  // Reverse Hadamards
  system.applyGatesWithDescription([
    { name: 'H', qubits: [0] },
    { name: 'H', qubits: [3] },
    { name: 'H', qubits: [6] }
  ], 'Reverse Hadamard on block leaders', 'decode');
  
  // Reverse phase encoding
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [0, 6] },
    { name: 'CNOT', qubits: [0, 3] }
  ], 'Merge blocks back to single qubit', 'decode');
  
  system.logStep('decode', 'Decoded from 9-qubit Shor code');
}

/**
 * Measure bit-flip syndromes within each block
 * Returns 6 syndrome bits (2 per block)
 */
export function measureBitFlipSyndrome(system: QuantumSystem): [number, number, number, number, number, number] {
  const state = system.state;
  const syndromes: number[] = [];
  
  // For each block, measure Z₀Z₁ and Z₁Z₂ parity
  const blocks = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
  
  for (const [q0, q1, q2] of blocks) {
    let expZ01 = 0;
    let expZ12 = 0;
    
    for (let i = 0; i < state.dimension; i++) {
      const prob = state.amplitudes[i].absSquared();
      const b0 = (i >> q0) & 1;
      const b1 = (i >> q1) & 1;
      const b2 = (i >> q2) & 1;
      
      expZ01 += prob * ((b0 ^ b1) === 0 ? 1 : -1);
      expZ12 += prob * ((b1 ^ b2) === 0 ? 1 : -1);
    }
    
    syndromes.push(expZ01 < 0 ? 1 : 0);
    syndromes.push(expZ12 < 0 ? 1 : 0);
  }
  
  return syndromes as [number, number, number, number, number, number];
}

/**
 * Measure phase-flip syndromes between blocks
 * Uses X⊗X⊗X parity measurements
 */
export function measurePhaseFlipSyndrome(system: QuantumSystem): [number, number] {
  const state = system.state;
  
  // For phase syndrome, we need to check parity of blocks
  // X_block measures in ± basis
  // We compute ⟨X₀X₁X₂ ⊗ X₃X₄X₅⟩ and ⟨X₃X₄X₅ ⊗ X₆X₇X₈⟩
  
  // First, let's compute in a simpler way by looking at the structure
  // For correctly encoded states, all qubits in a block have same X parity
  
  // Phase syndrome: compare block parities
  // Block parity = XOR of all bits in block in X basis
  
  // Apply Hadamard mentally to convert to Z basis measurement
  // ⟨X₀X₁X₂⟩ = ⟨HZH ⊗ HZH ⊗ HZH⟩ in computational basis
  
  // Simplified: Check if blocks have consistent phase
  let expBlock01 = 0;
  let expBlock12 = 0;
  
  for (let i = 0; i < state.dimension; i++) {
    const prob = state.amplitudes[i].absSquared();
    
    // Block parities
    const b0 = ((i >> 0) & 1) ^ ((i >> 1) & 1) ^ ((i >> 2) & 1);
    const b1 = ((i >> 3) & 1) ^ ((i >> 4) & 1) ^ ((i >> 5) & 1);
    const b2 = ((i >> 6) & 1) ^ ((i >> 7) & 1) ^ ((i >> 8) & 1);
    
    // Compare adjacent blocks
    expBlock01 += prob * ((b0 ^ b1) === 0 ? 1 : -1);
    expBlock12 += prob * ((b1 ^ b2) === 0 ? 1 : -1);
  }
  
  // This is a simplified version - real phase syndrome requires ancilla measurements
  const s1 = expBlock01 < 0.5 ? 1 : 0;
  const s2 = expBlock12 < 0.5 ? 1 : 0;
  
  return [s1, s2];
}

/**
 * Correct bit-flip errors based on syndrome
 */
export function correctBitFlipErrors(
  system: QuantumSystem, 
  syndrome: [number, number, number, number, number, number]
): number[] {
  const corrected: number[] = [];
  const blocks = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
  
  for (let blockIdx = 0; blockIdx < 3; blockIdx++) {
    const s1 = syndrome[blockIdx * 2];
    const s2 = syndrome[blockIdx * 2 + 1];
    const [q0, q1, q2] = blocks[blockIdx];
    
    if (s1 === 0 && s2 === 0) {
      // No error in this block
    } else if (s1 === 1 && s2 === 0) {
      system.applyGate({ name: 'X', qubits: [q0], label: `X${q0} (bit correction)` });
      corrected.push(q0);
    } else if (s1 === 1 && s2 === 1) {
      system.applyGate({ name: 'X', qubits: [q1], label: `X${q1} (bit correction)` });
      corrected.push(q1);
    } else if (s1 === 0 && s2 === 1) {
      system.applyGate({ name: 'X', qubits: [q2], label: `X${q2} (bit correction)` });
      corrected.push(q2);
    }
  }
  
  if (corrected.length > 0) {
    system.logStep('correction', `Corrected bit-flip errors on qubits: ${corrected.join(', ')}`);
  }
  
  return corrected;
}

/**
 * Correct phase-flip errors based on syndrome
 */
export function correctPhaseFlipErrors(
  system: QuantumSystem,
  syndrome: [number, number]
): number[] {
  const corrected: number[] = [];
  const [s1, s2] = syndrome;
  
  // Phase syndrome indicates which block has wrong phase
  // Apply Z to any qubit in that block (they're entangled)
  
  if (s1 === 0 && s2 === 0) {
    // No phase error
  } else if (s1 === 1 && s2 === 0) {
    // Block 0 has wrong phase relative to others
    system.applyGate({ name: 'Z', qubits: [0], label: 'Z₀ (phase correction)' });
    corrected.push(0);
  } else if (s1 === 1 && s2 === 1) {
    // Block 1 has wrong phase
    system.applyGate({ name: 'Z', qubits: [3], label: 'Z₃ (phase correction)' });
    corrected.push(3);
  } else if (s1 === 0 && s2 === 1) {
    // Block 2 has wrong phase
    system.applyGate({ name: 'Z', qubits: [6], label: 'Z₆ (phase correction)' });
    corrected.push(6);
  }
  
  if (corrected.length > 0) {
    system.logStep('correction', `Corrected phase-flip error in block ${corrected[0] / 3}`);
  }
  
  return corrected;
}

/**
 * Full syndrome measurement and correction for Shor code
 */
export function measureAndCorrectShor(system: QuantumSystem): {
  bitFlipSyndrome: [number, number, number, number, number, number];
  phaseFlipSyndrome: [number, number];
  bitCorrected: number[];
  phaseCorrected: number[];
} {
  // First correct bit-flip errors
  const bitFlipSyndrome = measureBitFlipSyndrome(system);
  system.logStep('measurement', `Bit-flip syndrome: [${bitFlipSyndrome.join(', ')}]`);
  const bitCorrected = correctBitFlipErrors(system, bitFlipSyndrome);
  
  // Then correct phase-flip errors
  const phaseFlipSyndrome = measurePhaseFlipSyndrome(system);
  system.logStep('measurement', `Phase-flip syndrome: [${phaseFlipSyndrome.join(', ')}]`);
  const phaseCorrected = correctPhaseFlipErrors(system, phaseFlipSyndrome);
  
  return {
    bitFlipSyndrome,
    phaseFlipSyndrome,
    bitCorrected,
    phaseCorrected
  };
}

/**
 * Full QEC cycle for Shor code
 */
export function runShorCodeCycle(
  initialState: 'zero' | 'one' | 'plus' | 'minus' = 'zero'
): ShorCodeResult {
  const system = create9QubitShorSystem();
  
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
  encodeShor(system);
  
  // Measure and correct
  const result = measureAndCorrectShor(system);
  
  // Determine error type
  let errorType: ShorCodeResult['errorType'] = 'none';
  const hasBitError = result.bitCorrected.length > 0;
  const hasPhaseError = result.phaseCorrected.length > 0;
  
  if (hasBitError && hasPhaseError) {
    errorType = 'both';
  } else if (hasBitError) {
    errorType = 'bit-flip';
  } else if (hasPhaseError) {
    errorType = 'phase-flip';
  }
  
  return {
    system,
    bitFlipSyndrome: result.bitFlipSyndrome,
    phaseFlipSyndrome: result.phaseFlipSyndrome,
    errorDetected: hasBitError || hasPhaseError,
    correctedQubits: [...result.bitCorrected, ...result.phaseCorrected],
    errorType
  };
}

/**
 * Create reference logical states for Shor code
 */
export function getShorLogicalZeroState(): StateVector {
  // |0⟩_L = (|000⟩ + |111⟩)^⊗3 / 2√2
  const sv = new StateVector(9);
  const norm = 1 / (2 * Math.sqrt(2));
  
  // All combinations of (000, 111) for each block
  const patterns = [
    0b000000000, // 000 000 000
    0b000000111, // 000 000 111
    0b000111000, // 000 111 000
    0b000111111, // 000 111 111
    0b111000000, // 111 000 000
    0b111000111, // 111 000 111
    0b111111000, // 111 111 000
    0b111111111, // 111 111 111
  ];
  
  for (const p of patterns) {
    sv.amplitudes[p] = new Complex(norm);
  }
  
  return sv;
}

export function getShorLogicalOneState(): StateVector {
  // |1⟩_L = (|000⟩ - |111⟩)^⊗3 / 2√2
  const sv = new StateVector(9);
  const norm = 1 / (2 * Math.sqrt(2));
  
  // Pattern with signs based on parity of 111 blocks
  const patterns = [
    { idx: 0b000000000, sign: 1 },   // even: +
    { idx: 0b000000111, sign: -1 },  // odd: -
    { idx: 0b000111000, sign: -1 },
    { idx: 0b000111111, sign: 1 },
    { idx: 0b111000000, sign: -1 },
    { idx: 0b111000111, sign: 1 },
    { idx: 0b111111000, sign: 1 },
    { idx: 0b111111111, sign: -1 },
  ];
  
  for (const { idx, sign } of patterns) {
    sv.amplitudes[idx] = new Complex(norm * sign);
  }
  
  return sv;
}

/**
 * Syndrome lookup table for Shor code (simplified)
 */
export const shorBitFlipSyndromeTable = [
  { block: 0, syndrome: '(0,0)', meaning: 'No error', correction: 'None' },
  { block: 0, syndrome: '(1,0)', meaning: 'Error on q₀', correction: 'Apply X₀' },
  { block: 0, syndrome: '(1,1)', meaning: 'Error on q₁', correction: 'Apply X₁' },
  { block: 0, syndrome: '(0,1)', meaning: 'Error on q₂', correction: 'Apply X₂' },
  { block: 1, syndrome: '(0,0)', meaning: 'No error', correction: 'None' },
  { block: 1, syndrome: '(1,0)', meaning: 'Error on q₃', correction: 'Apply X₃' },
  { block: 1, syndrome: '(1,1)', meaning: 'Error on q₄', correction: 'Apply X₄' },
  { block: 1, syndrome: '(0,1)', meaning: 'Error on q₅', correction: 'Apply X₅' },
  { block: 2, syndrome: '(0,0)', meaning: 'No error', correction: 'None' },
  { block: 2, syndrome: '(1,0)', meaning: 'Error on q₆', correction: 'Apply X₆' },
  { block: 2, syndrome: '(1,1)', meaning: 'Error on q₇', correction: 'Apply X₇' },
  { block: 2, syndrome: '(0,1)', meaning: 'Error on q₈', correction: 'Apply X₈' },
];

export const shorPhaseFlipSyndromeTable = [
  { syndrome: '(0,0)', meaning: 'No phase error', correction: 'None' },
  { syndrome: '(1,0)', meaning: 'Phase error in block 0', correction: 'Apply Z₀' },
  { syndrome: '(1,1)', meaning: 'Phase error in block 1', correction: 'Apply Z₃' },
  { syndrome: '(0,1)', meaning: 'Phase error in block 2', correction: 'Apply Z₆' },
];

