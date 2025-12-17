/**
 * Quantum Circuit Diagram Visualization
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { GateOperation } from '../core/quantum/gates';
import type { QuantumStep } from '../core/quantum/system';

interface CircuitGate {
  name: string;
  qubits: number[];
  column: number;
  type: 'gate' | 'measurement' | 'noise' | 'encode' | 'decode' | 'correction' | 'gate-error';
  label?: string;
}

interface QuantumCircuitProps {
  numQubits: number;
  steps: QuantumStep[];
  currentStep?: number;
  qubitLabels?: string[];
  onGateClick?: (step: number) => void;
  // Drag and drop support
  isDroppable?: boolean;
  onGateDrop?: (gateName: string, qubitIndex: number, isTwoQubit: boolean) => void;
  pendingTwoQubitGate?: { gateName: string; firstQubit: number } | null;
  // Custom gate plan for clickable gates
  customGatePlan?: Array<{ op: GateOperation; errorProbability: number; errorType: string; applyTo?: string }>;
  onCustomGateClick?: (index: number) => void;
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
  Rx: '#f97316',
  Ry: '#84cc16',
  Rz: '#0ea5e9',
  SWAP: '#14b8a6',
  noise: '#dc2626',
  'gate-error': '#f97316', // Orange for gate errors
  correction: '#10b981',
  measurement: '#6366f1'
};

const getGateColor = (name: string, type: string): string => {
  if (type === 'gate-error') return GATE_COLORS['gate-error'];
  if (type === 'noise') return GATE_COLORS.noise;
  if (type === 'correction') return GATE_COLORS.correction;
  if (type === 'measurement') return GATE_COLORS.measurement;
  return GATE_COLORS[name] || '#64748b';
};

/**
 * Parse steps into circuit gates for visualization
 * Each step from history becomes one column in the circuit
 */
function parseStepsToGates(steps: QuantumStep[]): { gates: CircuitGate[]; stepToColumnMap: Map<number, number> } {
  const gates: CircuitGate[] = [];
  const stepToColumnMap = new Map<number, number>(); // Маппинг step index -> column index
  let column = 0; // Начинаем с колонки 0 для INIT гейтов (H и CNOT)
  
  console.log('[QuantumCircuit] Parsing steps:', steps.length, steps);
  
  steps.forEach((step, stepIdx) => {
    const desc = step.description.toLowerCase();
    
    if (step.operation) {
      console.log('[QuantumCircuit] Step', stepIdx, 'has operation:', step.operation.name, 'type:', step.type, 'desc:', step.description);
      
      // Skip auto-applied gate steps like "Apply X1 (noise)..." or "Apply X₁ (correction)..."
      // They are not user operations and duplicate the NOISE/ERROR + CORRECTION events.
      const isAutoAppliedGate =
        desc.includes('(noise)') ||
        desc.includes('(correction)') ||
        desc.includes(' (noise') ||
        desc.includes(' (correction');
      if (isAutoAppliedGate) {
        console.log('[QuantumCircuit] Skipping auto-applied gate');
        return;
      }

      // Step has explicit gate operation - show it on circuit
      // Include both 'gate' and 'encode' type steps (encode steps are initialization gates)
      const isGateError = step.type === 'gate-error';
      gates.push({
        name: isGateError 
          ? `${step.operation.name}!` // Mark gate errors with !
          : (step.operation.label || step.operation.name),
        qubits: step.operation.qubits,
        column,
        type: step.type === 'encode' ? 'gate' : step.type, // Treat encode as gate for visualization
        label: step.description
      });
      console.log('[QuantumCircuit] Added gate:', gates[gates.length - 1]);
      stepToColumnMap.set(stepIdx, column);
      column++; // Увеличиваем колонку только если добавили гейт
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
      stepToColumnMap.set(stepIdx, column);
      column++; // Увеличиваем колонку только если добавили гейт
    } else {
      // Skip encode/decode steps without operations - they're shown as phase labels above
      // Only show noise, correction, and other non-gate steps that have visual meaning
      if (step.type === 'encode' || step.type === 'decode') {
        // Skip these - they're represented by phase labels, не увеличиваем column
        return;
      }
      
      // Other steps (noise, correction, etc.) that should be shown
      let name = step.type.substring(0, 3).toUpperCase();
      let qubits: number[] = [0];
      
      // Try to extract qubit info from description
      const qubitMatch = desc.match(/q[_]?(\d+)/i) || desc.match(/qubit\s*(\d+)/i);
      if (qubitMatch) {
        qubits = [parseInt(qubitMatch[1])];
      }
      
      // Determine display name from description
      if (desc.includes('x error') || desc.includes('bit-flip')) {
        name = 'X!';
      } else if (desc.includes('z error') || desc.includes('phase-flip')) {
        name = 'Z!';
      } else if (desc.includes('y error') || desc.includes('bit-phase')) {
        name = 'Y!';
      } else if (desc.includes('depolarizing')) {
        // Extract the actual error type from depolarizing
        if (desc.includes(' x ')) name = 'X!';
        else if (desc.includes(' y ')) name = 'Y!';
        else if (desc.includes(' z ')) name = 'Z!';
        else name = 'D!';
      } else if (desc.includes('corrected') || desc.includes('correction')) {
        name = '✓';
      } else if (desc.includes('no error')) {
        name = '—';
      } else if (desc.includes('gate error')) {
        // Gate error without operation info
        if (desc.includes(' x ')) name = 'X⚡';
        else if (desc.includes(' y ')) name = 'Y⚡';
        else if (desc.includes(' z ')) name = 'Z⚡';
        else name = '⚡';
      }
      
      gates.push({
        name,
        qubits,
        column,
        type: step.type,
        label: step.description
      });
      stepToColumnMap.set(stepIdx, column);
      column++; // Увеличиваем колонку только если добавили гейт
    }
  });
  
  return { gates, stepToColumnMap };
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
  const isGateError = gate.type === 'gate-error';
  
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
        stroke={isGateError ? '#fff' : color}
        strokeWidth={isGateError ? 2 : (isActive ? 2 : 1)}
        strokeDasharray={isGateError ? '3,2' : 'none'}
        animate={{
          filter: isActive ? `drop-shadow(0 0 8px ${color})` : 'none'
        }}
      />
      {/* Lightning bolt indicator for gate errors */}
      {isGateError && (
        <text
          x={x + 14}
          y={y - 10}
          textAnchor="middle"
          fill="#fbbf24"
          fontSize={10}
        >
          ⚡
        </text>
      )}
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
  onGateClick,
  isDroppable = false,
  onGateDrop,
  pendingTwoQubitGate,
  customGatePlan = [],
  onCustomGateClick
}) => {
  const [draggedOverQubit, setDraggedOverQubit] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Track global drag state
  React.useEffect(() => {
    if (!isDroppable) return;

    const handleDragStart = () => {
      setIsDragging(true);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      setDraggedOverQubit(null);
    };

    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, [isDroppable]);
  const { gates, stepToColumnMap } = parseStepsToGates(steps);
  const baseNumColumns = Math.max(gates.length > 0 ? Math.max(...gates.map(g => g.column)) + 1 : 1, 1);
  // Add extra columns for custom gates + space for new gates
  const customGateColumns = customGatePlan.length;
  const extraSpace = isDroppable ? 3 : 0; // Extra space when in drop mode
  const totalColumns = baseNumColumns + customGateColumns + extraSpace;
  
  const wireSpacing = 50;
  const columnWidth = 80; // Увеличено расстояние между колонками (клеточками) для лучшей читаемости
  const phaseLabelsHeight = 50; // Увеличено для поддержки двух строк
  const padding = { left: 100, right: 40, top: 30, bottom: 30 }; // Увеличен left для отступа гейтов
  
  const width = Math.max(padding.left + totalColumns * columnWidth + padding.right, 400);
  const height = phaseLabelsHeight + padding.top + (numQubits - 1) * wireSpacing + padding.bottom;
  
  const getQubitY = (qubit: number) => padding.top + qubit * wireSpacing;
  const getColumnX = (column: number) => padding.left + column * columnWidth + columnWidth / 2;
  
  // Current step is 1-indexed (1 = first step done), convert to column using mapping
  const currentColumnIndex = currentStep !== undefined && currentStep > 0 
    ? (stepToColumnMap.get(currentStep - 1) ?? -1)
    : -1;
  
  // Generate phase labels
  const phaseLabels = generatePhaseLabels(steps, columnWidth, padding, stepToColumnMap);
  
  return (
    <div 
      className="w-full overflow-x-auto bg-slate-900/50 rounded-xl p-4 relative" 
      style={{ minHeight: height }}
      onDragOver={(e) => {
        if (isDroppable) {
          e.preventDefault();
          if (!isDragging) setIsDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (isDroppable) {
          const rect = e.currentTarget.getBoundingClientRect();
          if (e.clientX < rect.left || e.clientX > rect.right || 
              e.clientY < rect.top || e.clientY > rect.bottom) {
            setIsDragging(false);
            setDraggedOverQubit(null);
          }
        }
      }}
      onDrop={(e) => {
        if (isDroppable) {
          e.preventDefault();
          setIsDragging(false);
        }
      }}
    >
      <svg 
        width={width} 
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block' }}
      >
        {/* Phase labels at the top */}
        <g transform={`translate(0, 0)`}>
          {phaseLabels.map((phase, idx) => (
            <g key={`phase-${phase.name}-${idx}`}>
              <rect
                x={phase.startX}
                y={6}
                width={phase.endX - phase.startX}
                height={38}
                fill={`${phase.color}22`}
                stroke={phase.color}
                strokeWidth={2}
                rx={4}
              />
              <text
                x={phase.centerX}
                y={18}
                textAnchor="middle"
                fill={phase.color}
                fontSize={11}
                fontWeight="bold"
                fontFamily="monospace"
              >
                {phase.name.split('\n').map((line, i) => (
                  <tspan key={i} x={phase.centerX} dy={i === 0 ? 0 : 14}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          ))}
        </g>
        
        {/* Main circuit content - shifted down by phaseLabelsHeight */}
        <g transform={`translate(0, ${phaseLabelsHeight})`}>
        {/* Qubit wires and labels */}
        {Array.from({ length: numQubits }, (_, i) => (
          <g key={`wire-${i}`}>
            {/* Visual indicator for drag-over */}
            {isDroppable && draggedOverQubit === i && (
              <rect
                x={padding.left - 30}
                y={getQubitY(i) - 20}
                width={width - padding.left + 30 - padding.right}
                height={40}
                fill="rgba(6, 182, 212, 0.2)"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="4,4"
              />
            )}
            {/* Wire */}
            <line
              x1={padding.left - 30}
              y1={getQubitY(i)}
              x2={width - padding.right}
              y2={getQubitY(i)}
              stroke={draggedOverQubit === i ? '#06b6d4' : '#475569'}
              strokeWidth={draggedOverQubit === i ? 3 : 2}
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
            {/* Pending two-qubit gate indicator */}
            {isDroppable && pendingTwoQubitGate && (
              <>
                {pendingTwoQubitGate.firstQubit === i && (
                  <circle
                    cx={width - padding.right - 20}
                    cy={getQubitY(i)}
                    r={8}
                    fill="#f59e0b"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )}
              </>
            )}
          </g>
        ))}
        
        {/* Column separators removed - using PhaseLabels instead */}
        
        {/* Custom gates from plan - always show when there are custom gates */}
        {customGatePlan.map((customGate, idx) => {
          const customColumn = baseNumColumns + idx;
          const x = getColumnX(customColumn);
          const gate = {
            name: customGate.op.name,
            qubits: customGate.op.qubits,
            column: customColumn,
            type: 'gate' as const,
            label: customGate.op.name
          };
          
          const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            onCustomGateClick?.(idx);
          };
          
          // Handle two-qubit gates
          if ((gate.name === 'CNOT' || gate.name === 'CZ' || gate.name === 'SWAP') && gate.qubits.length === 2) {
            return (
              <g key={`custom-${idx}`} style={{ cursor: 'pointer' }} onClick={handleClick}>
                <CNOTGate
                  controlY={getQubitY(gate.qubits[0])}
                  targetY={getQubitY(gate.qubits[1])}
                  x={x}
                  isActive={true}
                />
                {/* Clickable overlay */}
                <rect
                  x={x - 20}
                  y={Math.min(getQubitY(gate.qubits[0]), getQubitY(gate.qubits[1])) - 20}
                  width={40}
                  height={Math.abs(getQubitY(gate.qubits[0]) - getQubitY(gate.qubits[1])) + 40}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                />
                {/* Error probability indicator */}
                {customGate.errorProbability > 0 && (
                  <text
                    x={x}
                    y={getQubitY(Math.min(...gate.qubits)) - 20}
                    textAnchor="middle"
                    fill="#ef4444"
                    fontSize={10}
                    fontFamily="monospace"
                    style={{ cursor: 'pointer' }}
                  >
                    {Math.round(customGate.errorProbability * 1000) / 10}%
                  </text>
                )}
              </g>
            );
          }
          
          // Single-qubit gates
          return gate.qubits.map((qubit, qIdx) => (
            <g key={`custom-${idx}-${qIdx}`} style={{ cursor: 'pointer' }} onClick={handleClick}>
              <GateBox
                gate={gate}
                x={x}
                y={getQubitY(qubit)}
                isActive={true}
              />
              {/* Clickable overlay for better hit detection */}
              <rect
                x={x - 22}
                y={getQubitY(qubit) - 19}
                width={44}
                height={38}
                fill="transparent"
                style={{ cursor: 'pointer' }}
              />
              {/* Error probability indicator */}
              {customGate.errorProbability > 0 && (
                <text
                  x={x}
                  y={getQubitY(qubit) - 20}
                  textAnchor="middle"
                  fill="#ef4444"
                  fontSize={10}
                  fontFamily="monospace"
                  style={{ cursor: 'pointer' }}
                >
                  {Math.round(customGate.errorProbability * 1000) / 10}%
                </text>
              )}
            </g>
          ));
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
            x2={getColumnX(Math.min(currentColumnIndex, baseNumColumns - 1)) + columnWidth / 2}
            y2={height - 5}
            stroke="#22c55e"
            strokeWidth={4}
            strokeLinecap="round"
          />
        )}
        
        {/* Current step highlight - box around current gate */}
        {currentColumnIndex >= 0 && currentColumnIndex < baseNumColumns && (
          <motion.rect
            x={getColumnX(currentColumnIndex) - columnWidth / 2 + 2}
            y={padding.top - 20}
            width={columnWidth - 4}
            height={height - padding.top - padding.bottom}
            rx={6}
            fill="rgba(34, 197, 94, 0.1)"
            stroke="#22c55e"
            strokeWidth={2}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
        </g>
      </svg>
      
      {/* Droppable zones - visible and interactive only when dragging or in drop mode */}
      {isDroppable && (
        <>
          {Array.from({ length: numQubits }, (_, i) => {
            const isHighlighted = draggedOverQubit === i;
            const zoneTop = 16 + phaseLabelsHeight + padding.top + i * wireSpacing - 18;
            const zoneLeft = 16 + padding.left - 20;
            const zoneWidth = width - padding.left - padding.right + 40;
            
            return (
              <div
                key={`drop-zone-${i}`}
                className="absolute transition-all duration-150"
                style={{
                  left: `${zoneLeft}px`,
                  top: `${zoneTop}px`,
                  width: `${zoneWidth}px`,
                  height: '36px',
                  backgroundColor: isHighlighted 
                    ? 'rgba(6, 182, 212, 0.25)' 
                    : isDragging 
                      ? 'rgba(6, 182, 212, 0.1)' 
                      : 'transparent',
                  border: isHighlighted 
                    ? '2px solid #06b6d4' 
                    : isDragging 
                      ? '1px dashed rgba(6, 182, 212, 0.5)'
                      : '1px dashed transparent',
                  borderRadius: '6px',
                  zIndex: 20,
                  pointerEvents: 'auto'
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                  setDraggedOverQubit(i);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                  if (draggedOverQubit !== i) setDraggedOverQubit(i);
                }}
                onDragLeave={() => {
                    setDraggedOverQubit(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const gateName = e.dataTransfer.getData('gateName');
                  const isTwoQubit = e.dataTransfer.getData('isTwoQubit') === 'true';
                  console.log('Drop:', gateName, 'on qubit', i);
                  setDraggedOverQubit(null);
                  setIsDragging(false);
                  if (gateName && onGateDrop) {
                    onGateDrop(gateName, i, isTwoQubit);
                  }
                }}
              >
                {/* Label for qubit */}
                {isDragging && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-cyan-400 font-mono">
                    q{i}
                  </span>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

/**
 * Helper function to generate phase labels data
 */
function generatePhaseLabels(
  steps: QuantumStep[], 
  columnWidth: number, 
  padding: { left: number },
  stepToColumnMap: Map<number, number>
): Array<{ name: string; start: number; end: number; color: string; centerX: number; startX: number; endX: number }> {
  const phases: Array<{ name: string; start: number; end: number; color: string }> = [];
  let currentPhase: string | null = null;
  let phaseStartColumn: number | null = null;
  let phaseEndColumn: number | null = null;
  let initCreated = false; // Флаг для отслеживания создания INIT блока
  
  steps.forEach((step, stepIdx) => {
    let phaseName = '';
    let phaseColor = '#475569';
    
    // Determine phase from step type and description
    const desc = step.description.toLowerCase();

    // Skip auto-applied gate-steps like "Apply X1 (noise)..." or "Apply X₁ (correction)..."
    // They are not "ENCODE" operations and duplicate the NOISE/ERROR + CORRECTION labels.
    const isAutoAppliedGate =
      step.type === 'gate' &&
      (desc.includes('(noise)') ||
        desc.includes('(correction)') ||
        desc.includes(' (noise') ||
        desc.includes(' (correction'));
    if (isAutoAppliedGate) {
      return;
    }
    
    // INIT: первое появление encode (с операцией или без) начинает блок INIT
    // Все начальные encode-гейты (H, CNOT) включаются в блок INIT
    if (step.type === 'encode') {
      if (!initCreated) {
        // Первый encode шаг - начинаем блок INIT
        phaseName = 'INIT\n|0⟩';
        phaseColor = '#22c55e';
        initCreated = true;
      } else if (step.operation) {
        // Последующие encode с операциями - продолжаем блок INIT
        phaseName = 'INIT\n|0⟩';
        phaseColor = '#22c55e';
      } else {
        // encode без операции (информационные сообщения) - пропускаем
        return;
      }
    }
    // ENCODE: все gate операции от пользователя (не начальные)
    else if (step.type === 'gate') {
      phaseName = 'ENCODE';
      phaseColor = '#3b82f6';
    }
    // NOISE/ERROR
    else if (step.type === 'noise' || step.type === 'gate-error') {
      phaseName = 'NOISE/\nERROR'; // Перенос строки для лучшего отображения
      phaseColor = '#ef4444';
    } else if (step.type === 'measurement') {
      phaseName = 'MEASUREMENT';
      phaseColor = '#a855f7';
    } else if (step.type === 'correction') {
      phaseName = 'CORRECTION';
      phaseColor = '#10b981';
    }
    
    // Skip if no phase name
    if (!phaseName) return;
    
    // Get column for this step - используем реальные колонки из маппинга
    const column = stepToColumnMap.get(stepIdx) ?? (phaseStartColumn ?? 1);
    
    // If this is a new phase
    if (phaseName !== currentPhase) {
      // Close previous phase if exists
      if (currentPhase !== null && phases.length > 0 && phaseEndColumn !== null) {
        phases[phases.length - 1].end = phaseEndColumn;
      }
      // Start new phase
      currentPhase = phaseName;
      phaseStartColumn = column;
      phaseEndColumn = column;
      phases.push({ name: phaseName, start: column, end: column, color: phaseColor });
    } else {
      // Continue current phase - extend end to current column
      if (phases.length > 0) {
        phases[phases.length - 1].end = column;
      }
      phaseEndColumn = column;
    }
  });
  
  const getColumnX = (column: number) => padding.left + column * columnWidth + columnWidth / 2;
  
  return phases.map((phase, idx) => {
    // Add gap between phases to prevent overlapping
    const leftMargin = idx > 0 ? 10 : 0; // 5px gap on the left (except first)
    const rightMargin = idx < phases.length - 1 ? 10 : 0; // 5px gap on the right (except last)
    
    // Увеличено расширение блоков для размещения длинных слов типа "CORRECTION"
    const startX = getColumnX(phase.start) - 45 + leftMargin;
    const endX = getColumnX(phase.end) + 45 - rightMargin;
    const centerX = (startX + endX) / 2;
    return { ...phase, startX, endX, centerX };
  });
}

/**
 * Phase/Stage labels component for export (not used in main circuit now)
 */
export const PhaseLabels: React.FC<{
  steps: QuantumStep[];
  width: number;
  columnWidth: number;
  padding: { left: number; right: number };
}> = ({ steps, width, columnWidth, padding }) => {
  const phases = generatePhaseLabels(steps, columnWidth, padding, new Map());
  
  return (
    <div className="absolute top-0 left-0 right-0" style={{ height: '40px', pointerEvents: 'none' }}>
      <svg width={width} height={40}>
        {phases.map((phase, idx) => (
          <g key={`${phase.name}-${idx}`}>
            <rect
              x={phase.startX}
              y={8}
              width={phase.endX - phase.startX}
              height={24}
              fill={`${phase.color}22`}
              stroke={phase.color}
              strokeWidth={2}
              rx={4}
            />
            <text
              x={phase.centerX}
              y={24}
              textAnchor="middle"
              fill={phase.color}
              fontSize={11}
              fontWeight="bold"
              fontFamily="monospace"
            >
              {phase.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

/**
 * Vertical legend (for sidebar)
 */
export const CircuitLegend: React.FC = () => {
  const items = [
    { color: GATE_COLORS.X, label: 'X (Bit-flip)' },
    { color: GATE_COLORS.Z, label: 'Z (Phase-flip)' },
    { color: GATE_COLORS.Y, label: 'Y (Combined)' },
    { color: GATE_COLORS.H, label: 'H (Hadamard)' },
    { color: GATE_COLORS.CNOT, label: 'CNOT' },
    { color: GATE_COLORS.noise, label: 'Шум (Noise)' },
    { color: GATE_COLORS['gate-error'], label: 'Ошибка гейта' },
    { color: GATE_COLORS.correction, label: 'Коррекция' },
    { color: GATE_COLORS.measurement, label: 'Измерение' }
  ];
  
  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-800/50 rounded-lg">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded flex-shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-slate-300 whitespace-nowrap">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default QuantumCircuit;

