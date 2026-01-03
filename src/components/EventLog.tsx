import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Cpu, 
  Gauge,
  Zap,
  ChevronDown,
  ChevronRight,
  Info,
  X as CloseIcon,
  Eye
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import type { QuantumStep, GateErrorDetails } from '../core/quantum/system';

interface EventLogProps {
  steps: QuantumStep[];
  currentStep?: number;
  maxHeight?: number;
  onViewErrorDetails?: (step: QuantumStep) => void;
}

const stepIcons: Record<QuantumStep['type'], React.ReactNode> = {
  gate: <Cpu className="w-4 h-4" />,
  measurement: <Gauge className="w-4 h-4" />,
  noise: <AlertTriangle className="w-4 h-4" />,
  'gate-error': <Zap className="w-4 h-4" />,
  encode: <Activity className="w-4 h-4" />,
  decode: <Activity className="w-4 h-4" />,
  correction: <CheckCircle className="w-4 h-4" />
};

const stepColors: Record<QuantumStep['type'], string> = {
  gate: 'text-blue-400 bg-blue-500/10',
  measurement: 'text-purple-400 bg-purple-500/10',
  noise: 'text-red-400 bg-red-500/10',
  'gate-error': 'text-orange-400 bg-orange-500/10 border border-orange-500/30',
  encode: 'text-green-400 bg-green-500/10',
  decode: 'text-cyan-400 bg-cyan-500/10',
  correction: 'text-emerald-400 bg-emerald-500/10'
};

const stepLabels: Record<QuantumStep['type'], string> = {
  gate: 'ГЕЙТ',
  measurement: 'ИЗМЕРЕНИЕ',
  noise: 'ШУМ',
  'gate-error': 'ОШИБКА ГЕЙТА',
  encode: 'КОДИРОВАНИЕ',
  decode: 'ДЕКОДИРОВАНИЕ',
  correction: 'КОРРЕКЦИЯ'
};

const SafeLatex: React.FC<{ formula: string; block?: boolean }> = ({ formula, block = false }) => {
  try {
    if (block) {
      return <BlockMath math={formula} />;
    }
    return <InlineMath math={formula} />;
  } catch {
    return <span className="font-mono text-xs text-slate-400">{formula}</span>;
  }
};

const GateErrorDetailsPanel: React.FC<{
  details: GateErrorDetails;
  onClose: () => void;
}> = ({ details, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full border border-orange-500/30 shadow-2xl shadow-orange-500/20"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-400" />
            Детали ошибки гейта
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <CloseIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          {}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Гейт</div>
              <div className="text-lg font-mono text-orange-300">{details.gateName}</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Тип ошибки</div>
              <div className="text-lg font-mono text-red-400">{details.errorType}</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Кубит</div>
              <div className="text-lg font-mono text-cyan-300">q{details.qubitIndex}</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Вероятность</div>
              <div className="text-lg font-mono text-amber-300">{(details.probability * 100).toFixed(1)}%</div>
            </div>
          </div>

          {}
          <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
            <div className="text-xs text-slate-400 font-medium">Математическое описание</div>
            
            <div className="space-y-2">
              <div className="text-xs text-slate-500">До ошибки:</div>
              <div className="bg-slate-800 rounded p-2 text-center overflow-x-auto">
                <SafeLatex formula={details.latexBefore} />
              </div>
            </div>
            
            <div className="flex items-center justify-center text-slate-500">
              <span className="text-2xl">↓</span>
              <span className="ml-2 text-xs">Применение ошибки {details.errorType}</span>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-slate-500">После ошибки:</div>
              <div className="bg-slate-800 rounded p-2 text-center overflow-x-auto">
                <SafeLatex formula={details.latexAfter} />
              </div>
            </div>
          </div>

          {}
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-orange-200">
                <p className="mb-1">
                  <strong>Ошибка типа {details.errorType}:</strong>
                </p>
                {details.errorType === 'X' && (
                  <p>Bit-flip — инвертирует состояние кубита: |0⟩ ↔ |1⟩</p>
                )}
                {details.errorType === 'Z' && (
                  <p>Phase-flip — добавляет фазу π к состоянию |1⟩: |1⟩ → -|1⟩</p>
                )}
                {details.errorType === 'Y' && (
                  <p>Комбинированная ошибка — сочетает bit-flip и phase-flip (Y = iXZ)</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const EventLogItem: React.FC<{
  step: QuantumStep;
  idx: number;
  isCurrentStep: boolean;
  isPastStep: boolean;
  isFutureStep: boolean;
  currentItemRef: React.RefObject<HTMLDivElement | null>;
  onViewDetails?: () => void;
}> = ({ step, idx, isCurrentStep, isPastStep, isFutureStep, currentItemRef, onViewDetails }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetails = step.type === 'gate-error' || (step.operation && step.type !== 'gate') || step.latex;
  const isGateError = step.type === 'gate-error';
  
  return (
    <motion.div
      key={`${step.timestamp}-${idx}`}
      ref={isCurrentStep ? currentItemRef : null}
      initial={{ opacity: 0, x: -20 }}
      animate={{ 
        opacity: isFutureStep ? 0.3 : 1, 
        x: 0,
        scale: isCurrentStep ? 1.02 : 1
      }}
      transition={{ duration: 0.2 }}
      className={`p-2 rounded-lg transition-all ${stepColors[step.type]} ${
        isCurrentStep ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/20' : ''
      } ${isFutureStep ? 'opacity-30' : ''}`}
    >
      <div 
        className={`flex items-start gap-2 ${hasDetails ? 'cursor-pointer' : ''}`}
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
      >
        <div className={`${stepColors[step.type].split(' ')[0]} ${isFutureStep ? 'opacity-50' : ''}`}>
          {stepIcons[step.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1">
              {stepLabels[step.type] || step.type.toUpperCase()}
              {isGateError && (
                <span className="text-orange-400 ml-1">⚡</span>
              )}
              {isCurrentStep && <span className="ml-2 text-cyan-400">← текущий</span>}
              {hasDetails && (
                <span className="ml-1 text-slate-500">
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {isGateError && step.gateErrorDetails && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails?.();
                  }}
                  className="p-1 hover:bg-orange-500/20 rounded transition-colors"
                  title="Подробнее"
                >
                  <Eye className="w-3 h-3 text-orange-400" />
                </button>
              )}
            <span className="text-xs text-slate-500">
              #{idx + 1}
            </span>
            </div>
          </div>
          <p className={`text-sm truncate ${isFutureStep ? 'text-slate-600' : 'text-slate-400'}`}>
            {step.description}
          </p>
          {step.measurementResult !== undefined && isPastStep && (
            <div className="mt-1 flex items-center gap-1 text-xs text-purple-400">
              <Gauge className="w-3 h-3" />
              Результат: {step.measurementResult}
            </div>
          )}
        </div>
      </div>
      
      {}
      <AnimatePresence>
        {isExpanded && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 ml-6 text-xs space-y-2 overflow-hidden"
          >
            {}
            {step.latex && (
              <div className="p-2 bg-slate-900/70 rounded border border-slate-700 overflow-x-auto">
                <div className="text-slate-500 text-xs mb-1">Формула:</div>
                <div className="text-center">
                  <SafeLatex formula={step.latex} />
                </div>
              </div>
            )}
            
            {}
            {isGateError && step.gateErrorDetails && (
              <div className="p-2 bg-slate-900/50 rounded border border-orange-500/20">
                <div className="flex items-center gap-1 text-orange-300 mb-2">
                  <Info className="w-3 h-3" />
                  <span className="font-medium">Детали ошибки гейта</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="text-slate-400">
                    Гейт: <span className="text-orange-300 font-mono">{step.gateErrorDetails.gateName}</span>
                  </div>
                  <div className="text-slate-400">
                    Ошибка: <span className="text-red-300 font-mono">{step.gateErrorDetails.errorType}</span>
                  </div>
                    <div className="text-slate-400">
                    Кубит: <span className="text-slate-300 font-mono">q{step.gateErrorDetails.qubitIndex}</span>
                    </div>
                    <div className="text-slate-400">
                    p = <span className="text-amber-300 font-mono">{(step.gateErrorDetails.probability * 100).toFixed(1)}%</span>
                  </div>
                    </div>
                <div className="bg-slate-800 rounded p-2 overflow-x-auto">
                  <SafeLatex formula={step.gateErrorDetails.latexAfter} />
                </div>
              </div>
            )}
            
            {}
            {step.operation && !isGateError && (
              <div className="p-2 bg-slate-900/50 rounded">
                <div className="text-slate-400">
                  Операция: <span className="text-slate-300 font-mono">{step.operation.name}</span>
                </div>
                <div className="text-slate-400">
                  Кубиты: <span className="text-slate-300 font-mono">{step.operation.qubits.map(q => `q${q}`).join(', ')}</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const EventLog: React.FC<EventLogProps> = ({
  steps,
  currentStep,
  maxHeight = 400,
  onViewErrorDetails
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentItemRef = useRef<HTMLDivElement>(null);
  const [selectedErrorStep, setSelectedErrorStep] = useState<QuantumStep | null>(null);
  
  const currentStepIndex = currentStep !== undefined ? currentStep - 1 : steps.length - 1;
  
  const gateErrorCount = steps.filter(s => s.type === 'gate-error').length;

  const handleViewDetails = (step: QuantumStep) => {
    if (step.gateErrorDetails) {
      setSelectedErrorStep(step);
      onViewErrorDetails?.(step);
    }
  };

  return (
    <>
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          Лог событий
        </h3>
        <div className="flex items-center gap-2">
          {gateErrorCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
              ⚡ {gateErrorCount} ошибок
            </span>
          )}
          <span className="text-xs text-slate-500">
            {currentStep !== undefined ? `${Math.min(currentStep, steps.length)}/${steps.length}` : `${steps.length}`} операций
          </span>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="p-2 space-y-1 overflow-y-auto"
        style={{ maxHeight }}
      >
        {steps.map((step, idx) => {
          const isCurrentStep = idx === currentStepIndex;
          const isPastStep = idx < currentStepIndex;
          const isFutureStep = idx > currentStepIndex;
          
          return (
            <EventLogItem
              key={`${step.timestamp}-${idx}`}
              step={step}
              idx={idx}
              isCurrentStep={isCurrentStep}
              isPastStep={isPastStep}
              isFutureStep={isFutureStep}
              currentItemRef={currentItemRef}
                onViewDetails={() => handleViewDetails(step)}
            />
          );
        })}
        
        {steps.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Нет событий</p>
            <p className="text-xs mt-1">Запустите симуляцию для просмотра лога</p>
          </div>
        )}
      </div>
    </div>

      {}
      <AnimatePresence>
        {selectedErrorStep?.gateErrorDetails && (
          <GateErrorDetailsPanel
            details={selectedErrorStep.gateErrorDetails}
            onClose={() => setSelectedErrorStep(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default EventLog;
