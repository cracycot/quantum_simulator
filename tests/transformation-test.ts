/**
 * Тест для проверки генерации трансформаций
 */
import { QECSimulator } from '../src/core/simulator';

console.log('🧪 Тест истории трансформаций\n');

// Создаем симулятор с 3-кубитным кодом
const simulator = new QECSimulator({
  codeType: 'repetition',
  initialState: 'plus',
  noiseConfig: {
    type: 'bit-flip',
    probability: 1.0, // 100% вероятность для теста
    targetQubits: [1]
  }
});

// Запускаем симуляцию
simulator.runFullCycle();

// Получаем историю
const history = simulator.getHistory();

console.log(`📜 Всего шагов: ${history.length}\n`);

// Фильтруем шаги с трансформациями
const stepsWithTransformations = history.filter(step => step.transformation);

console.log(`✨ Шагов с трансформациями: ${stepsWithTransformations.length}\n`);

// Выводим детали каждой трансформации
stepsWithTransformations.forEach((step, idx) => {
  const t = step.transformation!;
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`${t.icon} Шаг ${idx + 1}: ${step.type.toUpperCase()}`);
  console.log(`Операция: ${step.description}`);
  console.log(`\nТрансформация:`);
  console.log(`  До:    ${t.simplifiedBefore}`);
  console.log(`  После: ${t.simplifiedAfter}`);
  console.log(`\n💡 ${t.physicalMeaning}`);
  console.log(`   Эффект: ${t.effect}`);
  console.log('');
});

console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

// Проверяем наличие ключевых трансформаций
const hasSuperposition = stepsWithTransformations.some(s => s.transformation?.effect === 'superposition');
const hasEntanglement = stepsWithTransformations.some(s => s.transformation?.effect === 'entanglement');
const hasError = stepsWithTransformations.some(s => s.transformation?.effect === 'error');
const hasCorrection = stepsWithTransformations.some(s => s.transformation?.effect === 'correction');

console.log('✅ Проверка типов трансформаций:');
console.log(`   🌀 Суперпозиция: ${hasSuperposition ? '✓' : '✗'}`);
console.log(`   🔗 Запутанность:  ${hasEntanglement ? '✓' : '✗'}`);
console.log(`   ⚠️  Ошибка:       ${hasError ? '✓' : '✗'}`);
console.log(`   ✅ Коррекция:    ${hasCorrection ? '✓' : '✗'}`);

const allChecks = hasSuperposition && hasEntanglement && hasError && hasCorrection;
console.log(`\n${allChecks ? '🎉' : '❌'} Результат: ${allChecks ? 'ВСЕ ТРАНСФОРМАЦИИ РАБОТАЮТ!' : 'Некоторые трансформации отсутствуют'}\n`);

// Проверяем состояние
const state = simulator.getState();
console.log(`📊 Текущая фаза симуляции: ${state.phase}`);
console.log(`   Всего шагов в истории: ${history.length}`);
console.log(`   Шагов с трансформациями: ${stepsWithTransformations.length}\n`);

