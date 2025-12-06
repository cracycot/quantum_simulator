/**
 * Event Log Component
 */
import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Cpu, 
  Gauge,
  Zap
} from 'lucide-react';
import type { QuantumStep } from '../core/quantum/system';

interface EventLogProps {
  steps: QuantumStep[];
  currentStep?: number;
  maxHeight?: number;
}

const stepIcons: Record<QuantumStep['type'], React.ReactNode> = {
  gate: <Cpu className="w-4 h-4" />,
  measurement: <Gauge className="w-4 h-4" />,
  noise: <AlertTriangle className="w-4 h-4" />,
  encode: <Activity className="w-4 h-4" />,
  decode: <Activity className="w-4 h-4" />,
  correction: <CheckCircle className="w-4 h-4" />
};

const stepColors: Record<QuantumStep['type'], string> = {
  gate: 'text-blue-400 bg-blue-500/10',
  measurement: 'text-purple-400 bg-purple-500/10',
  noise: 'text-red-400 bg-red-500/10',
  encode: 'text-green-400 bg-green-500/10',
  decode: 'text-cyan-400 bg-cyan-500/10',
  correction: 'text-emerald-400 bg-emerald-500/10'
};

export const EventLog: React.FC<EventLogProps> = ({
  steps,
  currentStep,
  maxHeight = 400
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentItemRef = useRef<HTMLDivElement>(null);

  // Determine which steps to show (all steps, but dim future ones)
  const currentStepIndex = currentStep !== undefined ? currentStep - 1 : steps.length - 1;

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          Лог событий
        </h3>
        <span className="text-xs text-slate-500">
          {currentStep !== undefined ? `${Math.min(currentStep, steps.length)}/${steps.length}` : `${steps.length}`} операций
        </span>
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
              <div className="flex items-start gap-2">
                <div className={`${stepColors[step.type].split(' ')[0]} ${isFutureStep ? 'opacity-50' : ''}`}>
                  {stepIcons[step.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">
                      {step.type.toUpperCase()}
                      {isCurrentStep && <span className="ml-2 text-cyan-400">← текущий</span>}
                    </span>
                    <span className="text-xs text-slate-500">
                      #{idx + 1}
                    </span>
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
            </motion.div>
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
  );
};

export default EventLog;
