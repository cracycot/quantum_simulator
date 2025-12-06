/**
 * Syndrome Table Component
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Table, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { repetitionSyndromeTable } from '../core/codes/repetition';
import { shorBitFlipSyndromeTable, shorPhaseFlipSyndromeTable } from '../core/codes/shor';
import type { CodeType } from '../core/simulator';
import type { NoiseType } from '../core/noise/noise';

interface SyndromeTableProps {
  codeType: CodeType;
  currentSyndrome?: number[];
  errorsApplied?: number; // Number of actual errors that were applied
  noiseType?: NoiseType; // Type of noise applied
}

export const SyndromeTable: React.FC<SyndromeTableProps> = ({
  codeType,
  currentSyndrome,
  errorsApplied = 0,
  noiseType
}) => {
  const formatSyndrome = (syndrome: number[]): string => {
    return `(${syndrome.join(', ')})`;
  };

  const isCurrentSyndrome = (tableEntry: string, syndrome?: number[]): boolean => {
    if (!syndrome) return false;
    return tableEntry === formatSyndrome(syndrome);
  };

  // Check for errors exceeding correction capability
  const isLogicalError = codeType === 'repetition' 
    && currentSyndrome?.every(s => s === 0) 
    && errorsApplied >= 2;
  
  const isWrongCorrection = codeType === 'repetition'
    && errorsApplied === 2
    && !currentSyndrome?.every(s => s === 0);
  
  // Check if using wrong noise type for repetition code
  const isWrongNoiseType = codeType === 'repetition'
    && errorsApplied > 0
    && (noiseType === 'phase-flip' || noiseType === 'bit-phase-flip')
    && currentSyndrome?.every(s => s === 0);

  if (codeType === 'repetition') {
    const currentStr = currentSyndrome ? formatSyndrome(currentSyndrome) : null;
    
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
          <Table className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">
            Таблица синдромов (3-кубитный код)
          </h3>
        </div>
        
        {/* Logical error warning (3 errors - undetectable) */}
        {isLogicalError && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-red-300 font-medium">Логическая ошибка!</p>
                <p className="text-red-200/70 text-xs mt-1">
                  Применено {errorsApplied} ошибок. Состояние перешло в другое кодовое слово — 
                  синдром (0,0), ошибка не обнаружена, но данные изменились!
                </p>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Wrong correction warning (2 errors - detected but incorrectly corrected) */}
        {isWrongCorrection && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mx-4 mt-4 p-3 bg-amber-500/20 border border-amber-500/50 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-amber-300 font-medium">Неправильная коррекция!</p>
                <p className="text-amber-200/70 text-xs mt-1">
                  Применено 2 ошибки. Синдром указывает на неправильный кубит — 
                  коррекция добавит третью ошибку вместо исправления!
                </p>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Wrong noise type warning (Z/Y errors not detectable by repetition code) */}
        {isWrongNoiseType && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mx-4 mt-4 p-3 bg-purple-500/20 border border-purple-500/50 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-purple-300 font-medium">
                  {noiseType === 'phase-flip' ? 'Z-ошибка не обнаруживается!' : 'Y-ошибка не обнаруживается!'}
                </p>
                <p className="text-purple-200/70 text-xs mt-1">
                  3-кубитный repetition code исправляет только X (bit-flip) ошибки. 
                  Для Z и Y ошибок используйте 9-кубитный код Шора!
                </p>
              </div>
            </div>
          </motion.div>
        )}
        
        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="text-left py-2 px-3">Синдром</th>
                <th className="text-left py-2 px-3">Ошибка</th>
                <th className="text-left py-2 px-3">Коррекция</th>
              </tr>
            </thead>
            <tbody>
              {repetitionSyndromeTable.map((entry, idx) => {
                const isCurrent = currentStr === entry.syndrome;
                return (
                  <motion.tr
                    key={idx}
                    className={`border-t border-slate-700/50 ${
                      isCurrent ? 'bg-cyan-500/20' : ''
                    }`}
                    animate={isCurrent ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <td className="py-2 px-3 font-mono text-slate-300">
                      <span className={isCurrent ? 'text-cyan-400 font-bold' : ''}>
                        {entry.syndrome}
                      </span>
                      {isCurrent && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="ml-2 text-cyan-400"
                        >
                          ←
                        </motion.span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      {entry.meaning === 'No error' ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          Нет ошибки
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400">
                          <XCircle className="w-4 h-4" />
                          {entry.meaning}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-400">
                      {entry.correction === 'None' ? '—' : entry.correction}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Shor code tables
  const bitSyndrome = currentSyndrome?.slice(0, 6);
  const phaseSyndrome = currentSyndrome?.slice(6, 8);
  
  return (
    <div className="space-y-4">
      {/* Bit-flip syndrome table */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
          <Table className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">
            Синдромы bit-flip (код Шора)
          </h3>
        </div>
        
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="text-left py-2 px-2">Блок</th>
                <th className="text-left py-2 px-2">Синдром</th>
                <th className="text-left py-2 px-2">Ошибка</th>
                <th className="text-left py-2 px-2">Коррекция</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map((block) => {
                const blockEntries = shorBitFlipSyndromeTable.filter(e => e.block === block);
                const blockSyndrome = bitSyndrome?.slice(block * 2, block * 2 + 2);
                const currentBlockStr = blockSyndrome ? formatSyndrome(blockSyndrome) : null;
                
                return blockEntries.map((entry, idx) => {
                  const isCurrent = currentBlockStr === entry.syndrome;
                  return (
                    <tr
                      key={`${block}-${idx}`}
                      className={`border-t border-slate-700/50 ${
                        isCurrent ? 'bg-cyan-500/20' : ''
                      }`}
                    >
                      {idx === 0 && (
                        <td className="py-2 px-2 text-slate-500" rowSpan={4}>
                          {block}
                        </td>
                      )}
                      <td className="py-2 px-2 font-mono text-slate-300">
                        {entry.syndrome}
                        {isCurrent && <span className="ml-1 text-cyan-400">←</span>}
                      </td>
                      <td className="py-2 px-2 text-slate-400 text-xs">
                        {entry.meaning === 'No error' ? (
                          <span className="text-green-400">✓</span>
                        ) : (
                          entry.meaning
                        )}
                      </td>
                      <td className="py-2 px-2 font-mono text-slate-400 text-xs">
                        {entry.correction === 'None' ? '—' : entry.correction}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phase-flip syndrome table */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
          <Table className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">
            Синдромы phase-flip (код Шора)
          </h3>
        </div>
        
        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="text-left py-2 px-3">Синдром</th>
                <th className="text-left py-2 px-3">Ошибка</th>
                <th className="text-left py-2 px-3">Коррекция</th>
              </tr>
            </thead>
            <tbody>
              {shorPhaseFlipSyndromeTable.map((entry, idx) => {
                const currentPhaseStr = phaseSyndrome ? formatSyndrome(phaseSyndrome) : null;
                const isCurrent = currentPhaseStr === entry.syndrome;
                
                return (
                  <tr
                    key={idx}
                    className={`border-t border-slate-700/50 ${
                      isCurrent ? 'bg-purple-500/20' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-mono text-slate-300">
                      {entry.syndrome}
                      {isCurrent && <span className="ml-1 text-purple-400">←</span>}
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      {entry.meaning.includes('No') ? (
                        <span className="text-green-400">✓ Нет ошибки</span>
                      ) : (
                        entry.meaning
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-400">
                      {entry.correction === 'None' ? '—' : entry.correction}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SyndromeTable;

