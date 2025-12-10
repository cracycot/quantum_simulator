/**
 * Control Panel for QEC Simulator
 */
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shield,
  AlertTriangle
} from 'lucide-react';
import type { CodeType, LogicalState, SimulationPhase } from '../core/simulator';
import type { NoiseType } from '../core/noise/noise';
import type { GateErrorConfig, GateErrorType, GateErrorScope } from '../core/noise/gateErrors';
import type { CustomGateStep } from '../types/gatePlan';
import type { GateOperation } from '../core/quantum/gates';

interface ControlPanelProps {
  // Code selection
  codeType: CodeType;
  onCodeTypeChange: (type: CodeType) => void;
  
  // Initial state
  initialState: LogicalState;
  onInitialStateChange: (state: LogicalState) => void;
  
  // Noise settings
  noiseType: NoiseType;
  onNoiseTypeChange: (type: NoiseType) => void;
  errorCount: number;
  onErrorCountChange: (count: number) => void;
  
  // Gate errors
  gateErrorConfig: GateErrorConfig;
  onGateErrorConfigChange: (config: GateErrorConfig) => void;
  customGatePlan: CustomGateStep[];
  onAddCustomGate: (step: CustomGateStep) => void;
  onRemoveCustomGate: (index: number) => void;
  onClearCustomGatePlan: () => void;
  onRunCustomGatePlan: () => void;
  activeConfigTab: 'noise' | 'gate-error';
  onActiveConfigTabChange: (tab: 'noise' | 'gate-error') => void;
  pendingTwoQubitGate: { gateName: string; firstQubit: number } | null;
  onPendingTwoQubitGateChange: (gate: { gateName: string; firstQubit: number } | null) => void;
  
  // Playback controls
  phase: SimulationPhase;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  
  // Navigation state
  currentStep: number;
  totalSteps: number;
  
  numQubits: number;
  isPlaying: boolean;
}

const phaseLabels: Record<SimulationPhase, string> = {
  init: 'Инициализация',
  encode: 'Кодирование',
  noise: 'Шум',
  syndrome: 'Измерение синдрома',
  correction: 'Коррекция',
  decode: 'Декодирование',
  complete: 'Завершено'
};

const phaseColors: Record<SimulationPhase, string> = {
  init: '#3b82f6',
  encode: '#22c55e',
  noise: '#ef4444',
  syndrome: '#f59e0b',
  correction: '#10b981',
  decode: '#8b5cf6',
  complete: '#06b6d4'
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  codeType,
  onCodeTypeChange,
  initialState,
  onInitialStateChange,
  noiseType,
  onNoiseTypeChange,
  errorCount,
  onErrorCountChange,
  gateErrorConfig,
  onGateErrorConfigChange,
  customGatePlan,
  onAddCustomGate,
  onRemoveCustomGate,
  onClearCustomGatePlan,
  onRunCustomGatePlan,
  activeConfigTab,
  onActiveConfigTabChange,
  pendingTwoQubitGate,
  onPendingTwoQubitGateChange,
  phase,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onReset,
  currentStep,
  totalSteps,
  numQubits,
  isPlaying
}) => {
  const canGoBack = currentStep > 0;
  const canGoForward = currentStep < totalSteps;

  const perGateErrorProb = gateErrorConfig.probability * 100; // percent
  const perGateErrorType = gateErrorConfig.type;
  const perGateScope = gateErrorConfig.applyTo ?? 'all';
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <span>Управление</span>
        </h2>
        <motion.div 
          className="px-3 py-1 rounded-full text-sm font-medium w-fit"
          style={{ backgroundColor: phaseColors[phase] + '33', color: phaseColors[phase] }}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {phaseLabels[phase]}
        </motion.div>
        {phase === 'complete' && (
          <p className="text-xs text-slate-500 mt-1">
            Нажмите ↺ для перезапуска симуляции
          </p>
        )}
      </div>

      {/* Code Selection */}
      <div className="space-y-2">
        <label className="text-sm text-slate-400 font-medium">Код коррекции</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onCodeTypeChange('repetition')}
            className={`px-4 py-3 rounded-xl font-medium transition-all ${
              codeType === 'repetition'
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <div className="text-sm">3-кубитный</div>
            <div className="text-xs opacity-70">Repetition Code</div>
          </button>
          <button
            onClick={() => onCodeTypeChange('shor')}
            className={`px-4 py-3 rounded-xl font-medium transition-all ${
              codeType === 'shor'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <div className="text-sm">9-кубитный</div>
            <div className="text-xs opacity-70">Shor Code</div>
          </button>
        </div>
      </div>

      {/* Initial State */}
      <div className="space-y-2">
        <label className="text-sm text-slate-400 font-medium">Начальное состояние</label>
        <div className="grid grid-cols-4 gap-2">
          {(['zero', 'one', 'plus', 'minus'] as LogicalState[]).map((state) => (
            <button
              key={state}
              onClick={() => onInitialStateChange(state)}
              className={`px-3 py-2 rounded-lg font-mono transition-all ${
                initialState === state
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {state === 'zero' && '|0⟩'}
              {state === 'one' && '|1⟩'}
              {state === 'plus' && '|+⟩'}
              {state === 'minus' && '|−⟩'}
            </button>
          ))}
        </div>
      </div>

      {/* Noise / Gate error settings */}
      <div className="space-y-4 p-4 bg-slate-900/50 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 text-sm rounded-lg transition-all ${activeConfigTab === 'noise' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
              onClick={() => onActiveConfigTabChange('noise')}
            >
              Шум
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-lg transition-all ${activeConfigTab === 'gate-error' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
              onClick={() => onActiveConfigTabChange('gate-error')}
            >
              Gate Errors
            </button>
          </div>
          {activeConfigTab === 'noise' ? (
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Модель шума</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-cyan-400">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Ошибки гейтов</span>
            </div>
          )}
        </div>

        {activeConfigTab === 'noise' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'bit-flip' as NoiseType, label: 'X (Bit-flip)' },
                { type: 'phase-flip' as NoiseType, label: 'Z (Phase-flip)' },
                { type: 'bit-phase-flip' as NoiseType, label: 'Y (Combined)' },
                { type: 'depolarizing' as NoiseType, label: 'Depolarizing' }
              ].map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => onNoiseTypeChange(type)}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${
                    noiseType === type
                      ? 'bg-red-500/30 text-red-300 ring-1 ring-red-500'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Error count selector */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Количество ошибок</span>
                <span className="text-amber-400 font-mono">{errorCount}</span>
              </div>
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <button
                    key={i}
                    onClick={() => onErrorCountChange(i)}
                    className={`flex-1 py-2 rounded-lg font-mono text-sm transition-all ${
                      errorCount === i
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                {errorCount === 0 
                  ? 'Без ошибок' 
                  : errorCount === 1
                    ? '1 ошибка — код исправит'
                    : '2 ошибки — код НЕ исправит'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Палитра гейтов (draggable) */}
            <div className="space-y-3">
              <div className="text-sm text-slate-300 font-medium">Палитра гейтов</div>
              <p className="text-xs text-slate-500">Перетащите гейт на схему справа</p>
              <div className="grid grid-cols-6 gap-2">
                {['H','X','Y','Z','Rx','Ry','Rz','S','T','CNOT','CZ','SWAP'].map((g) => {
                  const isTwoQubitGate = ['CNOT', 'CZ', 'SWAP'].includes(g);
                  return (
                    <div
                      key={g}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('gateName', g);
                        e.dataTransfer.setData('isTwoQubit', isTwoQubitGate.toString());
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className="px-3 py-2 rounded-lg text-sm font-mono transition-all cursor-grab active:cursor-grabbing bg-slate-800 text-slate-300 hover:bg-slate-700 hover:scale-105"
                      title="Перетащите на схему"
                    >
                      {g}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Настройки ошибок по умолчанию */}
            <div className="space-y-3 p-3 bg-slate-800/50 rounded-lg">
              <div className="text-xs text-slate-400 font-medium">Настройки ошибок по умолчанию</div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Вероятность ошибки</span>
                  <span className="text-slate-200 font-semibold">{perGateErrorProb.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={0.5}
                  value={perGateErrorProb}
                  onChange={(e) => onGateErrorConfigChange({ ...gateErrorConfig, probability: parseFloat(e.target.value) / 100 })}
                  className="w-full accent-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 'bit-flip' as GateErrorType, label: 'X' },
                  { type: 'phase-flip' as GateErrorType, label: 'Z' },
                  { type: 'bit-phase-flip' as GateErrorType, label: 'Y' },
                  { type: 'depolarizing' as GateErrorType, label: 'Depol' }
                ].map(({ type, label }) => (
                    <button
                      key={type}
                      onClick={() => onGateErrorConfigChange({ ...gateErrorConfig, type })}
                      className={`px-2 py-1 rounded text-xs transition-all ${
                        perGateErrorType === type
                          ? 'bg-cyan-500/30 text-cyan-200 ring-1 ring-cyan-500'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                ))}
              </div>
            </div>

            {/* Информация о схеме */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Схема гейтов</span>
                <div className="flex gap-2">
                  <button
                    onClick={onRunCustomGatePlan}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={customGatePlan.length === 0}
                  >
                    Запустить схему
                  </button>
                  <button
                    onClick={onClearCustomGatePlan}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/50 text-xs"
                    disabled={customGatePlan.length === 0}
                  >
                    Очистить схему
                  </button>
                </div>
              </div>
              {customGatePlan.length === 0 ? (
                <p className="text-xs text-slate-500">Перетащите гейты на схему справа. Кликните на гейт, чтобы настроить ошибки.</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Гейтов в схеме: {customGatePlan.length}</p>
                  <p className="text-xs text-slate-500">💡 Кликните на гейт на схеме, чтобы настроить вероятность ошибки</p>
                </div>
              )}
            </div>

            {/* Индикатор ожидания второго кубита */}
            {pendingTwoQubitGate && (
              <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-2 text-xs text-amber-200">
                Выберите второй кубит для {pendingTwoQubitGate.gateName} (первый: q{pendingTwoQubitGate.firstQubit})
                <button
                  onClick={() => onPendingTwoQubitGateChange(null)}
                  className="ml-2 text-amber-300 hover:text-amber-100"
                >
                  Отмена
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-700">
        <motion.button
          whileHover={canGoBack ? { scale: 1.1 } : {}}
          whileTap={canGoBack ? { scale: 0.95 } : {}}
          onClick={onStepBackward}
          disabled={!canGoBack}
          className="p-3 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Шаг назад (просмотр)"
        >
          <SkipBack className="w-5 h-5" />
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={isPlaying ? onPause : onPlay}
          className="p-4 rounded-full text-white shadow-lg transition-shadow bg-gradient-to-r from-cyan-500 to-blue-500 shadow-cyan-500/25 hover:shadow-cyan-500/50"
          title={isPlaying ? 'Пауза' : 'Запустить моделирование'}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </motion.button>
        
        <motion.button
          whileHover={canGoForward ? { scale: 1.1 } : {}}
          whileTap={canGoForward ? { scale: 0.95 } : {}}
          onClick={onStepForward}
          disabled={!canGoForward}
          className="p-3 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Шаг вперёд (просмотр)"
        >
          <SkipForward className="w-5 h-5" />
        </motion.button>
      </div>
      
      {/* Step indicator */}
      {totalSteps > 0 && (
        <div className="text-center text-xs text-slate-500">
          Шаг {currentStep} из {totalSteps}
        </div>
      )}
    </div>
  );
};

export default ControlPanel;

