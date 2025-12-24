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
 * - Qubits 0,1,2: Block 1 (3-qubit repetition code for X errors)
 * - Qubits 3,4,5: Block 2 (3-qubit repetition code for X errors)
 * - Qubits 6,7,8: Block 3 (3-qubit repetition code for X errors)
 * - Between blocks: phase repetition code for Z errors
 * 
 * Stabilizers:
 * 
 * BIT-FLIP (X-error) Detection - 6 ZZ stabilizers:
 *   Block 1: S0 = Z₀Z₁, S1 = Z₁Z₂
 *   Block 2: S2 = Z₃Z₄, S3 = Z₄Z₅
 *   Block 3: S4 = Z₆Z₇, S5 = Z₇Z₈
 * 
 * PHASE-FLIP (Z-error) Detection - 2 X⊗⁶ stabilizers:
 *   S6 = X₀X₁X₂X₃X₄X₅ (blocks 1 & 2 have same phase)
 *   S7 = X₃X₄X₅X₆X₇X₈ (blocks 2 & 3 have same phase)
 * 
 * How Z-errors are detected:
 * A Z-error on any qubit in block i flips the phase of that block:
 *   (|000⟩ + |111⟩) → (|000⟩ - |111⟩) or vice versa
 * This phase difference is detected by X-basis measurements (S6, S7)
 * which compare phases between blocks.
 * 
 * Syndrome interpretation:
 * - Bit-flip: (s0,s1) per block → which qubit in block has X error
 * - Phase-flip: (s6,s7) → which block has Z error
 * 
 * Optimization:
 * Uses sequential ancilla reuse: 9 data qubits + 1 physical ancilla
 * State space: 2^10 = 1024 (instead of 2^17 = 131072 with 8 ancillas)
 * All 8 syndrome measurements done sequentially with measure-reset cycles
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
 * Encoding: 2 layers
 * Layer A: Phase repetition on leaders (q0, q3, q6)
 * Layer B: Bit repetition within each block
 */
export function encodeShor(system: QuantumSystem): void {
  // === LAYER A: Phase Repetition ===
  // Step A1: Apply Hadamard to q0 first (create superposition)
  system.applyGatesWithDescription([
    { name: 'H', qubits: [0], label: 'H_{q0}' }
  ], '🌀 ШАГ A1: Hadamard на q₀\nСоздание суперпозиции: |0⟩ → |+⟩ = (|0⟩+|1⟩)/√2\nили |1⟩ → |−⟩ = (|0⟩−|1⟩)/√2', 'encode');
  
  // Step A2: CNOT q0 -> q3
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [0, 3], label: 'CNOT_{q0→q3}' }
  ], '🔗 ШАГ A2: CNOT(q₀→q₃)\nКопирование состояния на лидера блока 2', 'encode');
  
  // Step A3: CNOT q0 -> q6
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [0, 6], label: 'CNOT_{q0→q6}' }
  ], '🔗 ШАГ A3: CNOT(q₀→q₆)\nКопирование состояния на лидера блока 3', 'encode');
  
  // Step A4: Apply Hadamard to all leaders (q0, q3, q6)
  system.applyGatesWithDescription([
    { name: 'H', qubits: [0], label: 'H_{q0}' },
    { name: 'H', qubits: [3], label: 'H_{q3}' },
    { name: 'H', qubits: [6], label: 'H_{q6}' }
  ], '🌀 ШАГ A4: Hadamard на всех лидерах (q₀, q₃, q₆)\nПереход в X-базис для защиты от фазовых ошибок', 'encode');
  
  // === LAYER B (Step A5): Bit Repetition within blocks ===
  // Block 1: q0 → q1, q2
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [0, 1], label: 'CNOT_{q0→q1}' },
    { name: 'CNOT', qubits: [0, 2], label: 'CNOT_{q0→q2}' }
  ], '🔗 ШАГ A5: Битовый repetition в блоке 1 (q₀,q₁,q₂)\nCNOT(q₀→q₁), CNOT(q₀→q₂)\nЗащита от битовых ошибок внутри блока', 'encode');
  
  // Block 2: q3 → q4, q5
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [3, 4], label: 'CNOT_{q3→q4}' },
    { name: 'CNOT', qubits: [3, 5], label: 'CNOT_{q3→q5}' }
  ], '🔗 ШАГ A5: Битовый repetition в блоке 2 (q₃,q₄,q₅)\nCNOT(q₃→q₄), CNOT(q₃→q₅)\nЗащита от битовых ошибок внутри блока', 'encode');
  
  // Block 3: q6 → q7, q8
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [6, 7], label: 'CNOT_{q6→q7}' },
    { name: 'CNOT', qubits: [6, 8], label: 'CNOT_{q6→q8}' }
  ], '🔗 ШАГ A5: Битовый repetition в блоке 3 (q₆,q₇,q₈)\nCNOT(q₆→q₇), CNOT(q₆→q₈)\nЗащита от битовых ошибок внутри блока', 'encode');
  
  system.logStep('encode', '✨ Кодирование завершено: 1 логический кубит → 9 физических\n|0⟩_L = (|000⟩+|111⟩)/√2 ⊗ (|000⟩+|111⟩)/√2 ⊗ (|000⟩+|111⟩)/√2\n|1⟩_L = (|000⟩−|111⟩)/√2 ⊗ (|000⟩−|111⟩)/√2 ⊗ (|000⟩−|111⟩)/√2');
}

/**
 * Decode 9-qubit Shor code back to single qubit
 * Reverse of encodeShor: undo Layer B, then Layer A
 */
export function decodeShor(system: QuantumSystem): void {
  // === Reverse LAYER B (Step A5): Bit Repetition ===
  // Block 3: undo q6 → q7, q8
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [6, 8], label: 'CNOT_{q6→q8}' },
    { name: 'CNOT', qubits: [6, 7], label: 'CNOT_{q6→q7}' }
  ], 'Reverse bit repetition in block 3', 'decode');
  
  // Block 2: undo q3 → q4, q5
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [3, 5], label: 'CNOT_{q3→q5}' },
    { name: 'CNOT', qubits: [3, 4], label: 'CNOT_{q3→q4}' }
  ], 'Reverse bit repetition in block 2', 'decode');
  
  // Block 1: undo q0 → q1, q2
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [0, 2], label: 'CNOT_{q0→q2}' },
    { name: 'CNOT', qubits: [0, 1], label: 'CNOT_{q0→q1}' }
  ], 'Reverse bit repetition in block 1', 'decode');
  
  // === Reverse LAYER A ===
  // Reverse Step A4: Hadamard on all leaders (q0, q3, q6)
  system.applyGatesWithDescription([
    { name: 'H', qubits: [6], label: 'H_{q6}' },
    { name: 'H', qubits: [3], label: 'H_{q3}' },
    { name: 'H', qubits: [0], label: 'H_{q0}' }
  ], 'Reverse Hadamard on all leaders', 'decode');
  
  // Reverse Step A3: CNOT q0 -> q6
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [0, 6], label: 'CNOT_{q0→q6}' }
  ], 'Reverse CNOT q0→q6', 'decode');
  
  // Reverse Step A2: CNOT q0 -> q3
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [0, 3], label: 'CNOT_{q0→q3}' }
  ], 'Reverse CNOT q0→q3', 'decode');
  
  // Reverse Step A1: Hadamard on q0
  system.applyGatesWithDescription([
    { name: 'H', qubits: [0], label: 'H_{q0}' }
  ], 'Reverse Hadamard: |+⟩ → |0⟩ or |−⟩ → |1⟩', 'decode');
  
  system.logStep('decode', 'Decoded from 9-qubit Shor code');
}

/**
 * Measure bit-flip syndromes using sequential ancilla reuse
 * Returns 6 syndrome bits (2 per block)
 * 
 * Optimized measurement protocol (9+1 qubits instead of 9+8):
 * For each syndrome S_k:
 *   1. Ancilla starts in |0⟩ (or reset to |0⟩)
 *   2. Apply CNOT(data_i → ancilla) for qubits in stabilizer
 *   3. Measure ancilla in Z basis → s_k
 *   4. Reset ancilla to |0⟩ for reuse
 * 
 * All virtual ancillas (a0-a7, indices 9-16) map to physical ancilla (index 9)
 */
export function measureBitFlipSyndrome(system: QuantumSystem): [number, number, number, number, number, number] {
  const syndromes: number[] = [];
  
  // Block 1: q0, q1, q2
  // S0 = Z_q0 Z_q1 (virtual a0 → physical index 9)
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [0, 9], label: 'CNOT_{q0→a0}' },
    { name: 'CNOT', qubits: [1, 9], label: 'CNOT_{q1→a0}' }
  ], '🔍 Измерение S₀ = Z_{q0}Z_{q1} через анциллу a₀', 'measurement');
  syndromes.push(system.measureQubit(9));
  system.resetQubit(9); // Reset physical ancilla for reuse
  
  // S1 = Z_q1 Z_q2 (virtual a1 → physical index 9, reused after reset)
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [1, 10], label: 'CNOT_{q1→a1}' },
    { name: 'CNOT', qubits: [2, 10], label: 'CNOT_{q2→a1}' }
  ], '🔍 Измерение S₁ = Z_{q1}Z_{q2} через анциллу a₁', 'measurement');
  syndromes.push(system.measureQubit(10));
  system.resetQubit(10); // Reset for next measurement
  
  // Block 2: q3, q4, q5
  // S2 = Z_q3 Z_q4 (virtual a2 → physical index 9, reused)
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [3, 11], label: 'CNOT_{q3→a2}' },
    { name: 'CNOT', qubits: [4, 11], label: 'CNOT_{q4→a2}' }
  ], '🔍 Измерение S₂ = Z_{q3}Z_{q4} через анциллу a₂', 'measurement');
  syndromes.push(system.measureQubit(11));
  system.resetQubit(11);
  
  // S3 = Z_q4 Z_q5 (virtual a3 → physical index 9, reused)
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [4, 12], label: 'CNOT_{q4→a3}' },
    { name: 'CNOT', qubits: [5, 12], label: 'CNOT_{q5→a3}' }
  ], '🔍 Измерение S₃ = Z_{q4}Z_{q5} через анциллу a₃', 'measurement');
  syndromes.push(system.measureQubit(12));
  system.resetQubit(12);
  
  // Block 3: q6, q7, q8
  // S4 = Z_q6 Z_q7 (virtual a4 → physical index 9, reused)
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [6, 13], label: 'CNOT_{q6→a4}' },
    { name: 'CNOT', qubits: [7, 13], label: 'CNOT_{q7→a4}' }
  ], '🔍 Измерение S₄ = Z_{q6}Z_{q7} через анциллу a₄', 'measurement');
  syndromes.push(system.measureQubit(13));
  system.resetQubit(13);
  
  // S5 = Z_q7 Z_q8 (virtual a5 → physical index 9, reused)
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [7, 14], label: 'CNOT_{q7→a5}' },
    { name: 'CNOT', qubits: [8, 14], label: 'CNOT_{q8→a5}' }
  ], '🔍 Измерение S₅ = Z_{q7}Z_{q8} через анциллу a₅', 'measurement');
  syndromes.push(system.measureQubit(14));
  system.resetQubit(14);
  
  return syndromes as [number, number, number, number, number, number];
}

/**
 * Measure phase-flip syndromes using sequential ancilla reuse
 * 
 * S6 = X_q0 X_q1 X_q2 X_q3 X_q4 X_q5 (blocks 1 and 2)
 * S7 = X_q3 X_q4 X_q5 X_q6 X_q7 X_q8 (blocks 2 and 3)
 * 
 * Measurement process (X-basis measurement):
 * 1. Prepare ancilla in |+⟩ (H gate)
 * 2. Apply CNOT(ancilla → data) for each data qubit
 * 3. Measure ancilla in X basis (H then measure Z)
 * 4. Reset ancilla to |0⟩ for reuse
 */
export function measurePhaseFlipSyndrome(system: QuantumSystem): [number, number] {
  // Use virtual ancilla indices: a6 = 15, a7 = 16
  // These map to physical ancilla (index 9) via virtualization layer
  
  // S6 = X_q0 X_q1 X_q2 X_q3 X_q4 X_q5 (ancilla a6 = index 15)
  // Prepare a6 in |+⟩
  system.applyGatesWithDescription([
    { name: 'H', qubits: [15], label: 'H_{a6}' }
  ], '🔍 Подготовка анциллы a₆ в состояние |+⟩', 'measurement');
  
  // Apply CNOT(a6 → q_i) for blocks 1 and 2
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [15, 0], label: 'CNOT_{a6→q0}' },
    { name: 'CNOT', qubits: [15, 1], label: 'CNOT_{a6→q1}' },
    { name: 'CNOT', qubits: [15, 2], label: 'CNOT_{a6→q2}' },
    { name: 'CNOT', qubits: [15, 3], label: 'CNOT_{a6→q3}' },
    { name: 'CNOT', qubits: [15, 4], label: 'CNOT_{a6→q4}' },
    { name: 'CNOT', qubits: [15, 5], label: 'CNOT_{a6→q5}' }
  ], '🔍 Измерение S₆ = X_{q0}...X_{q5} через анциллу a₆', 'measurement');
  
  // Measure in X basis (H then measure Z)
  system.applyGatesWithDescription([
    { name: 'H', qubits: [15], label: 'H_{a6}' }
  ], '🔍 Переход в X-базис для измерения a₆', 'measurement');
  
  const s6 = system.measureQubit(15);
  system.resetQubit(15); // Reset for next measurement
  
  // S7 = X_q3 X_q4 X_q5 X_q6 X_q7 X_q8 (virtual a7 → physical index 9, reused)
  // Prepare a7 in |+⟩
  system.applyGatesWithDescription([
    { name: 'H', qubits: [16], label: 'H_{a7}' }
  ], '🔍 Подготовка анциллы a₇ в состояние |+⟩', 'measurement');
  
  // Apply CNOT(a7 → q_i) for blocks 2 and 3
  system.applyGatesWithDescription([
    { name: 'CNOT', qubits: [16, 3], label: 'CNOT_{a7→q3}' },
    { name: 'CNOT', qubits: [16, 4], label: 'CNOT_{a7→q4}' },
    { name: 'CNOT', qubits: [16, 5], label: 'CNOT_{a7→q5}' },
    { name: 'CNOT', qubits: [16, 6], label: 'CNOT_{a7→q6}' },
    { name: 'CNOT', qubits: [16, 7], label: 'CNOT_{a7→q7}' },
    { name: 'CNOT', qubits: [16, 8], label: 'CNOT_{a7→q8}' }
  ], '🔍 Измерение S₇ = X_{q3}...X_{q8} через анциллу a₇', 'measurement');
  
  // Measure in X basis (H then measure Z)
  system.applyGatesWithDescription([
    { name: 'H', qubits: [16], label: 'H_{a7}' }
  ], '🔍 Переход в X-базис для измерения a₇', 'measurement');
  
  const s7 = system.measureQubit(16);
  system.resetQubit(16); // Reset (though not strictly necessary as it's the last measurement)
  
  return [s6, s7];
}

/**
 * Correct bit-flip errors based on syndrome
 */
export function correctBitFlipErrors(
  system: QuantumSystem, 
  syndrome: [number, number, number, number, number, number]
): number[] {
  const corrected: number[] = [];
  const blocks = [[0, 1, 2], [3, 4, 5], [6, 7, 8]]; // q0-q2, q3-q5, q6-q8
  const blockLabels = ['1 (q₀,q₁,q₂)', '2 (q₃,q₄,q₅)', '3 (q₆,q₇,q₈)'];
  const corrections: string[] = [];
  
  for (let blockIdx = 0; blockIdx < 3; blockIdx++) {
    const s1 = syndrome[blockIdx * 2];
    const s2 = syndrome[blockIdx * 2 + 1];
    const [q0, q1, q2] = blocks[blockIdx];
    const dataLabels = [`q${q0}`, `q${q1}`, `q${q2}`];
    
    if (s1 === 0 && s2 === 0) {
      // No error in this block
      corrections.push(`Блок ${blockLabels[blockIdx]}: синдром (0,0) → ошибки нет`);
    } else if (s1 === 1 && s2 === 0) {
      // Error on first qubit of block
      system.applyGatesWithDescription(
        [{ name: 'X', qubits: [q0], label: `X_{${dataLabels[0]}}` }],
        `✅ Коррекция: X на ${dataLabels[0]}`,
        'correction'
      );
      corrected.push(q0);
      corrections.push(`Блок ${blockLabels[blockIdx]}: синдром (1,0) → применить X к ${dataLabels[0]}`);
    } else if (s1 === 1 && s2 === 1) {
      // Error on second qubit of block
      system.applyGatesWithDescription(
        [{ name: 'X', qubits: [q1], label: `X_{${dataLabels[1]}}` }],
        `✅ Коррекция: X на ${dataLabels[1]}`,
        'correction'
      );
      corrected.push(q1);
      corrections.push(`Блок ${blockLabels[blockIdx]}: синдром (1,1) → применить X к ${dataLabels[1]}`);
    } else if (s1 === 0 && s2 === 1) {
      // Error on third qubit of block
      system.applyGatesWithDescription(
        [{ name: 'X', qubits: [q2], label: `X_{${dataLabels[2]}}` }],
        `✅ Коррекция: X на ${dataLabels[2]}`,
        'correction'
      );
      corrected.push(q2);
      corrections.push(`Блок ${blockLabels[blockIdx]}: синдром (0,1) → применить X к ${dataLabels[2]}`);
    }
  }
  
  if (corrected.length > 0) {
    const correctedLabels = corrected.map(i => `q${i}`).join(', ');
    const correctionDescription = `✅ КОРРЕКЦИЯ БИТ-ФЛИП ОШИБОК:\n` +
      `${corrections.join('\n')}\n` +
      `\n🔧 Применён X-гейт (переворот бита) к кубитам: ${correctedLabels}\n` +
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
 * 
 * Syndrome interpretation (S6, S7):
 * (0,0) → No Z error
 * (1,0) → Z error in block 1 (q0,q1,q2)
 * (1,1) → Z error in block 2 (q3,q4,q5)
 * (0,1) → Z error in block 3 (q6,q7,q8)
 */
export function correctPhaseFlipErrors(
  system: QuantumSystem,
  syndrome: [number, number]
): number[] {
  const corrected: number[] = [];
  const [s6, s7] = syndrome;
  
  let correctionDescription = '';
  
  if (s6 === 0 && s7 === 0) {
    // No phase error
    correctionDescription = `✅ КОРРЕКЦИЯ ФАЗОВЫХ ОШИБОК:\n` +
      `Синдром (0,0) → фазовой ошибки нет\n` +
      `\n🎉 Коррекция не требуется`;
  } else if (s6 === 1 && s7 === 0) {
    // Block 1 has Z error - apply Z to q0
    system.applyGatesWithDescription(
      [{ name: 'Z', qubits: [0], label: 'Z_{q0}' }],
      '✅ Коррекция: Z на q₀',
      'correction'
    );
    corrected.push(0);
    correctionDescription = `✅ КОРРЕКЦИЯ ФАЗОВЫХ ОШИБОК:\n` +
      `Синдром (1,0) → фазовая ошибка в блоке 1 (q₀,q₁,q₂)\n` +
      `\n🔧 Применён Z-гейт к q₀\n` +
      `Действие: Z|0⟩ = |0⟩, Z|1⟩ = -|1⟩ (переворот фазы)\n` +
      `Благодаря запутанности, коррекция одного кубита исправляет весь блок`;
  } else if (s6 === 1 && s7 === 1) {
    // Block 2 has Z error - apply Z to q3
    system.applyGatesWithDescription(
      [{ name: 'Z', qubits: [3], label: 'Z_{q3}' }],
      '✅ Коррекция: Z на q₃',
      'correction'
    );
    corrected.push(3);
    correctionDescription = `✅ КОРРЕКЦИЯ ФАЗОВЫХ ОШИБОК:\n` +
      `Синдром (1,1) → фазовая ошибка в блоке 2 (q₃,q₄,q₅)\n` +
      `\n🔧 Применён Z-гейт к q₃\n` +
      `Действие: Z|0⟩ = |0⟩, Z|1⟩ = -|1⟩ (переворот фазы)\n` +
      `Благодаря запутанности, коррекция одного кубита исправляет весь блок`;
  } else if (s6 === 0 && s7 === 1) {
    // Block 3 has Z error - apply Z to q6
    system.applyGatesWithDescription(
      [{ name: 'Z', qubits: [6], label: 'Z_{q6}' }],
      '✅ Коррекция: Z на q₆',
      'correction'
    );
    corrected.push(6);
    correctionDescription = `✅ КОРРЕКЦИЯ ФАЗОВЫХ ОШИБОК:\n` +
      `Синдром (0,1) → фазовая ошибка в блоке 3 (q₆,q₇,q₈)\n` +
      `\n🔧 Применён Z-гейт к q₆\n` +
      `Действие: Z|0⟩ = |0⟩, Z|1⟩ = -|1⟩ (переворот фазы)\n` +
      `Благодаря запутанности, коррекция одного кубита исправляет весь блок`;
  }
  
  system.logStep('correction', correctionDescription);
  
  return corrected;
}

/**
 * Full syndrome measurement and correction for Shor code
 * 
 * This function implements the complete error detection and correction cycle:
 * 
 * 1. Measure 6 bit-flip syndromes (ZZ stabilizers) to detect X errors
 *    - Each block has 2 syndromes to localize X error within block
 * 
 * 2. Measure 2 phase-flip syndromes (X⊗⁶ stabilizers) to detect Z errors
 *    - Compares phases between blocks to detect which block has Z error
 * 
 * Physical interpretation:
 * - X error in block i: flips bit, detected by ZZ measurements within block
 * - Z error in block i: flips phase (|000⟩+|111⟩) ↔ (|000⟩-|111⟩)
 *   Phase flip is invisible to ZZ (both have same Z eigenvalue)
 *   But visible to XXX...X (different X eigenvalue)
 * 
 * Why this works:
 * - Inner code (3-qubit repetition per block): catches X errors
 * - Outer code (3-block phase repetition): catches Z errors
 * - Together: can correct any single-qubit Pauli error (X, Y, Z)
 *   (Y = iXZ, so correcting X and Z components fixes Y)
 */
export function measureAndCorrectShor(system: QuantumSystem): {
  bitFlipSyndrome: [number, number, number, number, number, number];
  phaseFlipSyndrome: [number, number];
  bitCorrected: number[];
  phaseCorrected: number[];
} {
  // Step 1: Measure bit-flip syndrome using 6 ancilla qubits
  const bitFlipSyndrome = measureBitFlipSyndrome(system);
  
  // Decode syndromes for each block
  const block1Syndrome = `(${bitFlipSyndrome[0]}, ${bitFlipSyndrome[1]})`;
  const block2Syndrome = `(${bitFlipSyndrome[2]}, ${bitFlipSyndrome[3]})`;
  const block3Syndrome = `(${bitFlipSyndrome[4]}, ${bitFlipSyndrome[5]})`;
  
  // Detailed measurement description
  const bitSyndromeDescription = `🔍 ИЗМЕРЕНИЕ БИТ-ФЛИП СИНДРОМА (6 ZZ стабилизаторов):\n` +
    `Метод: Измерение через анциллы a₀-a₅\n` +
    `Блок 1 (q₀,q₁,q₂): синдром ${block1Syndrome}\n` +
    `  S₀ = Z_{q0}Z_{q1} → a₀ = ${bitFlipSyndrome[0]}\n` +
    `  S₁ = Z_{q1}Z_{q2} → a₁ = ${bitFlipSyndrome[1]}\n` +
    `Блок 2 (q₃,q₄,q₅): синдром ${block2Syndrome}\n` +
    `  S₂ = Z_{q3}Z_{q4} → a₂ = ${bitFlipSyndrome[2]}\n` +
    `  S₃ = Z_{q4}Z_{q5} → a₃ = ${bitFlipSyndrome[3]}\n` +
    `Блок 3 (q₆,q₇,q₈): синдром ${block3Syndrome}\n` +
    `  S₄ = Z_{q6}Z_{q7} → a₄ = ${bitFlipSyndrome[4]}\n` +
    `  S₅ = Z_{q7}Z_{q8} → a₅ = ${bitFlipSyndrome[5]}\n` +
    `\n💡 Интерпретация:\n` +
    `(0,0) → нет X-ошибки | (1,0) → X на 1-м кубите блока\n` +
    `(1,1) → X на 2-м кубите | (0,1) → X на 3-м кубите`;
  
  system.logStep('measurement', bitSyndromeDescription);
  const bitCorrected = correctBitFlipErrors(system, bitFlipSyndrome);
  
  // Step 2: Measure phase-flip syndrome using 2 ancilla qubits
  const phaseFlipSyndrome = measurePhaseFlipSyndrome(system);
  
  const phaseSyndromeDescription = `🔍 ИЗМЕРЕНИЕ ФАЗОВОГО СИНДРОМА (2 X...X стабилизатора):\n` +
    `Метод: Измерение через анциллы a₆,a₇ в X-базисе\n` +
    `S₆ = X_{q0}...X_{q5} → a₆ = ${phaseFlipSyndrome[0]}\n` +
    `S₇ = X_{q3}...X_{q8} → a₇ = ${phaseFlipSyndrome[1]}\n` +
    `Синдром: (${phaseFlipSyndrome[0]}, ${phaseFlipSyndrome[1]})\n` +
    `\n💡 Интерпретация:\n` +
    `(0,0) → фазовой ошибки нет\n` +
    `(1,0) → Z-ошибка в блоке 1 → применить Z_{q0}\n` +
    `(1,1) → Z-ошибка в блоке 2 → применить Z_{q3}\n` +
    `(0,1) → Z-ошибка в блоке 3 → применить Z_{q6}`;
  
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
 * |0⟩_L = (|000⟩ + |111⟩)/√2 ⊗ (|000⟩ + |111⟩)/√2 ⊗ (|000⟩ + |111⟩)/√2
 */
export function getShorLogicalZeroState(): StateVector {
  const sv = new StateVector(17); // 9 data + 8 ancilla (all ancilla in |0⟩)
  const norm = 1 / (2 * Math.sqrt(2));
  
  // All combinations of (000, 111) for each block in data qubits (d1-d9 = indices 0-8)
  // Ancilla qubits (indices 9-16) remain in |0⟩
  const dataPatterns = [
    0b000000000, // 000 000 000
    0b000000111, // 000 000 111
    0b000111000, // 000 111 000
    0b000111111, // 000 111 111
    0b111000000, // 111 000 000
    0b111000111, // 111 000 111
    0b111111000, // 111 111 000
    0b111111111, // 111 111 111
  ];
  
  for (const p of dataPatterns) {
    // Data qubits in pattern, ancilla qubits in |0⟩ (bits 9-16 are 0)
    sv.amplitudes[p] = new Complex(norm);
  }
  
  return sv;
}

export function getShorLogicalOneState(): StateVector {
  const sv = new StateVector(17); // 9 data + 8 ancilla
  const norm = 1 / (2 * Math.sqrt(2));
  
  // |1⟩_L = (|000⟩ - |111⟩)/√2 ⊗ (|000⟩ - |111⟩)/√2 ⊗ (|000⟩ - |111⟩)/√2
  // Sign is (-1)^(number of 111 blocks)
  const patterns = [
    { idx: 0b000000000, sign: 1 },   // 0 blocks with 111: +
    { idx: 0b000000111, sign: -1 },  // 1 block with 111: -
    { idx: 0b000111000, sign: -1 },
    { idx: 0b000111111, sign: 1 },   // 2 blocks with 111: +
    { idx: 0b111000000, sign: -1 },
    { idx: 0b111000111, sign: 1 },
    { idx: 0b111111000, sign: 1 },
    { idx: 0b111111111, sign: -1 },  // 3 blocks with 111: -
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
  { block: 1, syndrome: '(0,0)', meaning: 'No error', correction: 'None' },
  { block: 1, syndrome: '(1,0)', meaning: 'Error on q₀', correction: 'Apply X_{q0}' },
  { block: 1, syndrome: '(1,1)', meaning: 'Error on q₁', correction: 'Apply X_{q1}' },
  { block: 1, syndrome: '(0,1)', meaning: 'Error on q₂', correction: 'Apply X_{q2}' },
  { block: 2, syndrome: '(0,0)', meaning: 'No error', correction: 'None' },
  { block: 2, syndrome: '(1,0)', meaning: 'Error on q₃', correction: 'Apply X_{q3}' },
  { block: 2, syndrome: '(1,1)', meaning: 'Error on q₄', correction: 'Apply X_{q4}' },
  { block: 2, syndrome: '(0,1)', meaning: 'Error on q₅', correction: 'Apply X_{q5}' },
  { block: 3, syndrome: '(0,0)', meaning: 'No error', correction: 'None' },
  { block: 3, syndrome: '(1,0)', meaning: 'Error on q₆', correction: 'Apply X_{q6}' },
  { block: 3, syndrome: '(1,1)', meaning: 'Error on q₇', correction: 'Apply X_{q7}' },
  { block: 3, syndrome: '(0,1)', meaning: 'Error on q₈', correction: 'Apply X_{q8}' },
];

export const shorPhaseFlipSyndromeTable = [
  { syndrome: '(0,0)', meaning: 'No phase error', correction: 'None' },
  { syndrome: '(1,0)', meaning: 'Phase error in block 1', correction: 'Apply Z_{q0}' },
  { syndrome: '(1,1)', meaning: 'Phase error in block 2', correction: 'Apply Z_{q3}' },
  { syndrome: '(0,1)', meaning: 'Phase error in block 3', correction: 'Apply Z_{q6}' },
];

