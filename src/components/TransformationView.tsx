import { useState } from 'react';
import { QuantumStep } from '../core/quantum/system';
import './TransformationView.css';

interface TransformationViewProps {
  steps: QuantumStep[];
  currentStepIndex?: number;
}

const ITEMS_PER_PAGE = 3;

export function TransformationView({ steps, currentStepIndex = -1 }: TransformationViewProps) {
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
      <div className="transformation-header">
        <h3>📜 История трансформаций</h3>
        <div className="pagination-info">
          <span className="step-count">{transformationSteps.length} шагов</span>
          <span className="page-info">
            Стр. {currentPage + 1} / {totalPages}
          </span>
        </div>
      </div>

      <div className="transformation-list">
        {visibleSteps.map((step, idx) => {
          const t = step.transformation!;
          const globalIdx = startIdx + idx;
          const isActive = globalIdx === currentStepIndex;
          const stepNumber = steps.indexOf(step) + 1;

          return (
            <div 
              key={step.timestamp} 
              className={`transformation-step ${isActive ? 'active' : ''} effect-${t.effect}`}
            >
              {/* Фаза и номер */}
              <div className="step-header">
                <span className="step-number">#{stepNumber}</span>
                <span className={`phase-badge phase-${step.type}`}>
                  {step.type.toUpperCase()}
                </span>
              </div>

              {/* Операция */}
              <div className="operation-info">
                <span className="operation-icon">{t.icon}</span>
                <span className="operation-name">
                  {step.operation?.name || 'Операция'}
                  {step.operation && ` → ${step.operation.qubits.map(q => `q${q}`).join(', ')}`}
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className="pagination-btn"
            title="Предыдущая страница"
          >
            ← Назад
          </button>
          
          <div className="pagination-dots">
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
            className="pagination-btn"
            title="Следующая страница"
          >
            Вперед →
          </button>
        </div>
      )}
    </div>
  );
}

