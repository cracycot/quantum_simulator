import React, { useState } from 'react';
import { QuantumStep } from '../core/quantum/system';
import './TransformationView.css';

interface TransformationViewProps {
  steps: QuantumStep[];
  currentStepIndex?: number;
  qubitLabels?: string[];
}

const ITEMS_PER_PAGE = 3;

// Determine badge type based on effect
function getBadgeType(step: QuantumStep, transformation: any): string {
  // Check if this is a user gate
  if (step.description.toLowerCase().includes('user gate:')) {
    return 'gate'; // Orange color for user gates
  }
  
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
  // Check if this is a user gate
  if (step.description.toLowerCase().includes('user gate:')) {
    return 'GATES';
  }
  
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
  console.log('[TransformationView] Received steps:', steps.length);
  
  // Log user gates
  const userGates = steps.filter(s => s.description.toLowerCase().includes('user gate:'));
  console.log('[TransformationView] User gates found:', userGates.length);
  userGates.forEach((gate, i) => {
    console.log(`  User gate ${i}:`, gate.description, 'has transformation:', !!gate.transformation, 'type:', gate.type);
    if (gate.transformation) {
      console.log(`    Transformation:`, gate.transformation.effect, gate.transformation.icon);
    }
  });
  
  // Фильтруем шаги: с трансформациями ИЛИ важные текстовые логи (предупреждения)
  const transformationSteps = steps.filter(step => {
    const hasTransformation = !!step.transformation;
    const isImportantLog = step.description.includes('⚠️') || 
                          step.description.includes('ОБНАРУЖЕНО') ||
                          step.description.includes('🔧') ||
                          step.description.includes('Обнаружен');
    
    if (!hasTransformation && !isImportantLog) {
      console.log('[TransformationView] Step without transformation (skipped):', step.description, step.type);
    }
    return hasTransformation || isImportantLog;
  });
  
  console.log('[TransformationView] Steps with transformations:', transformationSteps.length);
  console.log('[TransformationView] User gates in transformationSteps:', 
    transformationSteps.filter(s => s.description.toLowerCase().includes('user gate:')).length);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(transformationSteps.length / ITEMS_PER_PAGE);
  
  // Auto-navigate to last page when new transformations are added
  React.useEffect(() => {
    if (totalPages > 0 && currentPage >= totalPages) {
      setCurrentPage(totalPages - 1);
    }
  }, [totalPages, currentPage]);
  
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
              
              <button
                onClick={() => setCurrentPage(totalPages - 1)}
                disabled={currentPage === totalPages - 1}
                className="pagination-btn-inline"
                title="Последняя страница"
                style={{ marginLeft: '8px' }}
              >
                ⏭
              </button>
            </>
          )}
        </div>
      </div>

      {/* Transformation content */}
      <div className="transformation-list">
        {visibleSteps.map((step, idx) => {
          const globalIdx = startIdx + idx;
          const isActive = globalIdx === currentStepIndex;
          const stepNumber = globalIdx + 1;
          
          // Check if this is a text-only log (no transformation)
          if (!step.transformation) {
            return (
              <div 
                key={step.timestamp} 
                className={`transformation-step text-log ${isActive ? 'active' : ''}`}
              >
                <div className="step-header">
                  <span className="step-number">#{stepNumber}</span>
                  <span className={`phase-badge phase-${step.type}`}>
                    {getTypeLabel(step.type)}
                  </span>
                </div>
                
                <div className="step-description text-log-content">
                  {step.description}
                </div>
              </div>
            );
          }
          
          const t = step.transformation;

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

