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
 * Each step from history becomes one column in the circuit
 */
function parseStepsToGates(steps: QuantumStep[]): CircuitGate[] {
  const gates: CircuitGate[] = [];
  
  steps.forEach((step, column) => {
    const desc = step.description.toLowerCase();
    
    if (step.operation) {
      // Step has explicit gate operation
      gates.push({
        name: step.operation.label || step.operation.name,
        qubits: step.operation.qubits,
        column,
        type: step.type,
        label: step.description
      });
    } else if (step.type === 'measurement') {
      // Measurement step
      let qubits = step.qubitIndex !== undefined ? [step.qubitIndex] : [0];
      // Try to extract syndrome info
      const syndromeMatch = desc.match(/\((\d+),\s*(\d+)\)/);
      gates.push({
        name: syndromeMatch ? `S:${syndromeMatch[1]}${syndromeMatch[2]}` : 'M',
        qubits,
        column,
        type: 'measurement',
        label: step.description
      });
    } else {
      // Other steps (encode, noise, correction, decode, etc.)
      let name = step.type.substring(0, 3).toUpperCase();
      let qubits: number[] = [0];
      
      // Try to extract qubit info from description
      const qubitMatch = desc.match(/q[_]?(\d+)/i) || desc.match(/qubit\s*(\d+)/i);
      if (qubitMatch) {
        qubits = [parseInt(qubitMatch[1])];
      }
      
      // Determine display name from description
      if (desc.includes('initialize')) {
        name = 'INIT';
      } else if (desc.includes('encoded') || desc.includes('encoding')) {
        name = 'ENC';
      } else if (desc.includes('decoded') || desc.includes('decoding')) {
        name = 'DEC';
      } else if (desc.includes('x error') || desc.includes('bit-flip')) {
        name = 'X!';
      } else if (desc.includes('z error') || desc.includes('phase-flip')) {
        name = 'Z!';
      } else if (desc.includes('y error')) {
        name = 'Y!';
      } else if (desc.includes('corrected') || desc.includes('correction')) {
        name = '✓';
      } else if (desc.includes('no error')) {
        name = '—';
      }
      
      gates.push({
        name,
        qubits,
        column,
        type: step.type,
        label: step.description
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
        x={x - 18}
        y={y - 15}
        width={36}
        height={30}
        rx={5}
        fill={isActive ? color : `${color}88`}
        stroke={color}
        strokeWidth={isActive ? 2 : 1}
        animate={{
          filter: isActive ? 'drop-shadow(0 0 8px ' + color + ')' : 'none'
        }}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fill="white"
        fontSize={displayName.length > 2 ? 9 : 12}
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
        x={x - 18}
        y={y - 15}
        width={36}
        height={30}
        rx={5}
        fill={isActive ? color : `${color}88`}
        stroke={color}
        strokeWidth={isActive ? 2 : 1}
      />
      {/* Meter arc */}
      <path
        d={`M ${x - 8} ${y + 5} A 10 10 0 0 1 ${x + 8} ${y + 5}`}
        fill="none"
        stroke="white"
        strokeWidth={1.5}
      />
      {/* Meter needle */}
      <line
        x1={x}
        y1={y + 5}
        x2={x + 5}
        y2={y - 4}
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
  
  const wireSpacing = 50;
  const columnWidth = 50;
  const padding = { left: 60, right: 30, top: 30, bottom: 30 };
  
  const width = Math.max(padding.left + numColumns * columnWidth + padding.right, 500);
  const height = padding.top + (numQubits - 1) * wireSpacing + padding.bottom;
  
  const getQubitY = (qubit: number) => padding.top + qubit * wireSpacing;
  const getColumnX = (column: number) => padding.left + column * columnWidth + columnWidth / 2;
  
  // Current step is 1-indexed (1 = first step done), column is 0-indexed
  const currentColumnIndex = currentStep !== undefined && currentStep > 0 
    ? currentStep - 1 
    : -1;
  
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
          // Gate is active if it's been executed (column < currentStep)
          const isExecuted = currentStep === undefined || gate.column < currentStep;
          const isCurrent = gate.column === currentColumnIndex;
          const isActive = isExecuted || isCurrent;
          
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
          
          // Handle measurement (including syndrome)
          if (gate.name === 'M' || gate.name.startsWith('S:')) {
            return (
              <MeasurementGate
                key={idx}
                x={x}
                y={getQubitY(gate.qubits[0])}
                isActive={isActive}
                result={gate.name.startsWith('S:') ? undefined : steps[gate.column]?.measurementResult}
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
        
        {/* Progress indicator line */}
        {gates.length > 0 && currentColumnIndex >= 0 && (
          <line
            x1={padding.left - 15}
            y1={height - 5}
            x2={getColumnX(Math.min(currentColumnIndex, numColumns - 1)) + columnWidth / 2}
            y2={height - 5}
            stroke="#22c55e"
            strokeWidth={4}
            strokeLinecap="round"
          />
        )}
        
        {/* Current step highlight - box around current gate */}
        {currentColumnIndex >= 0 && currentColumnIndex < numColumns && (
          <motion.rect
            x={getColumnX(currentColumnIndex) - columnWidth / 2 + 2}
            y={padding.top - 20}
            width={columnWidth - 4}
            height={height - padding.top - padding.bottom + 40}
            rx={6}
            fill="rgba(34, 197, 94, 0.1)"
            stroke="#22c55e"
            strokeWidth={2}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
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

