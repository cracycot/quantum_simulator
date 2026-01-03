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

export function encodeRepetition(system: QuantumSystem): void {
  
  system.logStep('encode', 'Кодирование завершено: 3-кубитный код');
}

export function decodeRepetition(system: QuantumSystem): void {
  
  system.applyGate({ name: 'CNOT', qubits: [0, 2], label: 'CNOT₀₂' });
  system.applyGate({ name: 'CNOT', qubits: [0, 1], label: 'CNOT₀₁' });
  
  system.logStep('decode', 'Decoded from 3-qubit repetition code');
}

export function measureSyndromeRepetition(system: QuantumSystem): [number, number] {

  if (system.numQubits >= 5) {
    const a0 = 3;
    const a1 = 4;
    
    system.applyGatesWithDescription(
      [
        { name: 'CNOT', qubits: [0, a0], label: 'CNOT₀→a₀ (syndrome)' },
        { name: 'CNOT', qubits: [1, a0], label: 'CNOT₁→a₀ (syndrome)' }
      ],
      'Syndrome coupling for Z₀Z₁',
      'measurement'
    );
    const s1 = system.measureQubit(a0, 'Measure a₀ (Z): s₁ = parity(q₀,q₁)');
    
    if (s1 === 1) {
      applyGate(system.state, { name: 'X', qubits: [a0] });
    }
    
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

export function correctErrorRepetition(system: QuantumSystem, syndrome: [number, number]): number | null {
  const [s1, s2] = syndrome;
  
  let correctedQubit: number | null = null;
  
  if (s1 === 0 && s2 === 0) {
    
    correctedQubit = null;
  } else if (s1 === 1 && s2 === 0) {
    
    system.applyGatesWithDescription(
      [{ name: 'X', qubits: [0], label: 'X₀' }],
      '✅ Коррекция: X на q₀',
      'correction'
    );
    correctedQubit = 0;
  } else if (s1 === 1 && s2 === 1) {
    
    system.applyGatesWithDescription(
      [{ name: 'X', qubits: [1], label: 'X₁' }],
      '✅ Коррекция: X на q₁',
      'correction'
    );
    correctedQubit = 1;
  } else if (s1 === 0 && s2 === 1) {
    
    system.applyGatesWithDescription(
      [{ name: 'X', qubits: [2], label: 'X₂' }],
      '✅ Коррекция: X на q₂',
      'correction'
    );
    correctedQubit = 2;
  }
  
  return correctedQubit;
}

export function runRepetitionCodeCycle(
  initialState: 'zero' | 'one' = 'zero'
): RepetitionCodeResult {
  const system = create5QubitRepetitionSystem();
  
  switch (initialState) {
    case 'zero':
      system.initializeLogicalZero();
      break;
    case 'one':
      system.initializeLogicalOne();
      break;
  }
  
  encodeRepetition(system);
  
  const syndrome = measureSyndromeRepetition(system);
  
  const correctedQubit = correctErrorRepetition(system, syndrome);
  
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

export function getLogicalZeroState(): StateVector {
  const sv = new StateVector(5);
  sv.amplitudes[0b00000] = Complex.one();
  return sv;
}

export function getLogicalOneState(): StateVector {
  const sv = new StateVector(5);
  sv.amplitudes[0b00000] = Complex.zero(); 
  sv.amplitudes[0b00111] = Complex.one();  
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

export const repetitionSyndromeTable = [
  { syndrome: '(0, 0)', meaning: 'No error', correction: 'None' },
  { syndrome: '(1, 0)', meaning: 'Error on q₀', correction: 'Apply X₀' },
  { syndrome: '(1, 1)', meaning: 'Error on q₁', correction: 'Apply X₁' },
  { syndrome: '(0, 1)', meaning: 'Error on q₂', correction: 'Apply X₂' },
];
