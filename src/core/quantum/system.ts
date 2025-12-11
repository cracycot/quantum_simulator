/**
 * Quantum system with multi-qubit state management
 */
import { Complex, StateVector } from './complex';
import { GateOperation, applyGate as applyGateInternal } from './gates';
import type { GateErrorConfig } from '../noise/gateErrors';

export interface QubitInfo {
  index: number;
  label: string;
  role: 'data' | 'ancilla' | 'syndrome';
}

export interface GateErrorDetails {
  gateName: string;
  errorType: 'X' | 'Y' | 'Z';
  qubitIndex: number;
  probability: number;
  latexBefore: string; // LaTeX formula before error
  latexAfter: string; // LaTeX formula after error
  latexCorrection?: string; // LaTeX formula for correction (if available)
}

export interface CorrectionDetails {
  syndrome: number[];
  syndromeLatex: string;
  correctedQubits: number[];
  correctionLatex: string;
  fidelityBefore: number;
  fidelityAfter: number;
  steps: Array<{
    name: string;
    description: string;
    latex?: string;
  }>;
}

export interface QuantumStep {
  type: 'gate' | 'measurement' | 'noise' | 'encode' | 'decode' | 'correction' | 'gate-error';
  operation?: GateOperation;
  description: string;
  stateBefore: StateVector;
  stateAfter: StateVector;
  measurementResult?: number;
  qubitIndex?: number;
  timestamp: number;
  // Extended fields for gate errors
  gateErrorDetails?: GateErrorDetails;
  latex?: string; // General LaTeX description
  // Extended fields for correction
  correctionDetails?: CorrectionDetails;
}

export interface SimulationLog {
  steps: QuantumStep[];
  initialState: StateVector;
  finalState: StateVector;
}

/**
 * Main quantum system class for QEC simulation
 */
export class QuantumSystem {
  public state: StateVector;
  public qubits: QubitInfo[];
  public history: QuantumStep[];
  private stepCounter: number;
  private gateErrorConfig?: GateErrorConfig;

  constructor(numQubits: number, gateErrorConfig?: GateErrorConfig) {
    this.state = new StateVector(numQubits);
    this.qubits = [];
    this.history = [];
    this.stepCounter = 0;
    this.gateErrorConfig = gateErrorConfig;
    
    for (let i = 0; i < numQubits; i++) {
      this.qubits.push({
        index: i,
        label: `q${i}`,
        role: 'data'
      });
    }
  }

  get numQubits(): number {
    return this.qubits.length;
  }

  /**
   * Reset system to |0...0⟩
   */
  reset(): void {
    this.state = new StateVector(this.numQubits);
    this.history = [];
    this.stepCounter = 0;
  }

  /**
   * Set qubit labels and roles
   */
  setQubitInfo(index: number, label: string, role: QubitInfo['role']): void {
    if (index >= 0 && index < this.qubits.length) {
      this.qubits[index] = { index, label, role };
    }
  }

  /**
   * Initialize logical |0⟩ state
   */
  initializeLogicalZero(): void {
    this.state = new StateVector(this.numQubits);
    this.logStep('encode', 'Initialize to |0...0⟩');
  }

  /**
   * Initialize logical |1⟩ state (apply X to first qubit)
   */
  initializeLogicalOne(): void {
    this.state = new StateVector(this.numQubits);
    this.applyGate({ name: 'X', qubits: [0] });
    this.logStep('encode', 'Initialize to |1⟩ on data qubit');
  }

  /**
   * Initialize logical |+⟩ = (|0⟩ + |1⟩)/√2
   */
  initializeLogicalPlus(): void {
    this.state = new StateVector(this.numQubits);
    this.applyGate({ name: 'H', qubits: [0] });
    this.logStep('encode', 'Initialize to |+⟩ on data qubit');
  }

  /**
   * Initialize logical |−⟩ = (|0⟩ - |1⟩)/√2
   */
  initializeLogicalMinus(): void {
    this.state = new StateVector(this.numQubits);
    this.applyGate({ name: 'X', qubits: [0] });
    this.applyGate({ name: 'H', qubits: [0] });
    this.logStep('encode', 'Initialize to |−⟩ on data qubit');
  }

  /**
   * Update gate error configuration
   */
  setGateErrorConfig(config?: GateErrorConfig): void {
    this.gateErrorConfig = config;
  }

  private shouldApplyGateError(qubitCount: number): boolean {
    if (!this.gateErrorConfig?.enabled || !this.gateErrorConfig.probability) return false;
    const scope = this.gateErrorConfig.applyTo ?? 'all';
    if (scope === 'all') return true;
    if (scope === 'single-qubit' && qubitCount === 1) return true;
    if (scope === 'two-qubit' && qubitCount >= 2) return true;
    return false;
  }

  private pickGateError(qubitIndex: number): GateOperation | null {
    const cfg = this.gateErrorConfig;
    if (!cfg || !cfg.enabled || cfg.probability <= 0) return null;
    if (Math.random() >= cfg.probability) return null;

    const type = cfg.type;
    if (type === 'none') return null;

    const pickDepolarizing = (): GateOperation => {
      const r = Math.random();
      if (r < 1 / 3) return { name: 'X', qubits: [qubitIndex], label: `X${qubitIndex} (gate error)` };
      if (r < 2 / 3) return { name: 'Y', qubits: [qubitIndex], label: `Y${qubitIndex} (gate error)` };
      return { name: 'Z', qubits: [qubitIndex], label: `Z${qubitIndex} (gate error)` };
    };

    switch (type) {
      case 'bit-flip':
        return { name: 'X', qubits: [qubitIndex], label: `X${qubitIndex} (gate error)` };
      case 'phase-flip':
        return { name: 'Z', qubits: [qubitIndex], label: `Z${qubitIndex} (gate error)` };
      case 'bit-phase-flip':
        return { name: 'Y', qubits: [qubitIndex], label: `Y${qubitIndex} (gate error)` };
      case 'depolarizing':
        return pickDepolarizing();
      default:
        return null;
    }
  }

  private generateGateErrorLatex(gateName: string, errorType: string, qubitIndex: number): { before: string; after: string; general: string } {
    const qLabel = `q_{${qubitIndex}}`;
    const errorName = errorType === 'X' ? 'X' : errorType === 'Z' ? 'Z' : 'Y';
    
    // General formula
    const general = `|\\psi'\\rangle = ${errorName} \\cdot G|\\psi\\rangle`;
    
    // Specific formulas based on gate type
    let before = `G|\\psi\\rangle`;
    let after = `${errorName} \\cdot G|\\psi\\rangle`;
    
    switch (gateName) {
      case 'H':
        before = `H|\\psi\\rangle_{${qLabel}}`;
        after = `${errorName} \\cdot H|\\psi\\rangle_{${qLabel}}`;
        break;
      case 'X':
        before = `X|\\psi\\rangle_{${qLabel}}`;
        after = `${errorName} \\cdot X|\\psi\\rangle_{${qLabel}}`;
        break;
      case 'CNOT':
        before = `\\text{CNOT}|\\psi\\rangle`;
        if (qubitIndex === 1) {
          after = `(I \\otimes ${errorName}) \\cdot \\text{CNOT}|\\psi\\rangle`;
        } else {
          after = `(${errorName} \\otimes I) \\cdot \\text{CNOT}|\\psi\\rangle`;
        }
        break;
      case 'CZ':
        before = `\\text{CZ}|\\psi\\rangle`;
        after = `(I_{\\bar{${qLabel}}} \\otimes ${errorName}_{${qLabel}}) \\cdot \\text{CZ}|\\psi\\rangle`;
        break;
      default:
        before = `${gateName}|\\psi\\rangle_{${qLabel}}`;
        after = `${errorName} \\cdot ${gateName}|\\psi\\rangle_{${qLabel}}`;
    }
    
    return { before, after, general };
  }

  private applyGateErrorIfNeeded(qubits: number[], appliedGateName?: string): void {
    if (!this.shouldApplyGateError(qubits.length)) return;

    for (const q of qubits) {
      const errorOp = this.pickGateError(q);
      if (!errorOp) continue;

      const stateBefore = this.state.clone();
      applyGateInternal(this.state, errorOp);
      
      const errorType = errorOp.name as 'X' | 'Y' | 'Z';
      const probability = this.gateErrorConfig?.probability ?? 0;
      const gateName = appliedGateName || 'Gate';
      const latex = this.generateGateErrorLatex(gateName, errorType, q);

      this.history.push({
        type: 'gate-error',
        operation: errorOp,
        description: `Gate Error: ${errorType} на q${q} после гейта ${gateName}`,
        stateBefore,
        stateAfter: this.state.clone(),
        timestamp: this.stepCounter++,
        qubitIndex: q,
        latex: latex.general,
        gateErrorDetails: {
          gateName,
          errorType,
          qubitIndex: q,
          probability,
          latexBefore: latex.before,
          latexAfter: latex.after
        }
      });
    }
  }

  /**
   * Apply a quantum gate
   */
  applyGate(op: GateOperation): void {
    const stateBefore = this.state.clone();
    applyGateInternal(this.state, op);
    
    const qubitsStr = op.qubits.map(q => this.qubits[q]?.label || `q${q}`).join(', ');
    const description = `Apply ${op.label || op.name} to ${qubitsStr}`;
    
    // Generate LaTeX for the gate operation
    const latex = this.generateGateLatex(op);
    
    this.history.push({
      type: 'gate',
      operation: op,
      description,
      stateBefore,
      stateAfter: this.state.clone(),
      timestamp: this.stepCounter++,
      latex
    });

    this.applyGateErrorIfNeeded(op.qubits, op.name);
  }
  
  /**
   * Generate LaTeX formula for gate operation
   */
  private generateGateLatex(op: GateOperation): string {
    const qubits = op.qubits.map(q => `q_{${q}}`).join(',');
    switch (op.name) {
      case 'H':
        return `H_{${qubits}}|\\psi\\rangle = \\frac{1}{\\sqrt{2}}(|0\\rangle + |1\\rangle)`;
      case 'X':
        return `X_{${qubits}}|\\psi\\rangle: |0\\rangle \\leftrightarrow |1\\rangle`;
      case 'Y':
        return `Y_{${qubits}}|\\psi\\rangle: |0\\rangle \\to i|1\\rangle, |1\\rangle \\to -i|0\\rangle`;
      case 'Z':
        return `Z_{${qubits}}|\\psi\\rangle: |1\\rangle \\to -|1\\rangle`;
      case 'CNOT':
        return `\\text{CNOT}_{${qubits}}: |1\\rangle_c|x\\rangle_t \\to |1\\rangle_c|x \\oplus 1\\rangle_t`;
      case 'CZ':
        return `\\text{CZ}_{${qubits}}: |11\\rangle \\to -|11\\rangle`;
      case 'SWAP':
        return `\\text{SWAP}_{${qubits}}: |ab\\rangle \\to |ba\\rangle`;
      default:
        return `${op.name}_{${qubits}}|\\psi\\rangle`;
    }
  }

  /**
   * Apply multiple gates as a single step with custom description
   */
  applyGatesWithDescription(ops: GateOperation[], description: string, type: QuantumStep['type'] = 'gate'): void {
    const stateBefore = this.state.clone();
    
    for (const op of ops) {
      applyGateInternal(this.state, op);
    }
    
    this.history.push({
      type,
      description,
      stateBefore,
      stateAfter: this.state.clone(),
      timestamp: this.stepCounter++
    });
  }

  /**
   * Measure a qubit (destructive)
   */
  measureQubit(qubitIndex: number): number {
    const stateBefore = this.state.clone();
    const result = this.state.measureQubit(qubitIndex);
    
    this.history.push({
      type: 'measurement',
      description: `Measure ${this.qubits[qubitIndex]?.label || `q${qubitIndex}`}: result = ${result}`,
      stateBefore,
      stateAfter: this.state.clone(),
      measurementResult: result,
      qubitIndex,
      timestamp: this.stepCounter++
    });
    
    return result;
  }

  /**
   * Non-destructive Z-basis measurement (for syndrome extraction)
   * Returns expectation value of Z operator
   */
  measureZExpectation(qubitIndex: number): number {
    const prob0 = 1 - this.state.qubitProbability(qubitIndex);
    return prob0 - (1 - prob0); // <Z> = P(0) - P(1)
  }

  /**
   * Log a custom step
   */
  logStep(type: QuantumStep['type'], description: string): void {
    this.history.push({
      type,
      description,
      stateBefore: this.state.clone(),
      stateAfter: this.state.clone(),
      timestamp: this.stepCounter++
    });
  }

  /**
   * Get current state fidelity with target state
   */
  fidelityWith(target: StateVector): number {
    return this.state.fidelity(target);
  }

  /**
   * Get state as string
   */
  getStateString(): string {
    return this.state.toString();
  }

  /**
   * Get Bloch coordinates for all qubits
   */
  getAllBlochCoordinates(): Map<number, [number, number, number]> {
    const result = new Map<number, [number, number, number]>();
    for (let i = 0; i < this.numQubits; i++) {
      result.set(i, this.state.getBlochCoordinates(i));
    }
    return result;
  }

  /**
   * Clone the system
   */
  clone(): QuantumSystem {
    const newSystem = new QuantumSystem(this.numQubits, this.gateErrorConfig);
    newSystem.state = this.state.clone();
    newSystem.qubits = this.qubits.map(q => ({ ...q }));
    newSystem.history = this.history.map(h => ({
      ...h,
      stateBefore: h.stateBefore.clone(),
      stateAfter: h.stateAfter.clone()
    }));
    newSystem.stepCounter = this.stepCounter;
    return newSystem;
  }

  /**
   * Get simulation log
   */
  getLog(): SimulationLog {
    return {
      steps: this.history,
      initialState: this.history[0]?.stateBefore || this.state.clone(),
      finalState: this.state.clone()
    };
  }
}

/**
 * Create a quantum system for 3-qubit repetition code
 */
export function create3QubitSystem(gateErrorConfig?: GateErrorConfig): QuantumSystem {
  const system = new QuantumSystem(3, gateErrorConfig);
  system.setQubitInfo(0, 'q₀', 'data');
  system.setQubitInfo(1, 'q₁', 'data');
  system.setQubitInfo(2, 'q₂', 'data');
  return system;
}

/**
 * Create a quantum system for 9-qubit Shor code
 */
export function create9QubitShorSystem(gateErrorConfig?: GateErrorConfig): QuantumSystem {
  const system = new QuantumSystem(9, gateErrorConfig);
  for (let i = 0; i < 9; i++) {
    system.setQubitInfo(i, `q${i}`, 'data');
  }
  return system;
}

