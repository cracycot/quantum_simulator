/**
 * QBER (Quantum Bit Error Rate) Chart Component
 */
import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { repetitionLogicalErrorRate, shorLogicalErrorRate } from '../core/noise/noise';

interface QBERChartProps {
  data?: Array<{
    probability: number;
    logicalErrorRate: number;
    label?: string;
  }>;
  showTheoreticalCurves?: boolean;
  codeType?: 'repetition' | 'shor' | 'both';
}

export const QBERChart: React.FC<QBERChartProps> = ({
  data,
  showTheoreticalCurves = true,
  codeType = 'both'
}) => {
  // Generate theoretical curves
  const theoreticalData = useMemo(() => {
    const points = [];
    for (let p = 0; p <= 0.5; p += 0.01) {
      points.push({
        physicalError: p * 100,
        noCorrection: p * 100,
        repetition: repetitionLogicalErrorRate(p) * 100,
        shor: shorLogicalErrorRate(p) * 100
      });
    }
    return points;
  }, []);

  // Format experimental data if provided
  const experimentalData = useMemo(() => {
    if (!data) return null;
    return data.map(d => ({
      physicalError: d.probability * 100,
      experimental: d.logicalErrorRate * 100,
      label: d.label
    }));
  }, [data]);

  // Merge data for chart
  const chartData = useMemo(() => {
    if (!experimentalData) return theoreticalData;
    
    // Combine theoretical and experimental
    const combined = [...theoreticalData];
    experimentalData.forEach(exp => {
      const idx = combined.findIndex(t => Math.abs(t.physicalError - exp.physicalError) < 0.5);
      if (idx >= 0) {
        combined[idx] = { ...combined[idx], ...exp };
      } else {
        combined.push(exp as typeof combined[0]);
      }
    });
    return combined.sort((a, b) => a.physicalError - b.physicalError);
  }, [theoreticalData, experimentalData]);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: number }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-slate-300 text-sm mb-2">
            Физическая ошибка: <span className="font-mono text-white">{label?.toFixed(1)}%</span>
          </p>
          {payload.map((entry, idx) => (
            <p key={idx} style={{ color: entry.color }} className="text-sm">
              {entry.name}: <span className="font-mono">{entry.value.toFixed(2)}%</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          Вероятность логической ошибки vs физической
        </h3>
      </div>

      <div className="h-80" style={{ minWidth: 300, minHeight: 300 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="physicalError" 
              stroke="#94a3b8"
              label={{ value: 'Физическая ошибка (%)', position: 'bottom', fill: '#94a3b8' }}
            />
            <YAxis 
              stroke="#94a3b8"
              label={{ value: 'Логическая ошибка (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            
            {/* Threshold line at 50% */}
            <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="5 5" />
            
            {/* No correction (physical = logical) */}
            <Line
              type="monotone"
              dataKey="noCorrection"
              name="Без коррекции"
              stroke="#6b7280"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            
            {/* Repetition code theoretical */}
            {showTheoreticalCurves && (codeType === 'repetition' || codeType === 'both') && (
              <Line
                type="monotone"
                dataKey="repetition"
                name="3-кубитный код (теория)"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
            )}
            
            {/* Shor code theoretical */}
            {showTheoreticalCurves && (codeType === 'shor' || codeType === 'both') && (
              <Line
                type="monotone"
                dataKey="shor"
                name="Код Шора (теория)"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
            )}
            
            {/* Experimental data */}
            {experimentalData && (
              <Line
                type="monotone"
                dataKey="experimental"
                name="Эксперимент"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ fill: '#f59e0b', r: 4 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Explanation */}
      <div className="mt-4 p-4 bg-slate-900/50 rounded-xl">
        <h4 className="text-sm font-medium text-slate-300 mb-2">Интерпретация графика:</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• <span className="text-slate-500">Серая линия</span> — без коррекции (p_logical = p_physical)</li>
          <li>• <span className="text-green-400">Зелёная линия</span> — 3-кубитный код: p_L ≈ 3p² при малых p</li>
          <li>• <span className="text-purple-400">Фиолетовая линия</span> — код Шора: лучшая защита от всех ошибок</li>
          <li>• Коды эффективны при p &lt; 0.15 (точка пересечения с диагональю)</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Mini QBER indicator
 */
interface QBERIndicatorProps {
  physicalError: number;
  logicalError: number;
}

export const QBERIndicator: React.FC<QBERIndicatorProps> = ({
  physicalError,
  logicalError
}) => {
  const improvement = physicalError > 0 ? ((physicalError - logicalError) / physicalError * 100) : 0;
  const isEffective = logicalError < physicalError;
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-slate-400 text-sm">Физическая ошибка</span>
        <span className="font-mono text-white">{(physicalError * 100).toFixed(1)}%</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-slate-400 text-sm">Логическая ошибка</span>
        <span className={`font-mono ${isEffective ? 'text-green-400' : 'text-red-400'}`}>
          {(logicalError * 100).toFixed(1)}%
        </span>
      </div>
      <div className="h-px bg-slate-700" />
      <div className="flex justify-between items-center">
        <span className="text-slate-400 text-sm">Улучшение</span>
        <span className={`font-mono ${improvement > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

export default QBERChart;

