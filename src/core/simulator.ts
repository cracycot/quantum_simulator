/**
 * Main QEC Simulator
 * Orchestrates encoding, noise, syndrome measurement, and correction
 */
import { StateVector } from './quantum/complex';
import { QuantumSystem, create3QubitSystem, create9QubitShorSystem } from './quantum/system';
import type { QuantumStep } from './quantum/system';
import type { GateOperation } from './quantum/gates';
import { 
  encodeRepetition, 
  decodeRepetition, 
  measureSyndromeRepetition, 
  correctErrorRepetition,
  getLogicalZeroState,
  getLogicalOneState,
  getLogicalPlusState,
  getLogicalMinusState
} from './codes/repetition';
import {
  encodeShor,
  decodeShor,
  measureAndCorrectShor,
  getShorLogicalZeroState,
  getShorLogicalOneState
} from './codes/shor';
import { applyNoise, injectError } from './noise/noise';
import type { NoiseConfig, NoiseEvent } from './noise/noise';
import type { GateErrorConfig } from './noise/gateErrors';
import type { CustomGateStep } from '../types/gatePlan';

export type CodeType = 'repetition' | 'shor';
export type LogicalState = 'zero' | 'one' | 'plus' | 'minus';

export interface SimulatorConfig {
  codeType: CodeType;
  initialState: LogicalState;
  noiseConfig: NoiseConfig;
  gateErrorConfig?: GateErrorConfig;
}

export interface SimulationResult {
  system: QuantumSystem;
  initialLogicalState: LogicalState;
  finalFidelity: number;
  errorDetected: boolean;
  errorsApplied: NoiseEvent[];
  correctionApplied: boolean;
  steps: QuantumStep[];
  syndrome: number[];
}

export type SimulationPhase = 
  | 'init'
  | 'encode'
  | 'noise'
  | 'syndrome'
  | 'correction'
  | 'decode'
  | 'complete';

export interface SimulatorState {
  system: QuantumSystem;
  phase: SimulationPhase;
  config: SimulatorConfig;
  noiseEvents: NoiseEvent[];
  syndrome: number[];
  correctedQubits: number[];
  stepIndex: number;
}

/**
 * Main QEC Simulator class
 */
export class QECSimulator {
  private state: SimulatorState;
  private snapshots: SimulatorState[];
  
  constructor(config: SimulatorConfig) {
    this.state = this.createInitialState(config);
    this.snapshots = [this.cloneState()];
  }

  private createInitialState(config: SimulatorConfig): SimulatorState {
    const system = config.codeType === 'repetition' 
      ? create3QubitSystem(config.gateErrorConfig) 
      : create9QubitShorSystem(config.gateErrorConfig);
    
    return {
      system,
      phase: 'init',
      config,
      noiseEvents: [],
      syndrome: [],
      correctedQubits: [],
      stepIndex: 0
    };
  }

  private cloneState(): SimulatorState {
    return {
      ...this.state,
      system: this.state.system.clone(),
      noiseEvents: [...this.state.noiseEvents],
      syndrome: [...this.state.syndrome],
      correctedQubits: [...this.state.correctedQubits]
    };
  }

  /**
   * Reset simulator with new configuration
   */
  reset(config?: SimulatorConfig): void {
    this.state = this.createInitialState(config || this.state.config);
    this.snapshots = [this.cloneState()];
  }

  /**
   * Get current state
   */
  getState(): SimulatorState {
    return this.state;
  }

  /**
   * Get current phase
   */
  getPhase(): SimulationPhase {
    return this.state.phase;
  }

  /**
   * Initialize logical qubit
   */
  initialize(): void {
    const { system, config } = this.state;
    
    switch (config.initialState) {
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
    
    this.state.phase = 'init';
    this.saveSnapshot();
  }

  /**
   * Encode logical qubit into code
   */
  encode(): void {
    const { system, config } = this.state;
    
    if (config.codeType === 'repetition') {
      encodeRepetition(system);
    } else {
      encodeShor(system);
    }
    
    this.state.phase = 'encode';
    this.saveSnapshot();
  }

  /**
   * Apply noise to the system
   */
  applyNoise(): NoiseEvent[] {
    const { system, config } = this.state;
    const events = applyNoise(system, config.noiseConfig);
    this.state.noiseEvents = events;
    
    // Count applied errors and log summary
    const appliedErrors = events.filter(e => e.applied);
    if (appliedErrors.length === 0 && config.noiseConfig.type !== 'none') {
      system.logStep('noise', 'No errors occurred (probabilistic)');
    } else if (appliedErrors.length > 1 && config.codeType === 'repetition') {
      // Warning: multiple errors exceed correction capability
      system.logStep('noise', `⚠️ ${appliedErrors.length} errors applied - exceeds correction capability!`);
    }
    
    this.state.phase = 'noise';
    this.saveSnapshot();
    return events;
  }

  /**
   * Manually inject error
   */
  injectError(qubitIndex: number, errorType: 'X' | 'Y' | 'Z'): void {
    injectError(this.state.system, qubitIndex, errorType);
    this.state.noiseEvents.push({
      qubitIndex,
      errorType,
      applied: true
    });
    this.state.phase = 'noise';
    this.saveSnapshot();
  }

  /**
   * Measure syndrome and determine correction
   */
  measureSyndrome(): number[] {
    const { system, config } = this.state;
    
    if (config.codeType === 'repetition') {
      const syndrome = measureSyndromeRepetition(system);
      this.state.syndrome = syndrome;
    } else {
      // For Shor code, we get both syndromes
      const { bitFlipSyndrome, phaseFlipSyndrome } = {
        bitFlipSyndrome: [0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number],
        phaseFlipSyndrome: [0, 0] as [number, number]
      };
      // Actual measurement happens during correction
      this.state.syndrome = [...bitFlipSyndrome, ...phaseFlipSyndrome];
    }
    
    this.state.phase = 'syndrome';
    this.saveSnapshot();
    return this.state.syndrome;
  }

  /**
   * Apply error correction based on syndrome
   */
  correct(): number[] {
    const { system, config, syndrome, noiseEvents } = this.state;
    let correctedQubits: number[] = [];
    const appliedErrors = noiseEvents.filter(e => e.applied);
    
    if (config.codeType === 'repetition') {
      const result = correctErrorRepetition(system, syndrome as [number, number]);
      if (result !== null) {
        correctedQubits = [result];
      }
      
      // Check for errors exceeding correction capability
      if (appliedErrors.length >= 2) {
        if (syndrome[0] === 0 && syndrome[1] === 0) {
          // 3 errors: all qubits flipped, looks like valid codeword
          system.logStep('correction', `⚠️ Логическая ошибка: ${appliedErrors.length} ошибок вызвали необнаруживаемый переход состояния`);
        } else {
          // 2 errors: syndrome points to wrong qubit, correction makes it worse
          system.logStep('correction', `⚠️ Неправильная коррекция: ${appliedErrors.length} ошибок превышают возможности кода (исправляется только 1 ошибка)`);
        }
      } else if (correctedQubits.length === 0) {
        system.logStep('correction', 'Ошибок не обнаружено - коррекция не требуется');
      }
    } else {
      const result = measureAndCorrectShor(system);
      this.state.syndrome = [...result.bitFlipSyndrome, ...result.phaseFlipSyndrome];
      correctedQubits = [...result.bitCorrected, ...result.phaseCorrected];
      
      // Check for Shor code correction limits
      if (appliedErrors.length >= 2) {
        system.logStep('correction', `⚠️ ${appliedErrors.length} ошибок могут превышать возможности коррекции`);
      }
    }
    
    this.state.correctedQubits = correctedQubits;
    this.state.phase = 'correction';
    this.saveSnapshot();
    return correctedQubits;
  }

  /**
   * Apply a single custom gate with optional gate-error override
   * This follows the mathematical model:
   * - With probability (1-p): only apply gate G
   * - With probability p: apply gate G, then error E
   */
  applyCustomGate(step: CustomGateStep): void {
    const { system, config } = this.state;
    const originalCfg = config.gateErrorConfig;
    
    // Set up gate error config for this specific gate
    if (step.errorProbability > 0) {
      system.setGateErrorConfig({
        enabled: true,
        type: step.errorType,
        probability: step.errorProbability,
        applyTo: step.applyTo ?? 'all'
      });
    } else {
      // Disable gate errors if probability is 0
      system.setGateErrorConfig({
        enabled: false,
        type: 'none',
        probability: 0,
        applyTo: 'all'
      });
    }
    
    // Apply the gate (system.applyGate handles error injection internally)
    system.applyGate(step.op);
    
    // Restore original gate error config
    system.setGateErrorConfig(originalCfg);

    this.saveSnapshot();
  }

  /**
   * Apply a full custom circuit (sequence of gates)
   * After all gates, performs syndrome measurement and correction
   */
  applyCustomCircuit(plan: CustomGateStep[]): void {
    const { system, config } = this.state;
    
    // Apply each gate in sequence
    for (const step of plan) {
      this.applyCustomGate(step);
    }
    
    // After all custom gates, perform syndrome measurement
    if (config.codeType === 'repetition') {
      const syndrome = measureSyndromeRepetition(system);
      this.state.syndrome = syndrome;
      system.logStep('measurement', `Измерение синдрома: (${syndrome[0]}, ${syndrome[1]})`);
      
      // Apply correction based on syndrome
      const correctedQubit = correctErrorRepetition(system, syndrome as [number, number]);
      if (correctedQubit !== null) {
        this.state.correctedQubits = [correctedQubit];
        system.logStep('correction', `Коррекция: применён X к q${correctedQubit}`);
      } else {
        this.state.correctedQubits = [];
        system.logStep('correction', 'Синдром (0,0) — ошибок не обнаружено');
      }
    } else {
      // Shor code
      const result = measureAndCorrectShor(system);
      this.state.syndrome = [...result.bitFlipSyndrome, ...result.phaseFlipSyndrome];
      this.state.correctedQubits = [...result.bitCorrected, ...result.phaseCorrected];
    }
    
    this.state.phase = 'correction';
    this.saveSnapshot();
    
    // Calculate and log fidelity
    const targetState = this.getTargetState();
    const finalFidelity = system.state.fidelity(targetState);
    system.logStep('decode', `Fidelity с целевым состоянием: ${(finalFidelity * 100).toFixed(2)}%`);
    
    this.state.phase = 'complete';
    this.saveSnapshot();
  }

  /**
   * Decode back to logical qubit
   */
  decode(): void {
    const { system, config } = this.state;
    
    if (config.codeType === 'repetition') {
      decodeRepetition(system);
    } else {
      decodeShor(system);
    }
    
    this.state.phase = 'decode';
    this.saveSnapshot();
  }

  /**
   * Run full simulation cycle
   */
  runFullCycle(): SimulationResult {
    this.initialize();
    this.encode();
    const errorsApplied = this.applyNoise();
    this.measureSyndrome();
    const correctedQubits = this.correct();
    
    // Calculate fidelity with target logical state
    const targetState = this.getTargetState();
    const finalFidelity = this.state.system.state.fidelity(targetState);
    
    this.state.phase = 'complete';
    this.saveSnapshot();
    
    return {
      system: this.state.system,
      initialLogicalState: this.state.config.initialState,
      finalFidelity,
      errorDetected: this.state.syndrome.some(s => s !== 0),
      errorsApplied,
      correctionApplied: correctedQubits.length > 0,
      steps: this.state.system.history,
      syndrome: this.state.syndrome
    };
  }

  /**
   * Step forward in simulation
   */
  stepForward(): boolean {
    switch (this.state.phase) {
      case 'init':
        this.encode();
        return true;
      case 'encode':
        this.applyNoise();
        return true;
      case 'noise':
        this.measureSyndrome();
        return true;
      case 'syndrome':
        this.correct();
        return true;
      case 'correction':
        this.state.phase = 'complete';
        this.saveSnapshot();
        return true;
      case 'complete':
        return false;
    }
    return false;
  }

  /**
   * Step backward in simulation
   */
  stepBackward(): boolean {
    if (this.state.stepIndex > 0) {
      this.state.stepIndex--;
      const snapshot = this.snapshots[this.state.stepIndex];
      this.state = { ...snapshot, system: snapshot.system.clone() };
      return true;
    }
    return false;
  }

  /**
   * Go to specific step
   */
  goToStep(index: number): boolean {
    if (index >= 0 && index < this.snapshots.length) {
      this.state.stepIndex = index;
      const snapshot = this.snapshots[index];
      this.state = { ...snapshot, system: snapshot.system.clone() };
      return true;
    }
    return false;
  }

  private saveSnapshot(): void {
    this.state.stepIndex = this.snapshots.length;
    this.snapshots.push(this.cloneState());
  }

  /**
   * Get target state for fidelity calculation
   */
  private getTargetState(): StateVector {
    const { config } = this.state;
    
    if (config.codeType === 'repetition') {
      switch (config.initialState) {
        case 'zero': return getLogicalZeroState();
        case 'one': return getLogicalOneState();
        case 'plus': return getLogicalPlusState();
        case 'minus': return getLogicalMinusState();
      }
    } else {
      switch (config.initialState) {
        case 'zero': return getShorLogicalZeroState();
        case 'one': return getShorLogicalOneState();
        // Plus and minus for Shor code would need additional implementation
        default: return getShorLogicalZeroState();
      }
    }
  }

  /**
   * Get Bloch sphere coordinates for all qubits
   */
  getBlochCoordinates(): Map<number, [number, number, number]> {
    return this.state.system.getAllBlochCoordinates();
  }

  /**
   * Get simulation history
   */
  getHistory(): QuantumStep[] {
    return this.state.system.history;
  }

  /**
   * Get number of snapshots (for timeline)
   */
  getSnapshotCount(): number {
    return this.snapshots.length;
  }

  /**
   * Get current snapshot index
   */
  getCurrentSnapshotIndex(): number {
    return this.state.stepIndex;
  }
}

/**
 * Run Monte Carlo simulation to estimate logical error rate
 */
export function runMonteCarloSimulation(
  config: SimulatorConfig,
  numTrials: number,
  fidelityThreshold: number = 0.99
): { logicalErrorRate: number; results: SimulationResult[] } {
  const results: SimulationResult[] = [];
  let errorCount = 0;
  
  for (let i = 0; i < numTrials; i++) {
    const simulator = new QECSimulator(config);
    const result = simulator.runFullCycle();
    results.push(result);
    
    if (result.finalFidelity < fidelityThreshold) {
      errorCount++;
    }
  }
  
  return {
    logicalErrorRate: errorCount / numTrials,
    results
  };
}

/**
 * Generate QBER data for different noise levels
 */
export function generateQBERData(
  codeType: CodeType,
  initialState: LogicalState,
  noiseType: NoiseConfig['type'],
  probabilityRange: number[],
  trialsPerPoint: number = 100
): Array<{ probability: number; logicalErrorRate: number }> {
  const data: Array<{ probability: number; logicalErrorRate: number }> = [];
  
  for (const probability of probabilityRange) {
    const config: SimulatorConfig = {
      codeType,
      initialState,
      noiseConfig: {
        type: noiseType,
        probability
      }
    };
    
    const { logicalErrorRate } = runMonteCarloSimulation(config, trialsPerPoint);
    data.push({ probability, logicalErrorRate });
  }
  
  return data;
}

// Re-exports removed - import directly from submodules

