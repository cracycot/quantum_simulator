/**
 * Quantum Circuit Diagram Visualization
 */
import React from 'react';
import { motion } from 'framer-motion';
import type { GateOperation } from '../core/quantum/gates';
import type { QuantumStep } from '../core/quantum/system';

interface CircuitGate {
  name: string;
  qubits: number[];
  column: number;
  type: 'gate' | 'measurement' | 'noise' | 'encode' | 'decode' | 'correction';
  label?: string;
}

interface QuantumCircuitProps {
  numQubits: number;
  steps: QuantumStep[];
  currentStep?: number;
  qubitLabels?: string[];
  onGateClick?: (step: number) => void;
}

const GATE_COLORS: Record<string, string> = {
  X: '#ef4444',
  Y: '#a855f7',
  Z: '#3b82f6',
  H: '#22c55e',
  CNOT: '#f59e0b',
  CZ: '#06b6d4',
  S: '#ec4899',
  T: '#8b5cf6',
  noise: '#dc2626',
  correction: '#10b981',
  measurement: '#6366f1'
};

const getGateColor = (name: string, type: string): string => {
  if (type === 'noise') return GATE_COLORS.noise;
  if (type === 'correction') return GATE_COLORS.correction;
  if (type === 'measurement') return GATE_COLORS.measurement;
  return GATE_COLORS[name] || '#64748b';
};

/**
 * Parse steps into circuit gates for visualization
 */
function parseStepsToGates(steps: QuantumStep[]): CircuitGate[] {
  const gates: CircuitGate[] = [];
  
  steps.forEach((step, column) => {
    if (step.operation) {
      gates.push({
        name: step.operation.label || step.operation.name,
        qubits: step.operation.qubits,
        column,
        type: step.type,
        label: step.operation.label
      });
    } else if (step.type === 'measurement' && step.qubitIndex !== undefined) {
      gates.push({
        name: 'M',
        qubits: [step.qubitIndex],
        column,
        type: 'measurement'
      });
    }
  });
  
  return gates;
}

/**
 * Single-qubit gate box
 */
const GateBox: React.FC<{
  gate: CircuitGate;
  x: number;
  y: number;
  isActive: boolean;
  onClick?: () => void;
}> = ({ gate, x, y, isActive, onClick }) => {
  const color = getGateColor(gate.name, gate.type);
  const displayName = gate.name.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, '').replace(/\(.*\)/, '');
  
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: gate.column * 0.05 }}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <motion.rect
        x={x - 20}
        y={y - 18}
        width={40}
        height={36}
        rx={6}
        fill={isActive ? color : `${color}88`}
        stroke={color}
        strokeWidth={isActive ? 2 : 1}
        animate={{
          filter: isActive ? 'drop-shadow(0 0 8px ' + color + ')' : 'none'
        }}
      />
      <text
        x={x}
        y={y + 5}
        textAnchor="middle"
        fill="white"
        fontSize={displayName.length > 2 ? 10 : 14}
        fontFamily="monospace"
        fontWeight="bold"
      >
        {displayName}
      </text>
    </motion.g>
  );
};

/**
 * CNOT gate visualization
 */
const CNOTGate: React.FC<{
  controlY: number;
  targetY: number;
  x: number;
  isActive: boolean;
  onClick?: () => void;
}> = ({ controlY, targetY, x, isActive, onClick }) => {
  const color = GATE_COLORS.CNOT;
  
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Vertical line connecting control and target */}
      <line
        x1={x}
        y1={controlY}
        x2={x}
        y2={targetY}
        stroke={isActive ? color : `${color}88`}
        strokeWidth={2}
      />
      {/* Control dot */}
      <circle
        cx={x}
        cy={controlY}
        r={6}
        fill={isActive ? color : `${color}88`}
      />
      {/* Target circle with plus */}
      <circle
        cx={x}
        cy={targetY}
        r={14}
        fill="none"
        stroke={isActive ? color : `${color}88`}
        strokeWidth={2}
      />
      <line
        x1={x - 10}
        y1={targetY}
        x2={x + 10}
        y2={targetY}
        stroke={isActive ? color : `${color}88`}
        strokeWidth={2}
      />
      <line
        x1={x}
        y1={targetY - 10}
        x2={x}
        y2={targetY + 10}
        stroke={isActive ? color : `${color}88`}
        strokeWidth={2}
      />
    </motion.g>
  );
};

/**
 * Measurement gate visualization
 */
const MeasurementGate: React.FC<{
  x: number;
  y: number;
  isActive: boolean;
  result?: number;
}> = ({ x, y, isActive, result }) => {
  const color = GATE_COLORS.measurement;
  
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <rect
        x={x - 20}
        y={y - 18}
        width={40}
        height={36}
        rx={6}
        fill={isActive ? color : `${color}88`}
        stroke={color}
        strokeWidth={isActive ? 2 : 1}
      />
      {/* Meter arc */}
      <path
        d={`M ${x - 10} ${y + 8} A 12 12 0 0 1 ${x + 10} ${y + 8}`}
        fill="none"
        stroke="white"
        strokeWidth={2}
      />
      {/* Meter needle */}
      <line
        x1={x}
        y1={y + 8}
        x2={x + 6}
        y2={y - 6}
        stroke="white"
        strokeWidth={2}
      />
      {result !== undefined && (
        <text
          x={x}
          y={y - 25}
          textAnchor="middle"
          fill={color}
          fontSize={12}
          fontFamily="monospace"
          fontWeight="bold"
        >
          {result}
        </text>
      )}
    </motion.g>
  );
};

export const QuantumCircuit: React.FC<QuantumCircuitProps> = ({
  numQubits,
  steps,
  currentStep,
  qubitLabels,
  onGateClick
}) => {
  const gates = parseStepsToGates(steps);
  const numColumns = Math.max(gates.length > 0 ? Math.max(...gates.map(g => g.column)) + 1 : 1, 1);
  
  const wireSpacing = 60;
  const columnWidth = 70;
  const padding = { left: 80, right: 40, top: 40, bottom: 40 };
  
  const width = padding.left + numColumns * columnWidth + padding.right;
  const height = padding.top + (numQubits - 1) * wireSpacing + padding.bottom;
  
  const getQubitY = (qubit: number) => padding.top + qubit * wireSpacing;
  const getColumnX = (column: number) => padding.left + column * columnWidth + columnWidth / 2;
  
  return (
    <div className="w-full overflow-x-auto bg-slate-900/50 rounded-xl p-4">
      <svg 
        width={Math.max(width, 400)} 
        height={height}
        className="min-w-full"
      >
        {/* Qubit wires and labels */}
        {Array.from({ length: numQubits }, (_, i) => (
          <g key={`wire-${i}`}>
            {/* Wire */}
            <line
              x1={padding.left - 30}
              y1={getQubitY(i)}
              x2={width - padding.right}
              y2={getQubitY(i)}
              stroke="#475569"
              strokeWidth={2}
            />
            {/* Label */}
            <text
              x={padding.left - 40}
              y={getQubitY(i) + 5}
              textAnchor="end"
              fill="#94a3b8"
              fontSize={14}
              fontFamily="monospace"
            >
              |{qubitLabels?.[i] ?? `q${i}`}⟩
            </text>
          </g>
        ))}
        
        {/* Column separators for phases */}
        {steps.map((step, idx) => {
          if (step.type === 'encode' || step.type === 'noise' || step.type === 'correction') {
            return (
              <g key={`phase-${idx}`}>
                <line
                  x1={getColumnX(idx) - columnWidth / 2}
                  y1={padding.top - 20}
                  x2={getColumnX(idx) - columnWidth / 2}
                  y2={height - padding.bottom + 20}
                  stroke="#334155"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
                <text
                  x={getColumnX(idx)}
                  y={padding.top - 25}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize={10}
                  fontFamily="sans-serif"
                >
                  {step.type.toUpperCase()}
                </text>
              </g>
            );
          }
          return null;
        })}
        
        {/* Gates */}
        {gates.map((gate, idx) => {
          const x = getColumnX(gate.column);
          const isActive = currentStep === undefined || gate.column <= currentStep;
          
          // Handle CNOT/CZ (two-qubit gates)
          if ((gate.name.includes('CNOT') || gate.name === 'CZ') && gate.qubits.length === 2) {
            return (
              <CNOTGate
                key={idx}
                controlY={getQubitY(gate.qubits[0])}
                targetY={getQubitY(gate.qubits[1])}
                x={x}
                isActive={isActive}
                onClick={() => onGateClick?.(gate.column)}
              />
            );
          }
          
          // Handle measurement
          if (gate.name === 'M') {
            return (
              <MeasurementGate
                key={idx}
                x={x}
                y={getQubitY(gate.qubits[0])}
                isActive={isActive}
                result={steps[gate.column]?.measurementResult}
              />
            );
          }
          
          // Single-qubit gates
          return gate.qubits.map((qubit, qIdx) => (
            <GateBox
              key={`${idx}-${qIdx}`}
              gate={gate}
              x={x}
              y={getQubitY(qubit)}
              isActive={isActive}
              onClick={() => onGateClick?.(gate.column)}
            />
          ));
        })}
        
        {/* Current step indicator */}
        {currentStep !== undefined && currentStep < steps.length && (
          <motion.rect
            x={getColumnX(currentStep) - columnWidth / 2 + 5}
            y={padding.top - 25}
            width={columnWidth - 10}
            height={height - padding.top - padding.bottom + 50}
            rx={8}
            fill="none"
            stroke="#22c55e"
            strokeWidth={2}
            strokeDasharray="8,4"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </svg>
    </div>
  );
};

/**
 * Compact step legend
 */
export const CircuitLegend: React.FC = () => {
  const items = [
    { color: GATE_COLORS.X, label: 'X (Bit-flip)' },
    { color: GATE_COLORS.Z, label: 'Z (Phase-flip)' },
    { color: GATE_COLORS.Y, label: 'Y (Combined)' },
    { color: GATE_COLORS.H, label: 'H (Hadamard)' },
    { color: GATE_COLORS.CNOT, label: 'CNOT' },
    { color: GATE_COLORS.noise, label: 'Noise' },
    { color: GATE_COLORS.correction, label: 'Correction' },
    { color: GATE_COLORS.measurement, label: 'Measurement' }
  ];
  
  return (
    <div className="flex flex-wrap gap-4 p-3 bg-slate-800/50 rounded-lg">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-slate-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default QuantumCircuit;

