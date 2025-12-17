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
 * Кодирование внутри блоков для защиты от битовых ошибок
 */
export function encodeShor(system: QuantumSystem): void {
  // Bit-flip protection within each block
  // Block 0: qubits 0,1,2
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [0, 1] },
    { name: 'CNOT', qubits: [0, 2] }
  ], '🔗 Защита от битовых ошибок в блоке 0 (q₀,q₁,q₂)\nCNOT создаёт запутанность для репликации состояния', 'encode');
  
  // Block 1: qubits 3,4,5
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [3, 4] },
    { name: 'CNOT', qubits: [3, 5] }
  ], '🔗 Защита от битовых ошибок в блоке 1 (q₃,q₄,q₅)\nCNOT создаёт запутанность для репликации состояния', 'encode');
  
  // Block 2: qubits 6,7,8
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [6, 7] },
    { name: 'CNOT', qubits: [6, 8] }
  ], '🔗 Защита от битовых ошибок в блоке 2 (q₆,q₇,q₈)\nCNOT создаёт запутанность для репликации состояния', 'encode');
  
  system.logStep('encode', '✨ Кодирование завершено: 1 логический кубит → 9 физических кубитов (код Шора)');
}

/**
 * Decode 9-qubit Shor code back to single qubit
 * Обратная последовательность к encodeShor
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
  
  // Reverse 2 CNOT between blocks
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [0, 6] },
    { name: 'CNOT', qubits: [0, 3] }
  ], 'Merge blocks back to single qubit', 'decode');
  
  // Reverse Hadamard
  system.applyGatesWithDescription([
    { name: 'H', qubits: [0] }
  ], 'Reverse Hadamard: |+⟩ → |0⟩', 'decode');
  
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
 * For Shor code after bit-flip correction, phase errors only occur if there was an actual Z or Y error
 * We detect by checking if the global phase pattern across blocks is consistent
 */
export function measurePhaseFlipSyndrome(system: QuantumSystem): [number, number] {
  const state = system.state;
  
  // After bit-flip correction, each block should be in (|000⟩ ± |111⟩)
  // Phase syndrome detects if blocks have wrong relative signs
  
  // Count amplitude signs for basis states in each block pattern
  let block0_positive = 0, block0_negative = 0;
  let block1_positive = 0, block1_negative = 0;
  let block2_positive = 0, block2_negative = 0;
  
  // Sample key basis states to determine block phases
  const test_states = [
    0b000000000,  // |000⟩|000⟩|000⟩
    0b000000111,  // |000⟩|000⟩|111⟩
    0b000111000,  // |000⟩|111⟩|000⟩
    0b000111111,  // |000⟩|111⟩|111⟩
    0b111000000,  // |111⟩|000⟩|000⟩
    0b111000111,  // |111⟩|000⟩|111⟩
    0b111111000,  // |111⟩|111⟩|000⟩
    0b111111111,  // |111⟩|111⟩|111⟩
  ];
  
  for (const idx of test_states) {
    const amp = state.amplitudes[idx];
    const prob = amp.absSquared();
    if (prob < 1e-10) continue;
    
    const sign = amp.re > 0 ? 1 : -1;
    const block0_state = (idx >> 0) & 0b111;
    const block1_state = (idx >> 3) & 0b111;
    const block2_state = (idx >> 6) & 0b111;
    
    // Check if block is in |111⟩ state (determines phase contribution)
    if (block0_state === 0b111) block0_negative += sign * prob;
    else block0_positive += sign * prob;
    
    if (block1_state === 0b111) block1_negative += sign * prob;
    else block1_positive += sign * prob;
    
    if (block2_state === 0b111) block2_negative += sign * prob;
    else block2_positive += sign * prob;
  }
  
  // Determine if blocks have consistent phases
  // If all blocks have same phase pattern relative to |000⟩ and |111⟩ states,
  // then no phase error
  
  // For properly encoded |0⟩_L, all amplitudes are positive
  // For |1⟩_L, |111⟩ states have negative amplitude
  
  // Compare phase patterns between blocks
  const block0_phase = Math.sign(block0_positive + block0_negative);
  const block1_phase = Math.sign(block1_positive + block1_negative);
  const block2_phase = Math.sign(block2_positive + block2_negative);
  
  // Syndrome: detect if any block has opposite phase
  const s1 = (block0_phase !== block1_phase) ? 1 : 0;
  const s2 = (block1_phase !== block2_phase) ? 1 : 0;
  
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
  const corrections: string[] = [];
  
  for (let blockIdx = 0; blockIdx < 3; blockIdx++) {
    const s1 = syndrome[blockIdx * 2];
    const s2 = syndrome[blockIdx * 2 + 1];
    const [q0, q1, q2] = blocks[blockIdx];
    
    if (s1 === 0 && s2 === 0) {
      // No error in this block
      corrections.push(`Блок ${blockIdx}: синдром (0,0) → ошибки нет`);
    } else if (s1 === 1 && s2 === 0) {
      // Perfect correction - no gate errors
      system.applyGate({ name: 'X', qubits: [q0], label: `X${q0} (bit correction)` });
      corrected.push(q0);
      corrections.push(`Блок ${blockIdx}: синдром (1,0) → применить X к q${q0}`);
    } else if (s1 === 1 && s2 === 1) {
      system.applyGate({ name: 'X', qubits: [q1], label: `X${q1} (bit correction)` });
      corrected.push(q1);
      corrections.push(`Блок ${blockIdx}: синдром (1,1) → применить X к q${q1}`);
    } else if (s1 === 0 && s2 === 1) {
      system.applyGate({ name: 'X', qubits: [q2], label: `X${q2} (bit correction)` });
      corrected.push(q2);
      corrections.push(`Блок ${blockIdx}: синдром (0,1) → применить X к q${q2}`);
    }
  }
  
  if (corrected.length > 0) {
    const correctionDescription = `✅ КОРРЕКЦИЯ БИТ-ФЛИП ОШИБОК:\n` +
      `${corrections.join('\n')}\n` +
      `\n🔧 Применён X-гейт (переворот бита) к кубитам: ${corrected.join(', ')}\n` +
      `Действие: X|0⟩ = |1⟩, X|1⟩ = |0⟩`;
    system.logStep('correction', correctionDescription);
  } else {
    const correctionDescription = `✅ КОРРЕКЦИЯ БИТ-ФЛИП ОШИБОК:\n` +
      `${corrections.join('\n')}\n` +
      `\n🎉 Ошибок не обнаружено - коррекция не требуется`;
    system.logStep('correction', correctionDescription);
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
  
  let correctionDescription = '';
  
  if (s1 === 0 && s2 === 0) {
    // No phase error
    correctionDescription = `✅ КОРРЕКЦИЯ ФАЗОВЫХ ОШИБОК:\n` +
      `Синдром (0,0) → фазовой ошибки нет\n` +
      `\n🎉 Коррекция не требуется`;
  } else if (s1 === 1 && s2 === 0) {
    // Block 0 has wrong phase relative to others - perfect correction
    system.applyGate({ name: 'Z', qubits: [0], label: 'Z₀ (phase correction)' });
    corrected.push(0);
    correctionDescription = `✅ КОРРЕКЦИЯ ФАЗОВЫХ ОШИБОК:\n` +
      `Синдром (1,0) → фазовая ошибка в блоке 0\n` +
      `\n🔧 Применён Z-гейт к q₀\n` +
      `Действие: Z|0⟩ = |0⟩, Z|1⟩ = -|1⟩ (переворот фазы)\n` +
      `Благодаря запутанности, коррекция одного кубита исправляет весь блок`;
  } else if (s1 === 1 && s2 === 1) {
    // Block 1 has wrong phase
    system.applyGate({ name: 'Z', qubits: [3], label: 'Z₃ (phase correction)' });
    corrected.push(3);
    correctionDescription = `✅ КОРРЕКЦИЯ ФАЗОВЫХ ОШИБОК:\n` +
      `Синдром (1,1) → фазовая ошибка в блоке 1\n` +
      `\n🔧 Применён Z-гейт к q₃\n` +
      `Действие: Z|0⟩ = |0⟩, Z|1⟩ = -|1⟩ (переворот фазы)\n` +
      `Благодаря запутанности, коррекция одного кубита исправляет весь блок`;
  } else if (s1 === 0 && s2 === 1) {
    // Block 2 has wrong phase
    system.applyGate({ name: 'Z', qubits: [6], label: 'Z₆ (phase correction)' });
    corrected.push(6);
    correctionDescription = `✅ КОРРЕКЦИЯ ФАЗОВЫХ ОШИБОК:\n` +
      `Синдром (0,1) → фазовая ошибка в блоке 2\n` +
      `\n🔧 Применён Z-гейт к q₆\n` +
      `Действие: Z|0⟩ = |0⟩, Z|1⟩ = -|1⟩ (переворот фазы)\n` +
      `Благодаря запутанности, коррекция одного кубита исправляет весь блок`;
  }
  
  system.logStep('correction', correctionDescription);
  
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
  // Step 1: Measure bit-flip syndrome
  const bitFlipSyndrome = measureBitFlipSyndrome(system);
  
  // Decode syndromes for each block
  const block0Syndrome = `(${bitFlipSyndrome[0]}, ${bitFlipSyndrome[1]})`;
  const block1Syndrome = `(${bitFlipSyndrome[2]}, ${bitFlipSyndrome[3]})`;
  const block2Syndrome = `(${bitFlipSyndrome[4]}, ${bitFlipSyndrome[5]})`;
  
  // Detailed measurement description
  const bitSyndromeDescription = `🔍 ИЗМЕРЕНИЕ БИТ-ФЛИП СИНДРОМА:\n` +
    `Алгоритм: для каждого блока из 3 кубитов измеряем четность пар.\n` +
    `Блок 0 (q₀,q₁,q₂): синдром ${block0Syndrome} - проверка Z₀Z₁ и Z₁Z₂\n` +
    `Блок 1 (q₃,q₄,q₅): синдром ${block1Syndrome} - проверка Z₃Z₄ и Z₄Z₅\n` +
    `Блок 2 (q₆,q₇,q₈): синдром ${block2Syndrome} - проверка Z₆Z₇ и Z₇Z₈\n` +
    `\n💡 Интерпретация:\n` +
    `(0,0) → нет ошибки | (1,0) → ошибка на 1-м кубите\n` +
    `(1,1) → ошибка на 2-м кубите | (0,1) → ошибка на 3-м кубите`;
  
  system.logStep('measurement', bitSyndromeDescription);
  const bitCorrected = correctBitFlipErrors(system, bitFlipSyndrome);
  
  // Step 2: Measure phase-flip syndrome
  const phaseFlipSyndrome = measurePhaseFlipSyndrome(system);
  
  const phaseSyndromeDescription = `🔍 ИЗМЕРЕНИЕ ФАЗОВОГО СИНДРОМА:\n` +
    `Алгоритм: проверяем согласованность фаз между блоками.\n` +
    `Синдром: (${phaseFlipSyndrome[0]}, ${phaseFlipSyndrome[1]})\n` +
    `\n💡 Интерпретация:\n` +
    `(0,0) → фазовой ошибки нет\n` +
    `(1,0) → фазовая ошибка в блоке 0 → применить Z₀\n` +
    `(1,1) → фазовая ошибка в блоке 1 → применить Z₃\n` +
    `(0,1) → фазовая ошибка в блоке 2 → применить Z₆\n` +
    `\n🎯 Метод: сравниваем относительные знаки амплитуд |000⟩ и |111⟩ в каждом блоке`;
  
  system.logStep('measurement', phaseSyndromeDescription);
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
  initialState: 'zero' | 'one' = 'zero'
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

