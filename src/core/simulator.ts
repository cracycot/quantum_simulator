import { StateVector } from './quantum/complex';
import { QuantumSystem, create5QubitRepetitionSystem, create9QubitShorSystem } from './quantum/system';
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
  measureBitFlipSyndrome,
  measurePhaseFlipSyndrome,
  correctBitFlipErrors,
  correctPhaseFlipErrors,
  getShorLogicalZeroState,
  getShorLogicalOneState
} from './codes/shor';
import { applyNoise, injectError } from './noise/noise';
import type { NoiseConfig, NoiseEvent } from './noise/noise';
import type { GateErrorConfig } from './noise/gateErrors';
import type { CustomGateStep } from '../types/gatePlan';

export type CodeType = 'repetition' | 'shor';
export type LogicalState = 'zero' | 'one';

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

export class QECSimulator {
  private state: SimulatorState;
  private snapshots: SimulatorState[];
  
  constructor(config: SimulatorConfig) {
    this.state = this.createInitialState(config);
    this.snapshots = [this.cloneState()];
  }

  private createInitialState(config: SimulatorConfig): SimulatorState {
    const system = config.codeType === 'repetition' 
      ? create5QubitRepetitionSystem(config.gateErrorConfig) 
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
  
  reset(config?: SimulatorConfig): void {
    this.state = this.createInitialState(config || this.state.config);
    this.snapshots = [this.cloneState()];
  }
  
  getState(): SimulatorState {
    return this.state;
  }
  
  getPhase(): SimulationPhase {
    return this.state.phase;
  }
  
  initialize(): void {
    const { system, config } = this.state;
    
    switch (config.initialState) {
      case 'zero':
        system.initializeLogicalZero();
        break;
      case 'one':
        system.initializeLogicalOne();
        break;
    }
    
    if (config.codeType === 'shor') {
      encodeShor(system);
    }
    
    this.state.phase = 'init';
    this.saveSnapshot();
  }
  
  encode(): void {
    const { system, config } = this.state;
    
    if (config.codeType === 'repetition') {
      encodeRepetition(system);
    } else {
      
      console.warn('[Simulator] encode() called for Shor code - encoding already done in initialize()');
      return;
    }
    
    this.state.phase = 'encode';
    this.saveSnapshot();
  }
  
  applyNoise(): NoiseEvent[] {
    const { system, config } = this.state;
    const events = applyNoise(system, config.noiseConfig);
    this.state.noiseEvents = events;
    
    const appliedErrors = events.filter(e => e.applied);
    if (appliedErrors.length === 0 && config.noiseConfig.type !== 'none') {
      system.logStep('noise', 'No errors occurred (probabilistic)');
    } else if (appliedErrors.length > 1 && config.codeType === 'repetition') {
      
      system.logStep('noise', `⚠️ ${appliedErrors.length} errors applied - exceeds correction capability!`);
    }
    
    this.state.phase = 'noise';
    this.saveSnapshot();
    return events;
  }
  
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
  
  measureSyndrome(): number[] {
    const { system, config } = this.state;
    
    if (config.codeType === 'repetition') {
      const syndrome = measureSyndromeRepetition(system);
      this.state.syndrome = syndrome;
    } else {
      
      const bitFlipSyndrome = measureBitFlipSyndrome(system);
      const phaseFlipSyndrome = measurePhaseFlipSyndrome(system);
      this.state.syndrome = [...bitFlipSyndrome, ...phaseFlipSyndrome];
      
      console.log('[Simulator] Shor syndromes measured:', {
        bitFlip: bitFlipSyndrome,
        phaseFlip: phaseFlipSyndrome,
        combined: this.state.syndrome
      });
    }
    
    this.state.phase = 'syndrome';
    this.saveSnapshot();
    return this.state.syndrome;
  }
  
  correct(): number[] {
    const { system, config, syndrome, noiseEvents } = this.state;
    let correctedQubits: number[] = [];
    
    const gateErrors = system.history.filter(step => step.type === 'gate-error');
    const appliedNoiseErrors = noiseEvents.filter(e => e.applied);
    const totalErrors = gateErrors.length + appliedNoiseErrors.length;
    
    if (totalErrors > 1 && config.codeType === 'repetition') {
      system.logStep('measurement', `⚠️ Обнаружено ${totalErrors} ошибок (gate errors: ${gateErrors.length}, шум: ${appliedNoiseErrors.length}). 3-кубитный код может исправить только 1 ошибку!`);
    }
    
    if (config.codeType === 'repetition') {
      const result = correctErrorRepetition(system, syndrome as [number, number]);
      if (result !== null) {
        correctedQubits = [result];
      }
      
      if (totalErrors >= 2) {
        if (syndrome[0] === 0 && syndrome[1] === 0) {
          
          system.logStep('correction', `⚠️ Логическая ошибка: ${totalErrors} ошибок вызвали необнаруживаемый переход состояния (синдром (0,0) ложный)`);
        } else {
          
          system.logStep('correction', `⚠️ Неправильная коррекция: ${totalErrors} ошибок превышают возможности кода — исправлен неверный кубит!`);
        }
      } else if (correctedQubits.length === 0) {
        system.logStep('correction', 'Ошибок не обнаружено - коррекция не требуется');
      }
    } else {
      
      const bitFlipSyndrome = syndrome.slice(0, 6) as [number, number, number, number, number, number];
      const phaseFlipSyndrome = syndrome.slice(6, 8) as [number, number];
      
      console.log('[Simulator] Correcting Shor code with syndromes:', {
        bitFlip: bitFlipSyndrome,
        phaseFlip: phaseFlipSyndrome
      });
      
      const bitCorrected = correctBitFlipErrors(system, bitFlipSyndrome);
      const phaseCorrected = correctPhaseFlipErrors(system, phaseFlipSyndrome);
      
      correctedQubits = [...bitCorrected, ...phaseCorrected];
      
      if (totalErrors >= 2) {
        system.logStep('correction', `⚠️ ${totalErrors} ошибок могут превышать возможности коррекции`);
      }
    }
    
    this.state.correctedQubits = correctedQubits;
    this.state.phase = 'correction';
    this.saveSnapshot();
    return correctedQubits;
  }
  
  applyCustomGate(step: CustomGateStep): void {
    const { system, config } = this.state;
    const originalCfg = config.gateErrorConfig;
    
    if (step.errorProbability > 0) {
      system.setGateErrorConfig({
        enabled: true,
        type: step.errorType,
        probability: step.errorProbability,
        applyTo: step.applyTo ?? 'all'
      });
    } else {
      
      system.setGateErrorConfig({
        enabled: false,
        type: 'none',
        probability: 0,
        applyTo: 'all'
      });
    }
    
    system.applyGatesWithDescription([step.op], `User gate: ${step.op.name}`, 'gate');
    
    system.setGateErrorConfig(originalCfg);

    this.saveSnapshot();
  }
  
  applyCustomCircuit(plan: CustomGateStep[], applyNoiseAfter: boolean = false): void {
    const { system, config } = this.state;
    
    const gateErrorsCountBefore = system.history.filter(s => s.type === 'gate-error').length;
    
    let expectedSyndrome: number[] = config.codeType === 'shor' 
      ? [0, 0, 0, 0, 0, 0, 0, 0] 
      : [0, 0];
      
    if (config.codeType === 'repetition') {
      for (const step of plan) {
        const gateName = step.op.name;
        const qubit = step.op.qubits[0];
        
        if (gateName === 'X' || gateName === 'Y' || gateName === 'Rx' || gateName === 'Ry') {
          if (qubit === 0) {
            expectedSyndrome[0] ^= 1; 
          } else if (qubit === 1) {
            expectedSyndrome[0] ^= 1; 
            expectedSyndrome[1] ^= 1;
          } else if (qubit === 2) {
            expectedSyndrome[1] ^= 1; 
          }
        }
        
        else if (gateName === 'H') {
          if (qubit === 0) {
            expectedSyndrome[0] ^= 1;
          } else if (qubit === 1) {
            expectedSyndrome[0] ^= 1;
            expectedSyndrome[1] ^= 1;
          } else if (qubit === 2) {
            expectedSyndrome[1] ^= 1;
          }
        }
      }
    }
    
    console.log('[Simulator] Expected syndrome after user gates:', expectedSyndrome);
    
    for (const step of plan) {
      this.applyCustomGate(step);
    }
    
    if (config.codeType === 'shor') {
      expectedSyndrome = [0, 0, 0, 0, 0, 0, 0, 0]; 
      console.log('[Simulator] Shor expectedSyndrome (no errors):', expectedSyndrome);
    }
    
    if (applyNoiseAfter && config.noiseConfig.exactCount && config.noiseConfig.exactCount > 0) {
      console.log('[Simulator] Applying noise after custom gates:', config.noiseConfig);
      this.applyNoise();
    }
    
    const gateErrorsCountAfter = system.history.filter(s => s.type === 'gate-error').length;
    const hadGateErrors = gateErrorsCountAfter > gateErrorsCountBefore;
    const gateErrorsCount = gateErrorsCountAfter - gateErrorsCountBefore;
    
    const noiseApplied = this.state.noiseEvents.filter(e => e.applied).length > 0;
    const noiseErrorsCount = this.state.noiseEvents.filter(e => e.applied).length;
    
    const totalErrorsCount = gateErrorsCount + noiseErrorsCount;
    const canCorrectAllErrors = totalErrorsCount <= 1; 
    
    console.log('[Simulator] ===== ERROR COUNT SUMMARY =====');
    console.log('[Simulator] Gate errors:', gateErrorsCount);
    console.log('[Simulator] Noise errors:', noiseErrorsCount);
    console.log('[Simulator] Total errors:', totalErrorsCount);
    console.log('[Simulator] Can correct all?', canCorrectAllErrors);
    console.log('[Simulator] ==============================');
    
    if (config.codeType === 'repetition') {
      const measuredSyndrome = measureSyndromeRepetition(system);
      this.state.syndrome = measuredSyndrome;
      
      const errorSyndrome: [number, number] = [
        measuredSyndrome[0] ^ expectedSyndrome[0],
        measuredSyndrome[1] ^ expectedSyndrome[1]
      ];
      
      console.log('[Simulator] Measured syndrome:', measuredSyndrome, 
                  'Expected:', expectedSyndrome,
                  'Error syndrome:', errorSyndrome);
      
      const syndromeIndicatesError = errorSyndrome[0] !== 0 || errorSyndrome[1] !== 0;
      const needsCorrection = hadGateErrors || noiseApplied || syndromeIndicatesError;
      
      console.log('[Simulator] needsCorrection:', needsCorrection, 
                  'hadGateErrors:', hadGateErrors, 'noiseApplied:', noiseApplied, 'syndromeIndicatesError:', syndromeIndicatesError);
      
      if (needsCorrection) {
        
        if (totalErrorsCount > 1) {
          
          system.logStep('correction', `⚠️ ОБНАРУЖЕНО ${totalErrorsCount} ОШИБОК (gate errors: ${gateErrorsCount}, шум: ${noiseErrorsCount})! 3-кубитный код может исправить только 1 ошибку. Коррекция будет неполной!`);
        } else if (hadGateErrors && noiseApplied) {
          system.logStep('correction', `🔧 Обнаружены ошибки: ${gateErrorsCount} gate error + ${noiseErrorsCount} шум (всего ${totalErrorsCount}). Применяем коррекцию...`);
        } else if (hadGateErrors) {
          system.logStep('correction', `🔧 Обнаружена gate error (${gateErrorsCount}). Применяем коррекцию...`);
        } else if (noiseApplied) {
          system.logStep('correction', `🔧 Обнаружен шум (${noiseErrorsCount}). Применяем коррекцию...`);
        }
        
        console.log(`[Simulator] Applying correction for error syndrome:`, errorSyndrome);
        
        const correctedQubit = correctErrorRepetition(system, errorSyndrome);
        if (correctedQubit !== null) {
          this.state.correctedQubits = [correctedQubit];
          system.logStep('correction', `✅ Применена коррекция X на q${correctedQubit}`);
        } else {
          this.state.correctedQubits = [];
        }
        this.state.phase = 'correction';
      } else {
        
        console.log('[Simulator] Error syndrome is (0,0), no correction needed');
        if (measuredSyndrome[0] === 0 && measuredSyndrome[1] === 0) {
          system.logStep('correction', `✅ Синдром: (0, 0) - состояние корректно (без gate errors и шума)`);
        } else {
          system.logStep('correction', `ℹ️ Измеренный синдром: (${measuredSyndrome[0]}, ${measuredSyndrome[1]}), ожидаемый: (${expectedSyndrome[0]}, ${expectedSyndrome[1]}) → error: (0,0) - нет ошибок`);
        }
        this.state.phase = 'complete';
      }
    } else {
      
      const measuredSyndrome = this.measureSyndrome(); 
      this.state.syndrome = measuredSyndrome;
      
      const errorSyndrome = measuredSyndrome.map((s, i) => s ^ expectedSyndrome[i]);
      
      console.log('[Simulator] Shor syndromes:', {
        measured: measuredSyndrome,
        expected: expectedSyndrome,
        error: errorSyndrome
      });
      
      const syndromeIndicatesError = errorSyndrome.some(s => s !== 0);
      const needsCorrection = hadGateErrors || noiseApplied || syndromeIndicatesError;
      
      if (needsCorrection) {
        console.log(`[Simulator] Errors detected (gate errors: ${hadGateErrors}, noise: ${noiseApplied}), applying correction for ERROR syndrome`);
        
        const bitFlipError = errorSyndrome.slice(0, 6) as [number, number, number, number, number, number];
        const phaseFlipError = errorSyndrome.slice(6, 8) as [number, number];
        
        const bitCorrected = correctBitFlipErrors(system, bitFlipError);
        const phaseCorrected = correctPhaseFlipErrors(system, phaseFlipError);
        
        this.state.correctedQubits = [...bitCorrected, ...phaseCorrected];
        this.state.phase = 'correction';
      } else {
        console.log('[Simulator] No errors detected, syndrome changed by user gates only');
        system.logStep('correction', `ℹ️ Синдром изменён пользовательскими операциями (error syndrome: все 0)`);
        this.state.phase = 'complete';
      }
    }
    
    this.saveSnapshot();
    
    const targetState = this.getTargetState();
    const finalFidelity = system.state.fidelity(targetState);
    
    const correctionApplied = this.state.phase === 'correction';
    system.logStep('decode', `📊 Fidelity с изначальным |0⟩_L: ${(finalFidelity * 100).toFixed(2)}%${correctionApplied ? ' (после коррекции)' : ' (изменено операциями)'}`);
    
    this.state.phase = 'complete';
    this.saveSnapshot();
  }
  
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
  
  runFullCycle(): SimulationResult {
    const { config } = this.state;
    this.initialize();
    
    if (config.codeType === 'repetition') {
      this.encode();
    }
    
    let expectedSyndrome: number[] = [];
    if (config.codeType === 'shor') {
      
      expectedSyndrome = [0, 0, 0, 0, 0, 0, 0, 0];
      console.log('[Simulator] Expected syndrome after encoding (before noise):', expectedSyndrome);
    }
    
    const errorsApplied = this.applyNoise();
    
    const measuredSyndrome = this.measureSyndrome();
    
    let correctedQubits: number[] = [];
    if (config.codeType === 'shor') {
      const errorSyndrome = measuredSyndrome.map((s, i) => s ^ expectedSyndrome[i]);
      console.log('[Simulator] Shor syndromes in runFullCycle:', {
        measured: measuredSyndrome,
        expected: expectedSyndrome,
        error: errorSyndrome
      });
      
      const hasErrors = errorSyndrome.some(s => s !== 0);
      if (hasErrors) {
        
        const bitFlipError = errorSyndrome.slice(0, 6) as [number, number, number, number, number, number];
        const phaseFlipError = errorSyndrome.slice(6, 8) as [number, number];
        
        const bitCorrected = correctBitFlipErrors(this.state.system, bitFlipError);
        const phaseCorrected = correctPhaseFlipErrors(this.state.system, phaseFlipError);
        
        correctedQubits = [...bitCorrected, ...phaseCorrected];
      }
    } else {
      
      correctedQubits = this.correct();
    }
    
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
  
  stepBackward(): boolean {
    if (this.state.stepIndex > 0) {
      this.state.stepIndex--;
      const snapshot = this.snapshots[this.state.stepIndex];
      this.state = { ...snapshot, system: snapshot.system.clone() };
      return true;
    }
    return false;
  }
  
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
    
    const numQubits = this.state.system.numQubits;
    if (numQubits > 10) {
      const shouldSave = this.snapshots.length % 5 === 0 || 
                         this.state.phase === 'init' || 
                         this.state.phase === 'complete' ||
                         this.state.phase === 'syndrome' ||
                         this.state.phase === 'correction';
      if (shouldSave) {
        this.snapshots.push(this.cloneState());
      }
    } else {
      this.snapshots.push(this.cloneState());
    }
  }
  
  private getTargetState(): StateVector {
    const { config } = this.state;
    
    if (config.codeType === 'repetition') {
      switch (config.initialState) {
        case 'zero': return getLogicalZeroState();
        case 'one': return getLogicalOneState();
      }
    } else {
      switch (config.initialState) {
        case 'zero': return getShorLogicalZeroState();
        case 'one': return getShorLogicalOneState();
      }
    }
  }
  
  getBlochCoordinates(): Map<number, [number, number, number]> {
    return this.state.system.getAllBlochCoordinates();
  }
  
  getHistory(): QuantumStep[] {
    return this.state.system.history;
  }
  
  getSnapshotCount(): number {
    return this.snapshots.length;
  }
  
  getCurrentSnapshotIndex(): number {
    return this.state.stepIndex;
  }
}

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
