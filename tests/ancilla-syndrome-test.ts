import { create5QubitRepetitionSystem } from '../src/core/quantum/system';
import { measureSyndromeRepetition } from '../src/core/codes/repetition';

function assertSyndrome(actual: [number, number], expected: [number, number], label: string) {
  const ok = actual[0] === expected[0] && actual[1] === expected[1];
  if (!ok) {
    throw new Error(`${label}: expected (${expected[0]},${expected[1]}) but got (${actual[0]},${actual[1]})`);
  }
}

// This test validates honest syndrome extraction with 2 ancillas:
// S1 = Z0Z1 via a0, S2 = Z1Z2 via a1.
// Syndrome mapping for single X error:
// (1,0)->q0, (1,1)->q1, (0,1)->q2
(() => {
  // X on q0
  {
    const system = create5QubitRepetitionSystem();
    system.initializeLogicalZero();
    system.applyGate({ name: 'X', qubits: [0], label: 'X₀ (test error)' });
    const syn = measureSyndromeRepetition(system);
    assertSyndrome(syn, [1, 0], 'X on q0');
  }

  // X on q1
  {
    const system = create5QubitRepetitionSystem();
    system.initializeLogicalZero();
    system.applyGate({ name: 'X', qubits: [1], label: 'X₁ (test error)' });
    const syn = measureSyndromeRepetition(system);
    assertSyndrome(syn, [1, 1], 'X on q1');
  }

  // X on q2
  {
    const system = create5QubitRepetitionSystem();
    system.initializeLogicalZero();
    system.applyGate({ name: 'X', qubits: [2], label: 'X₂ (test error)' });
    const syn = measureSyndromeRepetition(system);
    assertSyndrome(syn, [0, 1], 'X on q2');
  }

  console.log('ancilla-syndrome-test: OK');
})();


