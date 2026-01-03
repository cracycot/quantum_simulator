import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X as CloseIcon, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle,
  Activity,
  Gauge,
  Zap
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import type { QuantumStep } from '../core/quantum/system';

interface CorrectionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: QuantumStep[];
  syndrome: number[];
  correctedQubits: number[];
  codeType: 'repetition' | 'shor';
  fidelityBefore?: number;
  fidelityAfter?: number;
}

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

const CorrectionStep: React.FC<{
  number: number;
  title: string;
  description: string;
  latex?: string;
  isActive?: boolean;
  isComplete?: boolean;
  icon?: React.ReactNode;
}> = ({ number, title, description, latex, isActive, isComplete, icon }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: number * 0.1 }}
      className={`relative pl-8 pb-6 ${isActive ? 'opacity-100' : 'opacity-80'}`}
    >
      {}
      <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-slate-700" />
      
      {}
      <div className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
        isComplete 
          ? 'bg-emerald-500 text-white' 
          : isActive 
            ? 'bg-cyan-500 text-white animate-pulse' 
            : 'bg-slate-700 text-slate-400'
      }`}>
        {isComplete ? <CheckCircle className="w-4 h-4" /> : icon || number}
      </div>
      
      {}
      <div className="ml-4">
        <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
        <p className="text-xs text-slate-400 mb-2">{description}</p>
        {latex && (
          <div className="bg-slate-900/70 rounded-lg p-3 overflow-x-auto">
            <SafeLatex formula={latex} />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const CorrectionDetailsModal: React.FC<CorrectionDetailsModalProps> = ({
  isOpen,
  onClose,
  steps,
  syndrome,
  correctedQubits,
  codeType,
  fidelityBefore,
  fidelityAfter
}) => {
  
  const gateErrorSteps = steps.filter(s => s.type === 'gate-error' || s.type === 'noise');
  const syndromeSteps = steps.filter(s => s.type === 'measurement');
  const correctionSteps = steps.filter(s => s.type === 'correction');
  
  const getSyndromeInterpretation = () => {
    if (codeType === 'repetition') {
      const [s1, s2] = syndrome;
      if (s1 === 0 && s2 === 0) return { qubit: null, message: 'Ошибок не обнаружено' };
      if (s1 === 1 && s2 === 0) return { qubit: 0, message: 'Ошибка на q₀' };
      if (s1 === 1 && s2 === 1) return { qubit: 1, message: 'Ошибка на q₁' };
      if (s1 === 0 && s2 === 1) return { qubit: 2, message: 'Ошибка на q₂' };
    }
    return { qubit: null, message: 'Синдром определён' };
  };
  
  const syndromeInfo = getSyndromeInterpretation();
  
  const getSyndromeLatex = () => {
    if (codeType === 'repetition') {
      return `S_1 = Z_0 Z_1 = ${syndrome[0]}, \\quad S_2 = Z_1 Z_2 = ${syndrome[1]}`;
    }
    return `S = (${syndrome.join(', ')})`;
  };
  
  const getCorrectionLatex = () => {
    if (correctedQubits.length === 0) {
      return 'I|\\psi\\rangle \\text{ (идентичность - коррекция не нужна)}';
    }
    const corrections = correctedQubits.map(q => `X_{q_${q}}`).join(' \\cdot ');
    return `|\\psi_{\\text{corrected}}\\rangle = ${corrections} |\\psi_{\\text{error}}\\rangle`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-2xl w-full border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 max-h-[90vh] overflow-y-auto"
          >
            {}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-cyan-400" />
                Процесс коррекции ошибок
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <CloseIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-500 mb-1">Код</div>
                <div className="text-sm font-semibold text-cyan-300">
                  {codeType === 'repetition' ? '3-кубитный' : '9-кубитный Шора'}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-500 mb-1">Синдром</div>
                <div className="text-sm font-mono text-amber-300">
                  ({syndrome.slice(0, 2).join(', ')})
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-500 mb-1">Ошибок найдено</div>
                <div className="text-sm font-semibold text-red-400">
                  {gateErrorSteps.length}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-500 mb-1">Исправлено</div>
                <div className="text-sm font-semibold text-emerald-400">
                  {correctedQubits.length > 0 ? `q${correctedQubits.join(', q')}` : '—'}
                </div>
              </div>
            </div>

            {}
            {fidelityBefore !== undefined && fidelityAfter !== undefined && (
              <div className="bg-slate-900/50 rounded-lg p-4 mb-6">
                <div className="text-sm text-slate-400 mb-2">Точность (Fidelity)</div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-1">До коррекции</div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 transition-all duration-500"
                        style={{ width: `${fidelityBefore * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-red-400 mt-1">{(fidelityBefore * 100).toFixed(1)}%</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-1">После коррекции</div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${fidelityAfter * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-emerald-400 mt-1">{(fidelityAfter * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            )}

            {}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Шаги коррекции</h3>
              
              {}
              <CorrectionStep
                number={1}
                title="Возникновение ошибки"
                description={gateErrorSteps.length > 0 
                  ? `Обнаружено ${gateErrorSteps.length} ошибок при выполнении гейтов`
                  : 'Шумовые ошибки применены к системе'
                }
                latex={gateErrorSteps[0]?.gateErrorDetails 
                  ? gateErrorSteps[0].gateErrorDetails.latexAfter 
                  : '|\\psi\\rangle \\to E|\\psi\\rangle'
                }
                isComplete={true}
                icon={<Zap className="w-3 h-3" />}
              />
              
              {}
              <CorrectionStep
                number={2}
                title="Измерение синдрома"
                description={`Результат: ${syndromeInfo.message}`}
                latex={getSyndromeLatex()}
                isComplete={true}
                icon={<Gauge className="w-3 h-3" />}
              />
              
              {}
              <CorrectionStep
                number={3}
                title="Идентификация ошибки"
                description={codeType === 'repetition' 
                  ? `Таблица синдромов: (${syndrome[0]}, ${syndrome[1]}) → ${syndromeInfo.message}`
                  : 'Анализ синдрома для определения позиции и типа ошибки'
                }
                latex={codeType === 'repetition' 
                  ? `\\begin{array}{|c|c|} \\hline S_1 S_2 & \\text{Ошибка} \\\\ \\hline 00 & \\text{нет} \\\\ 10 & q_0 \\\\ 11 & q_1 \\\\ 01 & q_2 \\\\ \\hline \\end{array}`
                  : undefined
                }
                isComplete={true}
                icon={<AlertTriangle className="w-3 h-3" />}
              />
              
              {}
              <CorrectionStep
                number={4}
                title="Применение коррекции"
                description={correctedQubits.length > 0 
                  ? `Применён оператор X к кубиту${correctedQubits.length > 1 ? 'ам' : ''} q${correctedQubits.join(', q')}`
                  : 'Коррекция не требуется (синдром нулевой)'
                }
                latex={getCorrectionLatex()}
                isComplete={true}
                icon={<CheckCircle className="w-3 h-3" />}
              />
            </div>

            {}
            <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <h4 className="text-sm font-semibold text-cyan-300 mb-2">Математическое описание</h4>
              <div className="text-xs text-slate-400 space-y-2">
                <p>
                  Синдром измеряется с помощью операторов чётности:
                </p>
                <div className="bg-slate-900/50 rounded p-2 overflow-x-auto">
                  <SafeLatex 
                    formula={codeType === 'repetition' 
                      ? 'S_1 = Z_0 Z_1, \\quad S_2 = Z_1 Z_2'
                      : 'S = (Z_0 Z_1, Z_1 Z_2, Z_3 Z_4, Z_4 Z_5, Z_6 Z_7, Z_7 Z_8, X_0 X_3 X_6, X_1 X_4 X_7)'
                    } 
                  />
                </div>
                <p className="mt-2">
                  {codeType === 'repetition' 
                    ? 'Код может исправить одну X-ошибку (bit-flip). При двух и более ошибках коррекция может быть неправильной.'
                    : 'Код Шора защищает от произвольных одиночных ошибок (X, Y, Z) благодаря комбинированной защите от bit-flip и phase-flip.'
                  }
                </p>
              </div>
            </div>

            {}
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                Закрыть
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CorrectionDetailsModal;
