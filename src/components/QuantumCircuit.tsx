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
  stepIndex?: number; 
  measurementResult?: number; 
}

interface QuantumCircuitProps {
  numQubits: number; 
  physicalQubits?: number; 
  steps: QuantumStep[];
  currentStep?: number;
  qubitLabels?: string[];
  qubitRoles?: Array<'data' | 'ancilla' | 'syndrome'>; 
  virtualQubitMap?: Map<number, number>; 
  onGateClick?: (step: number) => void;
  
  isDroppable?: boolean;
  onGateDrop?: (gateName: string, qubitIndex: number, isTwoQubit: boolean) => void;
  pendingTwoQubitGate?: { gateName: string; firstQubit: number } | null;
  
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
  'gate-error': '#f97316', 
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

function parseStepsToGates(steps: QuantumStep[]): { gates: CircuitGate[]; stepToColumnMap: Map<number, number> } {
  const gates: CircuitGate[] = [];
  const stepToColumnMap = new Map<number, number>(); 
  let column = 1; 
  
  steps.forEach((step, stepIdx) => {
    const desc = step.description.toLowerCase();
    
    if (step.operation) {
      
      const isAutoAppliedGate =
        step.type === 'gate' &&
        (desc.includes('(correction)') ||
        desc.includes(' (correction'));
      if (isAutoAppliedGate) {
        return;
      }
      
      if (step.type === 'gate-error') {
        return;
      }
      
      if (step.type === 'gate' && desc.includes('user gate:')) {
        return;
      }
      
      gates.push({
        name: step.operation.label || step.operation.name,
        qubits: step.operation.qubits,
        column,
        type: step.type,
        label: step.description
      });
      stepToColumnMap.set(stepIdx, column);
      column++; 
    } else if (step.type === 'measurement') {
      
      let qubits = step.qubitIndex !== undefined ? [step.qubitIndex] : [0];
      
      const syndromeMatch = desc.match(/\((\d+),\s*(\d+)\)/);
      gates.push({
        name: syndromeMatch ? `S:${syndromeMatch[1]}${syndromeMatch[2]}` : 'M',
        qubits,
        column,
        type: 'measurement',
        label: step.description,
        stepIndex: stepIdx,
        measurementResult: step.measurementResult
      });
      stepToColumnMap.set(stepIdx, column);
      column++; 
    } else {
      
      if (step.type === 'encode' || step.type === 'decode') {
        
        return;
      }
      
      if (step.type === 'correction') {
        return;
      }
      
      let name = step.type.substring(0, 3).toUpperCase();
      let qubits: number[] = [0];
      
      const qubitMatch = desc.match(/q[_]?(\d+)/i) || desc.match(/qubit\s*(\d+)/i);
      if (qubitMatch) {
        qubits = [parseInt(qubitMatch[1])];
      }
      
      if (desc.includes('x error') || desc.includes('bit-flip')) {
        name = 'X!';
      } else if (desc.includes('z error') || desc.includes('phase-flip')) {
        name = 'Z!';
      } else if (desc.includes('y error') || desc.includes('bit-phase')) {
        name = 'Y!';
      } else if (desc.includes('depolarizing')) {
        
        if (desc.includes(' x ')) name = 'X!';
        else if (desc.includes(' y ')) name = 'Y!';
        else if (desc.includes(' z ')) name = 'Z!';
        else name = 'D!';
      } else if (desc.includes('corrected') || desc.includes('correction')) {
        name = '✓';
      } else if (desc.includes('no error')) {
        name = '—';
      } else if (desc.includes('gate error')) {
        
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
      column++; 
    }
  });
  
  return { gates, stepToColumnMap };
}

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
      {}
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
      {}
      <line
        x1={x}
        y1={controlY}
        x2={x}
        y2={targetY}
        stroke={isActive ? color : `${color}88`}
        strokeWidth={2}
      />
      {}
      <circle
        cx={x}
        cy={controlY}
        r={6}
        fill={isActive ? color : `${color}88`}
      />
      {}
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
      {}
      <path
        d={`M ${x - 8} ${y + 5} A 10 10 0 0 1 ${x + 8} ${y + 5}`}
        fill="none"
        stroke="white"
        strokeWidth={1.5}
      />
      {}
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
  physicalQubits,
  steps,
  currentStep,
  qubitLabels,
  qubitRoles,
  virtualQubitMap,
  onGateClick,
  isDroppable = false,
  onGateDrop,
  pendingTwoQubitGate,
  customGatePlan = [],
  onCustomGateClick
}) => {
  const [draggedOverQubit, setDraggedOverQubit] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
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
  
  const lastInitColumn = gates
    .filter(g => g.type === 'gate' || g.type === 'encode')
    .reduce((max, g) => Math.max(max, g.column), -1);
  
  const customGateStartColumn = lastInitColumn + 1;
  const customGateColumns = customGatePlan.length;
  
  const shiftedGates = gates.map(g => {
    if (g.column > lastInitColumn) {
      return { ...g, column: g.column + customGateColumns };
    }
    return g;
  });
  
  const baseNumColumns = Math.max(
    shiftedGates.length > 0 ? Math.max(...shiftedGates.map(g => g.column)) + 1 : 1, 
    customGateStartColumn + customGateColumns
  );
  const extraSpace = isDroppable ? 3 : 0; 
  const totalColumns = baseNumColumns + extraSpace;
  
  const wireSpacing = numQubits > 9 ? 35 : 50; 
  const columnWidth = 80; 
  const phaseLabelsHeight = numQubits > 9 ? 70 : 50; 
  const padding = { left: 100, right: 40, top: 30, bottom: 30 }; 
  
  const width = Math.max(padding.left + totalColumns * columnWidth + padding.right, 400);
  const height = phaseLabelsHeight + padding.top + (numQubits - 1) * wireSpacing + padding.bottom;
  
  const getQubitY = (qubit: number) => padding.top + qubit * wireSpacing;
  const getColumnX = (column: number) => padding.left + column * columnWidth + columnWidth / 2;
  
  const currentColumnIndex = currentStep !== undefined && currentStep > 0 
    ? (stepToColumnMap.get(currentStep - 1) ?? -1)
    : -1;
  
  const shiftedStepToColumnMap = new Map<number, number>();
  stepToColumnMap.forEach((column, stepIdx) => {
    if (column > lastInitColumn) {
      shiftedStepToColumnMap.set(stepIdx, column + customGateColumns);
    } else {
      shiftedStepToColumnMap.set(stepIdx, column);
    }
  });
  
  const phaseLabels = generatePhaseLabels(
    steps, 
    columnWidth, 
    padding, 
    shiftedStepToColumnMap,
    customGatePlan.length > 0 ? { start: customGateStartColumn, count: customGateColumns } : undefined
  );
  
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
        {}
        <g transform={`translate(0, 0)`}>
          {phaseLabels.map((phase, idx) => {
            const labelHeight = numQubits > 9 ? 58 : 38; 
            const textStartY = numQubits > 9 ? 20 : 18;
            return (
              <g key={`phase-${phase.name}-${idx}`}>
                <rect
                  x={phase.startX}
                  y={6}
                  width={phase.endX - phase.startX}
                  height={labelHeight}
                  fill={`${phase.color}22`}
                  stroke={phase.color}
                  strokeWidth={2}
                  rx={4}
                />
                <text
                  x={phase.centerX}
                  y={textStartY}
                  textAnchor="middle"
                  fill={phase.color}
                  fontSize={numQubits > 9 ? 10 : 11}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {phase.name.split('\n').map((line, i) => (
                    <tspan key={i} x={phase.centerX} dy={i === 0 ? 0 : 12}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </g>
        
        {}
        <g transform={`translate(0, ${phaseLabelsHeight})`}>
        {}
        {Array.from({ length: numQubits }, (_, i) => {
          return (
          <g key={`wire-${i}`}>
            {}
            {isDroppable && isDragging && draggedOverQubit === i && (
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
            {}
            <line
              x1={padding.left - 30}
              y1={getQubitY(i)}
              x2={width - padding.right}
              y2={getQubitY(i)}
              stroke={draggedOverQubit === i ? '#06b6d4' : '#475569'}
              strokeWidth={draggedOverQubit === i ? 3 : 2}
            />
            {}
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
            
            {}
            {virtualQubitMap && virtualQubitMap.has(i) && (
              <g>
                {}
                <line
                  x1={padding.left - 30}
                  y1={getQubitY(i)}
                  x2={width - padding.right}
                  y2={getQubitY(i)}
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="2,4"
                  opacity={0.6}
                />
                {}
                <g>
                  <circle
                    cx={padding.left - 10}
                    cy={getQubitY(i)}
                    r={7}
                    fill="#f59e0b"
                    opacity={0.8}
                  />
                  <text
                    x={padding.left - 10}
                    y={getQubitY(i) + 4}
                    textAnchor="middle"
                    fill="#1e293b"
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    v
                  </text>
                  {}
                  <title>
                    Virtual ancilla: maps to physical ancilla at index {virtualQubitMap.get(i)}
                    {'\n'}(Sequential measurement with reset)
                  </title>
                </g>
              </g>
            )}
            
            {}
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
          );
        })}
        
        {}
        
        {}
        {customGatePlan.map((customGate, idx) => {
          const customColumn = customGateStartColumn + idx;
          const x = getColumnX(customColumn);
          const gate = {
            name: customGate.op.name,
            qubits: customGate.op.qubits,
            column: customColumn,
            type: 'gate' as const,
            label: customGate.op.name
          };
          
          let hasGateError = false;
          let errorDetails: any = undefined;
          
          const userGatesBefore = idx;
          
          const userGateSteps = steps.filter(step => step.type === 'gate');
          
          if (userGatesBefore < userGateSteps.length) {
            const thisGateStep = userGateSteps[userGatesBefore];
            const thisGateStepIndex = steps.indexOf(thisGateStep);
            
            for (let i = thisGateStepIndex + 1; i < Math.min(thisGateStepIndex + 5, steps.length); i++) {
              if (steps[i].type === 'gate-error' && steps[i].gateErrorDetails) {
                
                hasGateError = true;
                errorDetails = steps[i].gateErrorDetails;
                break;
              }
              
              if (steps[i].type === 'gate') break;
            }
          }
          
          const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            onCustomGateClick?.(idx);
          };
          
          if ((gate.name === 'CNOT' || gate.name === 'CZ' || gate.name === 'SWAP') && gate.qubits.length === 2) {
            return (
              <g key={`custom-${idx}`} style={{ cursor: 'pointer' }} onClick={handleClick}>
                <CNOTGate
                  controlY={getQubitY(gate.qubits[0])}
                  targetY={getQubitY(gate.qubits[1])}
                  x={x}
                  isActive={true}
                />
                {}
                <rect
                  x={x - 20}
                  y={Math.min(getQubitY(gate.qubits[0]), getQubitY(gate.qubits[1])) - 20}
                  width={40}
                  height={Math.abs(getQubitY(gate.qubits[0]) - getQubitY(gate.qubits[1])) + 40}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                />
                {}
                {hasGateError && errorDetails && (
                  <g>
                    {}
                    <path
                      d={`M ${x + 18} ${getQubitY(Math.min(...gate.qubits)) - 25} l -6 -10 l 12 0 z`}
                      fill="#ef4444"
                      stroke="#fff"
                      strokeWidth={1}
                    />
                    {}
                    <text
                      x={x + 18}
                      y={getQubitY(Math.min(...gate.qubits)) - 28}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize={8}
                      fontWeight="bold"
                      style={{ pointerEvents: 'none' }}
                    >
                      !
                    </text>
                    {}
                    <text
                      x={x + 18}
                      y={getQubitY(Math.min(...gate.qubits)) - 14}
                      textAnchor="middle"
                      fill="#ef4444"
                      fontSize={9}
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {errorDetails.errorType}
                    </text>
                  </g>
                )}
                {}
                {!hasGateError && customGate.errorProbability > 0 && (
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
          
          return gate.qubits.map((qubit, qIdx) => {
            
            const errorOnThisQubit = hasGateError && errorDetails?.qubitIndex === qubit;
            
            return (
            <g key={`custom-${idx}-${qIdx}`} style={{ cursor: 'pointer' }} onClick={handleClick}>
              <GateBox
                gate={gate}
                x={x}
                y={getQubitY(qubit)}
                isActive={true}
              />
              {}
              <rect
                x={x - 22}
                y={getQubitY(qubit) - 19}
                width={44}
                height={38}
                fill="transparent"
                style={{ cursor: 'pointer' }}
              />
                {}
                {errorOnThisQubit && errorDetails && (
                  <g>
                    {}
                    <path
                      d={`M ${x + 18} ${getQubitY(qubit) - 23} l -6 -10 l 12 0 z`}
                      fill="#ef4444"
                      stroke="#fff"
                      strokeWidth={1}
                    />
                    {}
                    <text
                      x={x + 18}
                      y={getQubitY(qubit) - 26}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize={8}
                      fontWeight="bold"
                      style={{ pointerEvents: 'none' }}
                    >
                      !
                    </text>
                    {}
                    <text
                      x={x + 18}
                      y={getQubitY(qubit) - 12}
                      textAnchor="middle"
                      fill="#ef4444"
                      fontSize={9}
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {errorDetails.errorType}
                    </text>
                  </g>
                )}
                {}
                {!errorOnThisQubit && customGate.errorProbability > 0 && (
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
            );
          });
        })}

        {}
        {shiftedGates.map((gate, idx) => {
          const x = getColumnX(gate.column);
          
          const isExecuted = currentStep === undefined || gate.column < currentStep;
          const isCurrent = gate.column === currentColumnIndex;
          const isActive = isExecuted || isCurrent;
          
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
          
          if (gate.name === 'M' || gate.name.startsWith('S:')) {
            return (
              <MeasurementGate
                key={idx}
                x={x}
                y={getQubitY(gate.qubits[0])}
                isActive={isActive}
                result={gate.measurementResult}
              />
            );
          }
          
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
        
        {}
        {shiftedGates.length > 0 && currentColumnIndex >= 0 && (
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
        
        {}
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
      
      {}
      {isDroppable && (
        <>
          {Array.from({ length: numQubits }, (_, i) => {
            const qubitRole = qubitRoles?.[i] || 'data';
            const isAncilla = qubitRole === 'ancilla' || qubitRole === 'syndrome';
            const isHighlighted = draggedOverQubit === i;
            const zoneTop = 16 + phaseLabelsHeight + padding.top + i * wireSpacing - 18;
            const zoneLeft = 16 + padding.left - 20;
            const zoneWidth = width - padding.left - padding.right + 40;
            
            if (isAncilla) {
              return (
                <div
                  key={`drop-zone-${i}`}
                  className="absolute transition-all duration-150"
                  style={{
                    left: `${zoneLeft}px`,
                    top: `${zoneTop}px`,
                    width: `${zoneWidth}px`,
                    height: '36px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px dashed rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    zIndex: 20,
                    pointerEvents: 'none', 
                    opacity: 0.5
                  }}
                >
                  {isDragging && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-red-400 font-mono">
                      🔒 {qubitLabels?.[i] ?? `q${i}`}
                    </span>
                  )}
                </div>
              );
            }
            
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
                {}
                {isDragging && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-cyan-400 font-mono">
                    {qubitLabels?.[i] ?? `q${i}`}
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

function generatePhaseLabels(
  steps: QuantumStep[], 
  columnWidth: number, 
  padding: { left: number },
  stepToColumnMap: Map<number, number>,
  customGatesInfo?: { start: number; count: number }
): Array<{ name: string; start: number; end: number; color: string; centerX: number; startX: number; endX: number }> {
  const phases: Array<{ name: string; start: number; end: number; color: string }> = [];
  
  const INIT_NAME = 'INIT\n|0⟩';
  let initEndColumn = 0;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const desc = step.description.toLowerCase();
    
    const isAutoAppliedGate =
      step.type === 'gate' &&
      (desc.includes('(noise)') ||
        desc.includes('(correction)') ||
        desc.includes(' (noise') ||
        desc.includes(' (correction'));
    if (isAutoAppliedGate) continue;

    const col = stepToColumnMap.get(i);
    if (col === undefined) continue;

    if (step.type === 'encode') {
      initEndColumn = Math.max(initEndColumn, col);
      continue;
    }
    
    break;
  }

  phases.push({ name: INIT_NAME, start: 0, end: initEndColumn, color: '#22c55e' });
  let currentPhase: string | null = INIT_NAME;
  let phaseStartColumn: number | null = 0;
  let phaseEndColumn: number | null = initEndColumn;
  let initCreated = true; 
  
  steps.forEach((step, stepIdx) => {
    let phaseName = '';
    let phaseColor = '#475569';
    
    const desc = step.description.toLowerCase();
    
    const isAutoAppliedGate =
      step.type === 'gate' &&
      (desc.includes('(correction)') ||
        desc.includes(' (correction'));
    if (isAutoAppliedGate) {
      return;
    }
    
    if (step.type === 'encode' && (desc.includes('initialize') || desc.includes('init'))) {
      if (initCreated) {
        return; 
      }
      phaseName = 'INIT\n|0⟩';
      phaseColor = '#22c55e';
      initCreated = true; 
    }
    
    else if (step.type === 'encode' && !desc.includes('initialize')) {
      return; 
    }
    
    else if (step.type === 'gate' && desc.includes('(syndrome)')) {
      phaseName = 'MEASUREMENT';
      phaseColor = '#a855f7';
    }
    
    else if (step.type === 'gate') {
      phaseName = 'ENCODE';
      phaseColor = '#3b82f6';
    }
    
    else if (step.type === 'noise' || step.type === 'gate-error') {
      phaseName = 'NOISE/\nERROR'; 
      phaseColor = '#ef4444';
    } else if (step.type === 'measurement') {
      phaseName = 'MEASUREMENT';
      phaseColor = '#a855f7';
    } else if (step.type === 'correction') {
      phaseName = 'CORR'; 
      phaseColor = '#10b981';
    }
    
    if (!phaseName) return;
    
    let column: number;
    if (phaseName.startsWith('INIT')) {
      
      column = 0;
    } else {
      
      const mappedColumn = stepToColumnMap.get(stepIdx);
      if (mappedColumn === undefined) {
        
        return;
      }
      column = mappedColumn;
    }
    
    if (phaseName !== currentPhase) {
      
      if (currentPhase !== null && phases.length > 0 && phaseEndColumn !== null) {
        phases[phases.length - 1].end = phaseEndColumn;
      }
      
      currentPhase = phaseName;
      phaseStartColumn = column;
      phaseEndColumn = column;
      phases.push({ name: phaseName, start: column, end: column, color: phaseColor });
    } else {
      
      if (phases.length > 0) {
        phases[phases.length - 1].end = column;
      }
      phaseEndColumn = column;
    }
  });
  
  if (customGatesInfo && customGatesInfo.count > 0) {
    phases.push({
      name: 'GATES',
      start: customGatesInfo.start,
      end: customGatesInfo.start + customGatesInfo.count - 1,
      color: '#f59e0b' 
    });
  }
  
  const getColumnX = (column: number) => padding.left + column * columnWidth + columnWidth / 2;
  
  return phases.map((phase, idx) => {
    
    const leftMargin = idx > 0 ? 20 : 0; 
    const rightMargin = idx < phases.length - 1 ? 20 : 0; 
    
    const startX = getColumnX(phase.start) - 45 + leftMargin;
    const endX = getColumnX(phase.end) + 45 - rightMargin;
    const centerX = (startX + endX) / 2;
    return { ...phase, startX, endX, centerX };
  });
}

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
