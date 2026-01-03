import { Complex, StateVector } from './complex';

export type GateMatrix = Complex[][];

export const Gates = {
  
  I: (): GateMatrix => [
    [Complex.one(), Complex.zero()],
    [Complex.zero(), Complex.one()]
  ],
  
  X: (): GateMatrix => [
    [Complex.zero(), Complex.one()],
    [Complex.one(), Complex.zero()]
  ],
  
  Y: (): GateMatrix => [
    [Complex.zero(), new Complex(0, -1)],
    [new Complex(0, 1), Complex.zero()]
  ],
  
  Z: (): GateMatrix => [
    [Complex.one(), Complex.zero()],
    [Complex.zero(), new Complex(-1, 0)]
  ],
  
  H: (): GateMatrix => {
    const s = 1 / Math.sqrt(2);
    return [
      [new Complex(s), new Complex(s)],
      [new Complex(s), new Complex(-s)]
    ];
  },
  
  S: (): GateMatrix => [
    [Complex.one(), Complex.zero()],
    [Complex.zero(), Complex.i()]
  ],
  
  T: (): GateMatrix => [
    [Complex.one(), Complex.zero()],
    [Complex.zero(), Complex.fromPolar(1, Math.PI / 4)]
  ],
  
  Rx: (theta: number): GateMatrix => {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    return [
      [new Complex(c), new Complex(0, -s)],
      [new Complex(0, -s), new Complex(c)]
    ];
  },

  Ry: (theta: number): GateMatrix => {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    return [
      [new Complex(c), new Complex(-s)],
      [new Complex(s), new Complex(c)]
    ];
  },

  Rz: (theta: number): GateMatrix => [
    [Complex.fromPolar(1, -theta / 2), Complex.zero()],
    [Complex.zero(), Complex.fromPolar(1, theta / 2)]
  ],
  
  CNOT: (): GateMatrix => [
    [Complex.one(), Complex.zero(), Complex.zero(), Complex.zero()],
    [Complex.zero(), Complex.one(), Complex.zero(), Complex.zero()],
    [Complex.zero(), Complex.zero(), Complex.zero(), Complex.one()],
    [Complex.zero(), Complex.zero(), Complex.one(), Complex.zero()]
  ],
  
  CZ: (): GateMatrix => [
    [Complex.one(), Complex.zero(), Complex.zero(), Complex.zero()],
    [Complex.zero(), Complex.one(), Complex.zero(), Complex.zero()],
    [Complex.zero(), Complex.zero(), Complex.one(), Complex.zero()],
    [Complex.zero(), Complex.zero(), Complex.zero(), new Complex(-1)]
  ],
  
  SWAP: (): GateMatrix => [
    [Complex.one(), Complex.zero(), Complex.zero(), Complex.zero()],
    [Complex.zero(), Complex.zero(), Complex.one(), Complex.zero()],
    [Complex.zero(), Complex.one(), Complex.zero(), Complex.zero()],
    [Complex.zero(), Complex.zero(), Complex.zero(), Complex.one()]
  ],
  
  Toffoli: (): GateMatrix => {
    const size = 8;
    const matrix: GateMatrix = Array(size).fill(null).map(() => 
      Array(size).fill(null).map(() => Complex.zero())
    );
    for (let i = 0; i < 6; i++) {
      matrix[i][i] = Complex.one();
    }
    matrix[6][7] = Complex.one();
    matrix[7][6] = Complex.one();
    return matrix;
  }
};

export type GateName = 'I' | 'X' | 'Y' | 'Z' | 'H' | 'S' | 'T' | 'CNOT' | 'CZ' | 'SWAP' | 'Toffoli' | 'Rx' | 'Ry' | 'Rz';

export interface GateOperation {
  name: GateName;
  qubits: number[]; 
  params?: number[]; 
  label?: string; 
}

export function applySingleQubitGate(
  state: StateVector,
  gate: GateMatrix,
  qubitIndex: number
): void {
  const n = state.numQubits;
  const dim = state.dimension;
  const mask = 1 << qubitIndex;
  
  for (let i = 0; i < dim; i++) {
    if (!(i & mask)) {
      
      const j = i | mask;
      const a0 = state.amplitudes[i].clone();
      const a1 = state.amplitudes[j].clone();
      
      state.amplitudes[i] = gate[0][0].mul(a0).add(gate[0][1].mul(a1));
      state.amplitudes[j] = gate[1][0].mul(a0).add(gate[1][1].mul(a1));
    }
  }
}

export function applyTwoQubitGate(
  state: StateVector,
  gate: GateMatrix,
  qubit1: number,
  qubit2: number
): void {
  const dim = state.dimension;
  const mask1 = 1 << qubit1;
  const mask2 = 1 << qubit2;
  
  const newAmplitudes = state.amplitudes.map(a => a.clone());
  
  for (let i = 0; i < dim; i++) {
    
    if (!(i & mask1) && !(i & mask2)) {
      const i00 = i;
      const i01 = i | mask2;
      const i10 = i | mask1;
      const i11 = i | mask1 | mask2;
      
      const a00 = state.amplitudes[i00].clone();
      const a01 = state.amplitudes[i01].clone();
      const a10 = state.amplitudes[i10].clone();
      const a11 = state.amplitudes[i11].clone();
      
      newAmplitudes[i00] = gate[0][0].mul(a00).add(gate[0][1].mul(a01)).add(gate[0][2].mul(a10)).add(gate[0][3].mul(a11));
      newAmplitudes[i01] = gate[1][0].mul(a00).add(gate[1][1].mul(a01)).add(gate[1][2].mul(a10)).add(gate[1][3].mul(a11));
      newAmplitudes[i10] = gate[2][0].mul(a00).add(gate[2][1].mul(a01)).add(gate[2][2].mul(a10)).add(gate[2][3].mul(a11));
      newAmplitudes[i11] = gate[3][0].mul(a00).add(gate[3][1].mul(a01)).add(gate[3][2].mul(a10)).add(gate[3][3].mul(a11));
    }
  }
  
  state.amplitudes = newAmplitudes;
}

export function applyControlledGate(
  state: StateVector,
  gate: GateMatrix,
  controlQubit: number,
  targetQubit: number
): void {
  const dim = state.dimension;
  const controlMask = 1 << controlQubit;
  const targetMask = 1 << targetQubit;
  
  for (let i = 0; i < dim; i++) {
    
    if ((i & controlMask) && !(i & targetMask)) {
      const j = i | targetMask;
      const a0 = state.amplitudes[i].clone();
      const a1 = state.amplitudes[j].clone();
      
      state.amplitudes[i] = gate[0][0].mul(a0).add(gate[0][1].mul(a1));
      state.amplitudes[j] = gate[1][0].mul(a0).add(gate[1][1].mul(a1));
    }
  }
}

export function applyGate(state: StateVector, op: GateOperation): void {
  let gate: GateMatrix;
  
  switch (op.name) {
    case 'I':
      gate = Gates.I();
      break;
    case 'X':
      gate = Gates.X();
      break;
    case 'Y':
      gate = Gates.Y();
      break;
    case 'Z':
      gate = Gates.Z();
      break;
    case 'H':
      gate = Gates.H();
      break;
    case 'S':
      gate = Gates.S();
      break;
    case 'T':
      gate = Gates.T();
      break;
    case 'Rx':
      gate = Gates.Rx(op.params?.[0] ?? 0);
      break;
    case 'Ry':
      gate = Gates.Ry(op.params?.[0] ?? 0);
      break;
    case 'Rz':
      gate = Gates.Rz(op.params?.[0] ?? 0);
      break;
    case 'CNOT':
      applyControlledGate(state, Gates.X(), op.qubits[0], op.qubits[1]);
      return;
    case 'CZ':
      applyTwoQubitGate(state, Gates.CZ(), op.qubits[0], op.qubits[1]);
      return;
    case 'SWAP':
      applyTwoQubitGate(state, Gates.SWAP(), op.qubits[0], op.qubits[1]);
      return;
    case 'Toffoli':
      
      const dim = state.dimension;
      const c1Mask = 1 << op.qubits[0];
      const c2Mask = 1 << op.qubits[1];
      const tMask = 1 << op.qubits[2];
      
      for (let i = 0; i < dim; i++) {
        if ((i & c1Mask) && (i & c2Mask) && !(i & tMask)) {
          const j = i | tMask;
          const temp = state.amplitudes[i];
          state.amplitudes[i] = state.amplitudes[j];
          state.amplitudes[j] = temp;
        }
      }
      return;
    default:
      throw new Error(`Unknown gate: ${op.name}`);
  }
  
  if (op.qubits.length === 1) {
    applySingleQubitGate(state, gate, op.qubits[0]);
  }
}

export function matmul(a: GateMatrix, b: GateMatrix): GateMatrix {
  const n = a.length;
  const result: GateMatrix = Array(n).fill(null).map(() => 
    Array(n).fill(null).map(() => Complex.zero())
  );
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        result[i][j] = result[i][j].add(a[i][k].mul(b[k][j]));
      }
    }
  }
  
  return result;
}

export function tensor(a: GateMatrix, b: GateMatrix): GateMatrix {
  const na = a.length;
  const nb = b.length;
  const n = na * nb;
  
  const result: GateMatrix = Array(n).fill(null).map(() =>
    Array(n).fill(null).map(() => Complex.zero())
  );
  
  for (let i = 0; i < na; i++) {
    for (let j = 0; j < na; j++) {
      for (let k = 0; k < nb; k++) {
        for (let l = 0; l < nb; l++) {
          result[i * nb + k][j * nb + l] = a[i][j].mul(b[k][l]);
        }
      }
    }
  }
  
  return result;
}
