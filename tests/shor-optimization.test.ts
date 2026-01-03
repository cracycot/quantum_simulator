import { create9QubitShorSystem } from '../src/core/quantum/system';
import { encodeShor, measureBitFlipSyndrome, measurePhaseFlipSyndrome, correctBitFlipErrors, correctPhaseFlipErrors } from '../src/core/codes/shor';

describe('Shor Code Optimization Tests', () => {
  test('System has correct number of physical qubits (10 = 9 data + 1 ancilla)', () => {
    const system = create9QubitShorSystem();
    
    expect(system.numQubits).toBe(10);
    
    expect(system.state.dimension).toBe(1024);
    
    console.log(`✓ State space: 2^${system.numQubits} = ${system.state.dimension} (optimized from 2^17 = 131072)`);
  });

  test('Virtual-to-physical mapping is correct', () => {
    const system = create9QubitShorSystem();
    
    expect(system.virtualQubitMap).toBeDefined();
    
    if (system.virtualQubitMap) {
      
      for (let i = 9; i <= 16; i++) {
        expect(system.virtualQubitMap.get(i)).toBe(9);
      }
      
      console.log('✓ Virtual ancilla mapping verified:');
      console.log('  a0-a7 (virtual indices 9-16) → physical ancilla (index 9)');
    }
  });

  test('Encode logical |0⟩ and measure syndrome (should be all zeros)', () => {
    const system = create9QubitShorSystem();
    system.initializeLogicalZero();
    encodeShor(system);
    
    console.log('\n=== Testing syndrome measurement on perfect encoded state ===');
    
    const bitFlipSyndrome = measureBitFlipSyndrome(system);
    console.log('Bit-flip syndrome:', bitFlipSyndrome);
    
    expect(bitFlipSyndrome).toEqual([0, 0, 0, 0, 0, 0]);
    
    const phaseFlipSyndrome = measurePhaseFlipSyndrome(system);
    console.log('Phase-flip syndrome:', phaseFlipSyndrome);
    
    expect(phaseFlipSyndrome).toEqual([0, 0]);
    
    console.log('✓ Perfect encoded state has zero syndrome');
  });

  test('Detect and correct X error on q0 (bit-flip in block 1)', () => {
    const system = create9QubitShorSystem();
    system.initializeLogicalZero();
    encodeShor(system);
    
    console.log('\n=== Testing X error detection and correction ===');
    
    const idealState = system.state.clone();
    
    system.applyGatesWithDescription([
      { name: 'X', qubits: [0], label: 'X_q0 (noise)' }
    ], 'Test: X error on q0', 'noise');
    console.log('Applied X error to q0');
    
    const bitFlipSyndrome = measureBitFlipSyndrome(system);
    console.log('Bit-flip syndrome:', bitFlipSyndrome);
    
    expect(bitFlipSyndrome[0]).toBe(1); 
    expect(bitFlipSyndrome[1]).toBe(0); 
    
    expect(bitFlipSyndrome[2]).toBe(0);
    expect(bitFlipSyndrome[3]).toBe(0);
    expect(bitFlipSyndrome[4]).toBe(0);
    expect(bitFlipSyndrome[5]).toBe(0);
    
    const phaseFlipSyndrome = measurePhaseFlipSyndrome(system);
    expect(phaseFlipSyndrome).toEqual([0, 0]);
    
    console.log('✓ Syndrome correctly identifies X error on q0');
    
    const corrected = correctBitFlipErrors(system, bitFlipSyndrome);
    console.log('Corrected qubits:', corrected);
    expect(corrected).toEqual([0]);
    
    const fidelity = system.state.fidelity(idealState);
    console.log('Fidelity after correction:', fidelity.toFixed(6));
    expect(fidelity).toBeGreaterThan(0.99);
    
    console.log('✓ X error successfully corrected');
  });

  test('Detect and correct Z error on q0 (phase-flip in block 1)', () => {
    const system = create9QubitShorSystem();
    system.initializeLogicalZero();
    encodeShor(system);
    
    console.log('\n=== Testing Z error detection and correction ===');
    
    const idealState = system.state.clone();
    
    system.applyGatesWithDescription([
      { name: 'Z', qubits: [0], label: 'Z_q0 (noise)' }
    ], 'Test: Z error on q0', 'noise');
    console.log('Applied Z error to q0');
    
    const bitFlipSyndrome = measureBitFlipSyndrome(system);
    console.log('Bit-flip syndrome:', bitFlipSyndrome);
    expect(bitFlipSyndrome).toEqual([0, 0, 0, 0, 0, 0]);
    
    const phaseFlipSyndrome = measurePhaseFlipSyndrome(system);
    console.log('Phase-flip syndrome:', phaseFlipSyndrome);
    
    expect(phaseFlipSyndrome[0]).toBe(1); 
    expect(phaseFlipSyndrome[1]).toBe(0); 
    
    console.log('✓ Syndrome correctly identifies Z error in block 1');
    
    const corrected = correctPhaseFlipErrors(system, phaseFlipSyndrome);
    console.log('Corrected qubits:', corrected);
    expect(corrected).toEqual([0]);
    
    const fidelity = system.state.fidelity(idealState);
    console.log('Fidelity after correction:', fidelity.toFixed(6));
    expect(fidelity).toBeGreaterThan(0.99);
    
    console.log('✓ Z error successfully corrected');
  });

  test('Detect and correct Y error (combined X and Z)', () => {
    const system = create9QubitShorSystem();
    system.initializeLogicalZero();
    encodeShor(system);
    
    console.log('\n=== Testing Y error detection and correction ===');
    
    const idealState = system.state.clone();
    
    system.applyGatesWithDescription([
      { name: 'Y', qubits: [4], label: 'Y_q4 (noise)' }
    ], 'Test: Y error on q4', 'noise');
    console.log('Applied Y error to q4');
    
    const bitFlipSyndrome = measureBitFlipSyndrome(system);
    console.log('Bit-flip syndrome:', bitFlipSyndrome);
    
    expect(bitFlipSyndrome[2]).toBe(1); 
    expect(bitFlipSyndrome[3]).toBe(1); 
    
    const phaseFlipSyndrome = measurePhaseFlipSyndrome(system);
    console.log('Phase-flip syndrome:', phaseFlipSyndrome);
    
    expect(phaseFlipSyndrome[0]).toBe(1); 
    expect(phaseFlipSyndrome[1]).toBe(1); 
    
    console.log('✓ Syndrome correctly identifies Y error (X and Z components)');
    
    const bitCorrected = correctBitFlipErrors(system, bitFlipSyndrome);
    const phaseCorrected = correctPhaseFlipErrors(system, phaseFlipSyndrome);
    console.log('Corrected qubits - bit:', bitCorrected, ', phase:', phaseCorrected);
    
    const fidelity = system.state.fidelity(idealState);
    console.log('Fidelity after correction:', fidelity.toFixed(6));
    expect(fidelity).toBeGreaterThan(0.99);
    
    console.log('✓ Y error successfully corrected');
  });

  test('Reset operation works correctly between measurements', () => {
    const system = create9QubitShorSystem();
    system.initializeLogicalZero();
    encodeShor(system);
    
    console.log('\n=== Testing ancilla reset between measurements ===');
    
    system.applyGatesWithDescription([
      { name: 'CNOT', qubits: [0, 9], label: 'CNOT_{q0→a0}' },
      { name: 'CNOT', qubits: [1, 9], label: 'CNOT_{q1→a0}' }
    ], 'First syndrome measurement', 'measurement');
    
    const result1 = system.measureQubit(9);
    console.log('First measurement result:', result1);
    
    system.resetQubit(9);
    console.log('Reset ancilla to |0⟩');
    
    const prob0 = 1 - system.state.qubitProbability(9);
    console.log('P(|0⟩) for physical ancilla:', prob0.toFixed(6));
    expect(prob0).toBeGreaterThan(0.99);
    
    console.log('✓ Ancilla successfully reset for reuse');
  });

  test('Memory optimization: compare state vector sizes', () => {
    const systemOptimized = create9QubitShorSystem();
    
    console.log('\n=== Memory Optimization Comparison ===');
    console.log('Optimized system:');
    console.log('  Qubits: 10 (9 data + 1 physical ancilla)');
    console.log('  State space: 2^10 =', systemOptimized.state.dimension);
    console.log('  Memory: ~', systemOptimized.state.dimension * 16, 'bytes (2 floats per complex number)');
    
    console.log('\nNon-optimized (theoretical):');
    const nonOptimizedDimension = Math.pow(2, 17);
    console.log('  Qubits: 17 (9 data + 8 ancillas)');
    console.log('  State space: 2^17 =', nonOptimizedDimension);
    console.log('  Memory: ~', nonOptimizedDimension * 16, 'bytes');
    
    const reduction = nonOptimizedDimension / systemOptimized.state.dimension;
    console.log('\nMemory reduction factor:', reduction.toFixed(1) + 'x');
    console.log('Memory saved:', ((1 - 1/reduction) * 100).toFixed(1) + '%');
    
    expect(reduction).toBeGreaterThan(100);
    
    console.log('✓ Significant memory savings achieved');
  });
});

console.log('\n' + '='.repeat(60));
console.log('Running Shor Code Optimization Tests...');
console.log('='.repeat(60));
