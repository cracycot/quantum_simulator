/**
 * QEC Simulator - Main Application
 * Interactive Quantum Error Correction Simulator
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Github,
  BookOpen,
  Layers
} from 'lucide-react';

import { QECSimulator } from './core/simulator';
import type { CodeType, LogicalState, SimulationPhase, SimulatorConfig } from './core/simulator';
import type { NoiseType } from './core/noise/noise';
import { 
  getLogicalZeroState, 
  getLogicalOneState, 
  getLogicalPlusState, 
  getLogicalMinusState 
} from './core/codes/repetition';
import {
  getShorLogicalZeroState,
  getShorLogicalOneState
} from './core/codes/shor';

import { BlochSphere, BlochSphereGrid } from './components/BlochSphere';
import { QuantumCircuit, CircuitLegend } from './components/QuantumCircuit';
import { ControlPanel } from './components/ControlPanel';
import { EventLog } from './components/EventLog';
import { SyndromeTable } from './components/SyndromeTable';
import { QBERChart, QBERIndicator } from './components/QBERChart';
import { StateDisplay, LogicalStateIndicator } from './components/StateDisplay';

import './App.css';

const App: React.FC = () => {
  // Configuration state
  const [codeType, setCodeType] = useState<CodeType>('repetition');
  const [initialState, setInitialState] = useState<LogicalState>('zero');
  const [noiseType, setNoiseType] = useState<NoiseType>('bit-flip');
  const [errorCount, setErrorCount] = useState(1);
  
  // Simulator state
  const [simulator, setSimulator] = useState<QECSimulator | null>(null);
  const [phase, setPhase] = useState<SimulationPhase>('init');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // UI state
  const [showBlochSpheres, setShowBlochSpheres] = useState(false);
  const [showQBERChart, setShowQBERChart] = useState(true);
  const [selectedQubit, setSelectedQubit] = useState(0);
  
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get number of qubits based on code type
  const numQubits = codeType === 'repetition' ? 3 : 9;

  // Initialize simulator - only when code type or initial state changes
  const initializeSimulator = useCallback(() => {
    const config: SimulatorConfig = {
      codeType,
      initialState,
      noiseConfig: {
        type: noiseType,
        probability: 0,
        mode: 'exact-count',
        exactCount: errorCount
      }
    };
    
    const sim = new QECSimulator(config);
    sim.initialize();
    setSimulator(sim);
    setPhase(sim.getPhase());
    setCurrentStep(sim.getHistory().length);
    setIsPlaying(false);
  }, [codeType, initialState]); // Only reset on code/state change, not noise

  // Initialize on mount and when code/state changes
  useEffect(() => {
    initializeSimulator();
  }, [initializeSimulator]);

  // Update noise config without resetting simulator
  useEffect(() => {
    if (simulator) {
      // Update noise config - will be used on next noise application
      simulator.getState().config.noiseConfig = {
        type: noiseType,
        probability: 0,
        mode: 'exact-count',
        exactCount: errorCount
      };
    }
  }, [noiseType, errorCount, simulator]);

  // Auto-play effect - executes simulation steps
  useEffect(() => {
    if (isPlaying && simulator) {
      playIntervalRef.current = setInterval(() => {
        const simPhase = simulator.getPhase();
        if (simPhase !== 'complete') {
          // Execute next simulation step
          simulator.stepForward();
          setPhase(simulator.getPhase());
          // Update view to show latest step
          setCurrentStep(simulator.getHistory().length);
        } else {
          // Simulation complete, stop auto-play
          setIsPlaying(false);
        }
      }, 600);
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, simulator]);

  // Control handlers
  const handlePlay = () => {
    // Always create new simulation with current settings
    const config: SimulatorConfig = {
      codeType,
      initialState,
      noiseConfig: {
        type: noiseType,
        probability: 0,
        mode: 'exact-count',
        exactCount: errorCount
      }
    };
    
    const sim = new QECSimulator(config);
    sim.initialize();
    setSimulator(sim);
    setPhase(sim.getPhase());
    setCurrentStep(sim.getHistory().length);
    setIsPlaying(true);
  };

  const handlePause = () => setIsPlaying(false);

  // Navigation handlers - move through snapshots and update simulator state
  const [, forceUpdate] = useState(0);
  
  const handleStepForward = () => {
    if (simulator) {
      const snapshotCount = simulator.getSnapshotCount();
      const currentSnapshotIndex = simulator.getCurrentSnapshotIndex();
      if (currentSnapshotIndex < snapshotCount - 1) {
        simulator.goToStep(currentSnapshotIndex + 1);
        setPhase(simulator.getPhase());
        setCurrentStep(simulator.getHistory().length);
        forceUpdate(n => n + 1); // Force re-render for Bloch spheres
      }
    }
  };

  const handleStepBackward = () => {
    if (simulator) {
      const currentSnapshotIndex = simulator.getCurrentSnapshotIndex();
      if (currentSnapshotIndex > 0) {
        simulator.goToStep(currentSnapshotIndex - 1);
        setPhase(simulator.getPhase());
        setCurrentStep(simulator.getHistory().length);
        forceUpdate(n => n + 1); // Force re-render for Bloch spheres
      }
    }
  };

  const handleReset = () => {
    initializeSimulator();
  };

  const handleInjectError = (qubit: number, errorType: 'X' | 'Y' | 'Z') => {
    if (simulator) {
      simulator.injectError(qubit, errorType);
      setPhase(simulator.getPhase());
      setCurrentStep(simulator.getHistory().length);
    }
  };

  // Get current snapshot index for reactivity
  const snapshotIndex = simulator?.getCurrentSnapshotIndex() ?? 0;
  
  // Calculate fidelities - recalculate when simulation state changes
  const fidelities = React.useMemo(() => {
    // Force recalculation when phase or snapshot changes
    if (!simulator || phase === 'init') return { zero: 0, one: 0, plus: 0, minus: 0 };
    
    try {
      const state = simulator.getState().system.state;
      if (!state || !state.amplitudes || state.amplitudes.length === 0) {
        return { zero: 0, one: 0, plus: 0, minus: 0 };
      }
      
      if (codeType === 'repetition') {
        return {
          zero: state.fidelity(getLogicalZeroState()),
          one: state.fidelity(getLogicalOneState()),
          plus: state.fidelity(getLogicalPlusState()),
          minus: state.fidelity(getLogicalMinusState())
        };
      } else {
        return {
          zero: state.fidelity(getShorLogicalZeroState()),
          one: state.fidelity(getShorLogicalOneState()),
          plus: 0,
          minus: 0
        };
      }
    } catch {
      return { zero: 0, one: 0, plus: 0, minus: 0 };
    }
  }, [simulator, phase, codeType, snapshotIndex]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
                <Cpu className="w-6 h-6 text-white" />
              </div>
      <div>
                <h1 className="text-xl font-bold text-white">
                  QEC Simulator
                </h1>
                <p className="text-xs text-slate-400">
                  Квантовая коррекция ошибок
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <a
                href="#info"
                className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm"
              >
                <BookOpen className="w-4 h-4" />
                Справка
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors"
              >
                <Github className="w-5 h-5" />
        </a>
      </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel - Controls */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <ControlPanel
              codeType={codeType}
              onCodeTypeChange={(type) => {
                setCodeType(type);
                setSelectedQubit(0);
              }}
              initialState={initialState}
              onInitialStateChange={setInitialState}
              noiseType={noiseType}
              onNoiseTypeChange={setNoiseType}
              errorCount={errorCount}
              onErrorCountChange={setErrorCount}
              phase={phase}
              onPlay={handlePlay}
              onPause={handlePause}
              onStepForward={handleStepForward}
              onStepBackward={handleStepBackward}
              onReset={handleReset}
              currentStep={simulator?.getCurrentSnapshotIndex() ?? 0}
              totalSteps={simulator?.getSnapshotCount() ?? 0}
              numQubits={numQubits}
              isPlaying={isPlaying}
            />
            
            {/* Logical State Indicator */}
            <LogicalStateIndicator
              fidelityZero={fidelities.zero}
              fidelityOne={fidelities.one}
              fidelityPlus={codeType === 'repetition' ? fidelities.plus : undefined}
              fidelityMinus={codeType === 'repetition' ? fidelities.minus : undefined}
            />
          </div>

          {/* Center Panel - Main Visualization */}
          <div className="col-span-12 lg:col-span-6 space-y-6">
            {/* Quantum Circuit */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  Квантовая схема
                </h2>
                <CircuitLegend />
              </div>
              
              {simulator && (
                <QuantumCircuit
                  numQubits={numQubits}
                  steps={simulator.getHistory()}
                  currentStep={currentStep}
                  qubitLabels={Array.from({ length: numQubits }, (_, i) => `q${i}`)}
                />
              )}
            </div>

            {/* State Display */}
            {simulator && (
              <StateDisplay
                state={simulator.getState().system.state}
                numQubits={numQubits}
                title={`Квантовое состояние (${codeType === 'repetition' ? '3 кубита' : '9 кубитов'})`}
              />
            )}

            {/* Bloch Spheres Section */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowBlochSpheres(!showBlochSpheres)}
                className="w-full px-6 py-4 flex items-center justify-between text-white hover:bg-slate-700/30 transition-colors"
              >
                <span className="font-semibold flex items-center gap-2">
                  🔮 Блох-сферы
                </span>
                {showBlochSpheres ? <ChevronUp /> : <ChevronDown />}
              </button>
              
              <AnimatePresence>
                {showBlochSpheres && simulator && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-6"
                  >
                    {/* Single Bloch sphere for selected qubit */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-slate-400">Выбранный кубит:</span>
                        <div className="flex gap-1">
                          {Array.from({ length: numQubits }, (_, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedQubit(i)}
                              className={`px-2 py-1 text-xs rounded transition-all ${
                                selectedQubit === i
                                  ? 'bg-cyan-500 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                            >
                              q{i}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex justify-center">
                        <BlochSphere
                          coordinates={simulator.getBlochCoordinates().get(selectedQubit) || [0, 0, 1]}
                          label={`q${selectedQubit}`}
                          size={280}
                        />
                      </div>
                    </div>

                    {/* Grid of all Bloch spheres (compact) */}
                    {numQubits <= 3 && (
                      <BlochSphereGrid
                        coordinates={simulator.getBlochCoordinates()}
                        sphereSize={140}
                        columns={3}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Panel - Info & Logs */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            {/* Event Log */}
            {simulator && (
              <EventLog
                steps={simulator.getHistory()}
                currentStep={currentStep}
                maxHeight={300}
              />
            )}

            {/* Syndrome Table */}
            <SyndromeTable
              codeType={codeType}
              currentSyndrome={simulator?.getState().syndrome}
              errorsApplied={simulator?.getState().noiseEvents.filter(e => e.applied).length ?? 0}
              noiseType={noiseType}
            />

            {/* QBER Indicator */}
            <QBERIndicator
              physicalError={errorCount / numQubits}
              logicalError={(() => {
                // Calculate from actual fidelity with target state
                const targetFidelity = initialState === 'zero' ? fidelities.zero : 
                                       initialState === 'one' ? fidelities.one :
                                       initialState === 'plus' ? fidelities.plus : fidelities.minus;
                return 1 - targetFidelity;
              })()}
            />
          </div>
        </div>

        {/* QBER Chart Section */}
        <div className="mt-6">
          <button
            onClick={() => setShowQBERChart(!showQBERChart)}
            className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-2xl px-6 py-4 flex items-center justify-between text-white hover:bg-slate-700/30 transition-colors"
          >
            <span className="font-semibold flex items-center gap-2">
              📊 Анализ логических ошибок (QBER)
            </span>
            {showQBERChart ? <ChevronUp /> : <ChevronDown />}
        </button>
          
          <AnimatePresence>
            {showQBERChart && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <QBERChart
                  codeType="both"
                  showTheoreticalCurves
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Info Section */}
        <section id="info" className="mt-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Info className="w-6 h-6 text-cyan-400" />
            О симуляторе
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">3-кубитный код повторения</h3>
              <p className="text-slate-400 text-sm mb-4">
                Кодирует логический кубит в 3 физических: |0⟩_L → |000⟩, |1⟩_L → |111⟩.
                Может исправить одну X-ошибку (bit-flip), но не Z-ошибки (phase-flip).
              </p>
              <div className="p-3 bg-slate-900/50 rounded-lg font-mono text-xs text-slate-400">
                <div>Кодирование: CNOT(q₀→q₁), CNOT(q₀→q₂)</div>
                <div>Синдром: Z₀Z₁, Z₁Z₂</div>
              </div>
      </div>
            
            <div>
              <h3 className="text-lg font-semibold text-purple-400 mb-3">9-кубитный код Шора</h3>
              <p className="text-slate-400 text-sm mb-4">
                Первый полноценный код коррекции ошибок. Комбинирует защиту от bit-flip 
                и phase-flip ошибок. Может исправить любую одиночную ошибку X, Y или Z.
              </p>
              <div className="p-3 bg-slate-900/50 rounded-lg font-mono text-xs text-slate-400">
                <div>Структура: 3 блока × 3 кубита</div>
                <div>Защита: bit-flip внутри блоков + phase-flip между блоками</div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
            <h4 className="text-cyan-400 font-semibold mb-2">Сценарии для экспериментов:</h4>
            <ul className="text-slate-400 text-sm space-y-1">
              <li>• <strong>Одиночная X-ошибка:</strong> 3-кубитный код исправит с вероятностью ~100%</li>
              <li>• <strong>Две X-ошибки:</strong> код не справится (демонстрация пределов)</li>
              <li>• <strong>Z-ошибка:</strong> 3-кубитный код не исправляет, код Шора — да</li>
            </ul>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>QEC Simulator — Интерактивная симуляция квантовой коррекции ошибок</p>
          <p className="mt-1">ITMO University • Physics Project</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
