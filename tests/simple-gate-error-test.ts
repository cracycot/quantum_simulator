/**
 * Простой тест для проверки Gate Errors
 */

import { QECSimulator } from '../src/core/simulator';
import type { SimulatorConfig } from '../src/core/simulator';

console.log('\n🧪 ПРОСТОЙ ТЕСТ GATE ERRORS');
console.log('═'.repeat(70));

// ============================================
// ТЕСТ 1: Gate Errors с высокой вероятностью (50%)
// ============================================
console.log('\n📝 ТЕСТ 1: Gate Errors с вероятностью 50%');
console.log('─'.repeat(70));

const config1: SimulatorConfig = {
  codeType: 'repetition',
  initialState: 'zero',
  noiseConfig: {
    type: 'none',
    probability: 0,
    mode: 'exact-count',
    exactCount: 0
  },
  gateErrorConfig: {
    enabled: true,
    type: 'bit-flip',
    probability: 0.5, // 50% вероятность
    applyTo: 'all'
  }
};

console.log('⚙️ Настройки:');
console.log('  - Код: 3-кубитный (repetition)');
console.log('  - Начальное состояние: |0⟩');
console.log('  - Gate Errors: ВКЛЮЧЕНЫ');
console.log('  - Вероятность: 50%');
console.log('  - Тип ошибки: bit-flip (X)');

const sim1 = new QECSimulator(config1);
const result1 = sim1.runFullCycle();

console.log('\n📊 Результаты:');
console.log(`  Всего операций: ${result1.steps.length}`);

// Подсчёт gate errors
const gateErrors1 = result1.steps.filter(step => step.type === 'gate-error');
console.log(`  Gate errors обнаружено: ${gateErrors1.length}`);

// Подсчёт обычных гейтов
const normalGates1 = result1.steps.filter(step => step.type === 'gate');
console.log(`  Обычных гейтов: ${normalGates1.length}`);

// Показать детали gate errors
if (gateErrors1.length > 0) {
  console.log('\n  Детали gate errors:');
  gateErrors1.forEach((step, idx) => {
    const details = step.gateErrorDetails!;
    console.log(`    ${idx + 1}. ${details.errorType} на q${details.qubitIndex} после гейта ${details.gateName}`);
  });
} else {
  console.log('\n  ⚠️ Gate errors НЕ обнаружены!');
}

console.log('\n✅ ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:');
console.log('  - Должно быть несколько gate errors (примерно 1-3)');
console.log('  - Тип ошибки: X');
console.log('  - Gate errors применяются после CNOT гейтов');

// ============================================
// ТЕСТ 2: Код Шора с gate errors
// ============================================
console.log('\n\n📝 ТЕСТ 2: Код Шора с gate errors (вероятность 30%)');
console.log('─'.repeat(70));

const config2: SimulatorConfig = {
  codeType: 'shor',
  initialState: 'zero',
  noiseConfig: {
    type: 'none',
    probability: 0,
    mode: 'exact-count',
    exactCount: 0
  },
  gateErrorConfig: {
    enabled: true,
    type: 'depolarizing',
    probability: 0.3, // 30% вероятность
    applyTo: 'all'
  }
};

console.log('⚙️ Настройки:');
console.log('  - Код: Shor (9 кубитов)');
console.log('  - Начальное состояние: |0⟩');
console.log('  - Gate Errors: ВКЛЮЧЕНЫ');
console.log('  - Вероятность: 30%');
console.log('  - Тип ошибки: depolarizing (случайный X/Y/Z)');

const sim2 = new QECSimulator(config2);
const result2 = sim2.runFullCycle();

console.log('\n📊 Результаты:');
console.log(`  Всего операций: ${result2.steps.length}`);

const gateErrors2 = result2.steps.filter(step => step.type === 'gate-error');
console.log(`  Gate errors обнаружено: ${gateErrors2.length}`);

const normalGates2 = result2.steps.filter(step => step.type === 'gate');
console.log(`  Обычных гейтов: ${normalGates2.length}`);

if (gateErrors2.length > 0) {
  console.log('\n  Детали gate errors (первые 5):');
  gateErrors2.slice(0, 5).forEach((step, idx) => {
    const details = step.gateErrorDetails!;
    console.log(`    ${idx + 1}. ${details.errorType} на q${details.qubitIndex} после гейта ${details.gateName}`);
  });
  
  // Статистика типов ошибок
  const errorTypes = gateErrors2.map(s => s.gateErrorDetails!.errorType);
  const typeCount = errorTypes.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n  Статистика типов ошибок:');
  Object.entries(typeCount).forEach(([type, count]) => {
    console.log(`    ${type}: ${count}`);
  });
} else {
  console.log('\n  ⚠️ Gate errors НЕ обнаружены!');
}

console.log('\n✅ ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:');
console.log('  - Должно быть несколько gate errors (примерно 2-5)');
console.log('  - Типы ошибок: X, Y, Z (случайные)');
console.log('  - Gate errors применяются после H и CNOT гейтов');

// ============================================
// ТЕСТ 3: Статистика за 10 прогонов
// ============================================
console.log('\n\n📝 ТЕСТ 3: Статистика за 10 прогонов (p=20%)');
console.log('─'.repeat(70));

const config3: SimulatorConfig = {
  codeType: 'repetition',
  initialState: 'zero',
  noiseConfig: {
    type: 'none',
    probability: 0,
    mode: 'exact-count',
    exactCount: 0
  },
  gateErrorConfig: {
    enabled: true,
    type: 'bit-flip',
    probability: 0.2, // 20%
    applyTo: 'all'
  }
};

console.log('⚙️ Настройки:');
console.log('  - 10 прогонов симуляции');
console.log('  - Gate Errors: вероятность 20%');

let totalErrors = 0;
let totalGates = 0;

for (let i = 0; i < 10; i++) {
  const sim = new QECSimulator(config3);
  const result = sim.runFullCycle();
  
  const errors = result.steps.filter(step => step.type === 'gate-error').length;
  totalErrors += errors;
  totalGates += result.steps.length;
}

const avgErrorRate = totalGates > 0 ? (totalErrors / totalGates * 100) : 0;

console.log('\n📊 Результаты:');
console.log(`  Всего операций: ${totalGates}`);
console.log(`  Всего gate errors: ${totalErrors}`);
console.log(`  Средняя частота ошибок: ${avgErrorRate.toFixed(2)}%`);

console.log('\n✅ ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:');
console.log('  - Частота ошибок должна быть близка к 20%');
console.log('  - Допустимый диапазон: 15-25% (с учётом статистики)');

if (avgErrorRate >= 15 && avgErrorRate <= 25) {
  console.log(`\n✅ СТАТИСТИКА В НОРМЕ: ${avgErrorRate.toFixed(2)}% попадает в диапазон`);
} else if (avgErrorRate > 0) {
  console.log(`\n⚠️ СТАТИСТИКА ЗА ПРЕДЕЛАМИ: ${avgErrorRate.toFixed(2)}% вне диапазона 15-25%`);
} else {
  console.log('\n❌ GATE ERRORS НЕ РАБОТАЮТ: частота = 0%');
}

// ============================================
// ИТОГОВЫЙ ОТЧЁТ
// ============================================
console.log('\n\n═'.repeat(70));
console.log('📋 ИТОГОВЫЙ ОТЧЁТ');
console.log('═'.repeat(70));

const test1Pass = gateErrors1.length > 0;
const test2Pass = gateErrors2.length > 0;
const test3Pass = avgErrorRate >= 15 && avgErrorRate <= 25;

console.log(`\nТЕСТ 1 (3-qubit, p=50%): ${test1Pass ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН'}`);
console.log(`  Gate errors: ${gateErrors1.length}`);

console.log(`\nТЕСТ 2 (Shor, p=30%): ${test2Pass ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН'}`);
console.log(`  Gate errors: ${gateErrors2.length}`);

console.log(`\nТЕСТ 3 (Статистика, p=20%): ${test3Pass ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН'}`);
console.log(`  Частота: ${avgErrorRate.toFixed(2)}%`);

const allPassed = test1Pass && test2Pass && test3Pass;

console.log('\n' + '═'.repeat(70));
if (allPassed) {
  console.log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Gate Errors работают корректно!');
} else {
  console.log('⚠️ Некоторые тесты не пройдены. Требуется проверка.');
}
console.log('═'.repeat(70));
console.log('\n');





