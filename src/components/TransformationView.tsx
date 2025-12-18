import { useState } from 'react';
import { QuantumStep } from '../core/quantum/system';
import './TransformationView.css';

interface TransformationViewProps {
  steps: QuantumStep[];
  currentStepIndex?: number;
  qubitLabels?: string[];
}

const ITEMS_PER_PAGE = 1;

// Determine badge type based on effect
function getBadgeType(step: QuantumStep, transformation: any): string {
  const effect = transformation.effect;
  
  // Map effect to phase badge type
  switch (effect) {
    case 'superposition':
    case 'entanglement':
    case 'encoding':
      return 'encode'; // ENCODE phase (blue) - все gate операции
    case 'error':
      return 'noise'; // NOISE/ERROR phase (red)
    case 'measurement':
      return 'measurement'; // MEASUREMENT phase (purple)
    case 'correction':
      return 'correction'; // CORRECTION phase (green)
    default:
      return step.type; // fallback to step type
  }
}

// Determine badge label based on effect
function getBadgeLabel(step: QuantumStep, transformation: any): string {
  const effect = transformation.effect;
  
  // Map effect to badge label
  switch (effect) {
    case 'superposition':
    case 'entanglement':
    case 'encoding':
      return 'ENCODE'; // Все gate операции (H, CNOT, X, Y, Z, и т.д.)
    case 'error':
      return 'NOISE/ERROR';
    case 'measurement':
      return 'MEASUREMENT';
    case 'correction':
      return 'CORRECTION';
    default:
      return step.type.toUpperCase();
  }
}

export function TransformationView({ steps, currentStepIndex = -1, qubitLabels = [] }: TransformationViewProps) {
  // Фильтруем только шаги с трансформациями
  const transformationSteps = steps.filter(step => step.transformation);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(transformationSteps.length / ITEMS_PER_PAGE);
  
  // Calculate visible items
  const startIdx = currentPage * ITEMS_PER_PAGE;
  const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, transformationSteps.length);
  const visibleSteps = transformationSteps.slice(startIdx, endIdx);

  if (transformationSteps.length === 0) {
    return (
      <div className="transformation-view empty">
        <p className="empty-message">
          📜 История трансформаций пуста
        </p>
        <p className="empty-hint">
          Запустите симуляцию, чтобы увидеть, как состояние кубитов изменяется на каждом шаге
        </p>
      </div>
    );
  }

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <div className="transformation-view">
      {/* Header with title, counters and navigation */}
      <div className="transformation-header">
        <h3 className="transformation-title">📜 История трансформаций</h3>
        <div className="pagination-info">
          <span className="page-info">
            Стр. {currentPage + 1} / {totalPages}
          </span>
          {totalPages > 1 && (
            <>
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className="pagination-btn-inline"
                title="Предыдущая страница"
              >
                ←
              </button>
              
              <div className="pagination-dots-inline">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`pagination-dot ${i === currentPage ? 'active' : ''}`}
                    title={`Страница ${i + 1}`}
                  />
                ))}
              </div>
              
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages - 1}
                className="pagination-btn-inline"
                title="Следующая страница"
              >
                →
              </button>
            </>
          )}
        </div>
      </div>

      {/* Transformation content */}
      <div className="transformation-list">
        {visibleSteps.map((step, idx) => {
          const t = step.transformation!;
          const globalIdx = startIdx + idx;
          const isActive = globalIdx === currentStepIndex;
          // Номер среди трансформаций, а не среди всех шагов
          const stepNumber = globalIdx + 1;

          return (
             <div 
               key={step.timestamp} 
               className={`transformation-step ${isActive ? 'active' : ''} effect-${t.effect}`}
             >
               {/* Фаза и номер */}
               <div className="step-header">
                 <span className="step-number">#{stepNumber}</span>
                 <span className={`phase-badge phase-${getBadgeType(step, t)}`}>
                   {getBadgeLabel(step, t)}
                 </span>
               </div>

              {/* Операция */}
              <div className="operation-info">
                <span className="operation-icon">{t.icon}</span>
                <span className="operation-name">
                  {step.operation?.name || 'Операция'}
                  {step.operation && ` → ${step.operation.qubits.map(q => qubitLabels[q] || `q${q}`).join(', ')}`}
                </span>
              </div>

              {/* Трансформация состояния */}
              <div className="state-transformation">
                <div className="state-row">
                  <span className="state-label">До:</span>
                  <code className="state-value">{t.simplifiedBefore}</code>
                </div>
                <div className="transform-arrow">→</div>
                <div className="state-row">
                  <span className="state-label">После:</span>
                  <code className="state-value">{t.simplifiedAfter}</code>
                </div>
              </div>

              {/* Физический смысл */}
              <div className={`physical-meaning effect-${t.effect}`}>
                <span className="meaning-icon">💡</span>
                <span className="meaning-text">{t.physicalMeaning}</span>
              </div>

              {/* Описание */}
              {step.description && step.description !== step.operation?.name && (
                <div className="step-description">
                  {step.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

