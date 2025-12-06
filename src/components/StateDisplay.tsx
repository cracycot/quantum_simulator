/**
 * Quantum State Display Component
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Atom, Activity, Target } from 'lucide-react';
import { StateVector } from '../core/quantum/complex';

interface StateDisplayProps {
  state: StateVector;
  numQubits: number;
  title?: string;
  showProbabilities?: boolean;
  showAmplitudes?: boolean;
  threshold?: number;
}

export const StateDisplay: React.FC<StateDisplayProps> = ({
  state,
  numQubits,
  title = 'Квантовое состояние',
  showProbabilities = true,
  showAmplitudes = true,
  threshold = 0.01
}) => {
  // Get significant basis states
  const significantStates = [];
  for (let i = 0; i < state.dimension; i++) {
    const prob = state.amplitudes[i].absSquared();
    if (prob > threshold) {
      significantStates.push({
        index: i,
        label: StateVector.basisStateLabel(i, numQubits),
        amplitude: state.amplitudes[i],
        probability: prob
      });
    }
  }

  // Sort by probability
  significantStates.sort((a, b) => b.probability - a.probability);

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
        <Atom className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>

      <div className="p-4">
        {/* State vector representation */}
        <div className="mb-4 p-3 bg-slate-900/50 rounded-lg font-mono text-sm">
          <span className="text-slate-500">|ψ⟩ = </span>
          {significantStates.map((s, idx) => (
            <span key={s.index}>
              {idx > 0 && <span className="text-slate-500"> + </span>}
              <span className="text-cyan-400">({s.amplitude.toString()})</span>
              <span className="text-white">{s.label}</span>
            </span>
          ))}
          {significantStates.length === 0 && (
            <span className="text-slate-500">0</span>
          )}
        </div>

        {/* Probability bars */}
        {showProbabilities && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <Activity className="w-3 h-3" />
              Вероятности измерения
            </div>
            {significantStates.slice(0, 8).map((s) => (
              <motion.div
                key={s.index}
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                className="flex items-center gap-2"
              >
                <span className="font-mono text-xs text-slate-400 w-16">{s.label}</span>
                <div className="flex-1 h-5 bg-slate-700 rounded overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${s.probability * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <span className="font-mono text-xs text-slate-300 w-14 text-right">
                  {(s.probability * 100).toFixed(1)}%
                </span>
              </motion.div>
            ))}
            {significantStates.length > 8 && (
              <div className="text-xs text-slate-500 text-center">
                +{significantStates.length - 8} more states
              </div>
            )}
          </div>
        )}

        {/* Amplitude details */}
        {showAmplitudes && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <Target className="w-3 h-3" />
              Амплитуды (комплексные)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {significantStates.slice(0, 4).map((s) => (
                <div 
                  key={s.index}
                  className="p-2 bg-slate-900/50 rounded text-xs"
                >
                  <span className="font-mono text-slate-400">{s.label}: </span>
                  <span className="font-mono text-cyan-400">
                    {s.amplitude.re.toFixed(3)}
                    {s.amplitude.im >= 0 ? '+' : ''}
                    {s.amplitude.im.toFixed(3)}i
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Logical qubit state indicator
 */
interface LogicalStateIndicatorProps {
  fidelityZero: number;
  fidelityOne: number;
  fidelityPlus?: number;
  fidelityMinus?: number;
}

export const LogicalStateIndicator: React.FC<LogicalStateIndicatorProps> = ({
  fidelityZero,
  fidelityOne,
  fidelityPlus,
  fidelityMinus
}) => {
  const states = [
    { label: '|0⟩_L', fidelity: fidelityZero, color: 'cyan' },
    { label: '|1⟩_L', fidelity: fidelityOne, color: 'purple' },
    ...(fidelityPlus !== undefined ? [{ label: '|+⟩_L', fidelity: fidelityPlus, color: 'green' }] : []),
    ...(fidelityMinus !== undefined ? [{ label: '|−⟩_L', fidelity: fidelityMinus, color: 'amber' }] : [])
  ];

  const maxFidelity = Math.max(...states.map(s => s.fidelity));
  const dominantState = states.find(s => s.fidelity === maxFidelity);

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4">
      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Target className="w-4 h-4 text-cyan-400" />
        Логический кубит
      </h4>
      
      <div className="text-center mb-4">
        <motion.div
          className="text-4xl font-mono text-white"
          key={dominantState?.label}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {dominantState?.label}
        </motion.div>
        <div className="text-sm text-slate-400 mt-1">
          Fidelity: <span className="text-cyan-400 font-mono">{(maxFidelity * 100).toFixed(1)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {states.map((s) => (
          <div 
            key={s.label}
            className={`p-2 rounded-lg text-center ${
              s.fidelity === maxFidelity 
                ? 'bg-cyan-500/20 ring-1 ring-cyan-500' 
                : 'bg-slate-900/50'
            }`}
          >
            <div className="font-mono text-sm text-slate-300">{s.label}</div>
            <div className="font-mono text-xs text-slate-400">
              {(s.fidelity * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Compact state summary
 */
interface StateSummaryProps {
  beforeState?: StateVector;
  afterState?: StateVector;
  numQubits: number;
}

export const StateSummary: React.FC<StateSummaryProps> = ({
  beforeState,
  afterState,
  numQubits
}) => {
  const getStateLabel = (state?: StateVector) => {
    if (!state) return '—';
    
    const significant = [];
    for (let i = 0; i < state.dimension; i++) {
      if (state.amplitudes[i].absSquared() > 0.01) {
        significant.push(StateVector.basisStateLabel(i, numQubits));
      }
    }
    
    if (significant.length === 0) return '0';
    if (significant.length <= 2) return significant.join(' + ');
    return `${significant[0]} + ... (${significant.length} terms)`;
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl">
      <div className="flex-1">
        <div className="text-xs text-slate-500 mb-1">До</div>
        <div className="font-mono text-sm text-slate-300">
          {getStateLabel(beforeState)}
        </div>
      </div>
      <div className="text-2xl text-slate-600">→</div>
      <div className="flex-1">
        <div className="text-xs text-slate-500 mb-1">После</div>
        <div className="font-mono text-sm text-cyan-400">
          {getStateLabel(afterState)}
        </div>
      </div>
    </div>
  );
};

export default StateDisplay;

