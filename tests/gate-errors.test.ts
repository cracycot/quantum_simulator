import { QECSimulator } from '../src/core/simulator';
import type { SimulatorConfig } from '../src/core/simulator';
import type { GateErrorConfig } from '../src/core/noise/gateErrors';
import { getLogicalZeroState } from '../src/core/codes/repetition';

console.log('\n🧪 ТЕСТИРОВАНИЕ GATE ERRORS');
console.log('═'.repeat(70));

console.log('\n🧪 ТЕСТ 1: Gate Errors выключены (контрольный тест)');
console.log('━'.repeat(70));

const gateErrorConfigDisabled: GateErrorConfig = {
  enabled: false,
  type: 'bit-flip',
  probability: 0.0,
  applyTo: 'all'
};

const test1Config: SimulatorConfig = {
  codeType: 'repetition',
  initialState: 'zero',
  noiseConfig: {
    type: 'none',
    probability: 0,
    mode: 'exact-count',
    exactCount: 0
  },
  gateErrorConfig: gateErrorConfigDisabled
};

const sim1 = new QECSimulator(test1Config);
const result1 = sim1.runFullCycle();

console.log('✓ Gate Errors: ВЫКЛЮЧЕНЫ');
console.log('✓ Начальное состояние: |0⟩');
console.log('✓ Кодирование: |0⟩ → |000⟩');
console.log('✓ Шум: отсутствует');

const targetState1 = getLogicalZeroState();
const fidelity1 = result1.system.state.fidelity(targetState1);
console.log(`✓ Fidelity с |0⟩_L: ${(fidelity1 * 100).toFixed(2)}%`);

const test1Passed = fidelity1 > 0.99;
console.log(`\n${test1Passed ? '✅ ТЕСТ 1 ПРОЙДЕН' : '❌ ТЕСТ 1 НЕ ПРОЙДЕН'}`);
console.log(`Ожидалось: fidelity ≈ 100% (нет ошибок), Получено: ${(fidelity1 * 100).toFixed(2)}%`);

console.log('\n🧪 ТЕСТ 2: Gate Errors включены с вероятностью 0%');
console.log('━'.repeat(70));

const gateErrorConfig0: GateErrorConfig = {
  enabled: true,
  type: 'bit-flip',
  probability: 0.0,
  applyTo: 'all'
};

const test2Config: SimulatorConfig = {
  codeType: 'repetition',
  initialState: 'zero',
  noiseConfig: {
    type: 'none',
    probability: 0,
    mode: 'exact-count',
    exactCount: 0
  },
  gateErrorConfig: gateErrorConfig0
};

const sim2 = new QECSimulator(test2Config);
const result2 = sim2.runFullCycle();

console.log('✓ Gate Errors: ВКЛЮЧЕНЫ (p=0%)');
console.log('✓ Тип ошибки: bit-flip (X)');

const fidelity2 = result2.system.state.fidelity(targetState1);
console.log(`✓ Fidelity с |0⟩_L: ${(fidelity2 * 100).toFixed(2)}%`);

const test2Passed = fidelity2 > 0.99;
console.log(`\n${test2Passed ? '✅ ТЕСТ 2 ПРОЙДЕН' : '❌ ТЕСТ 2 НЕ ПРОЙДЕН'}`);
console.log(`Ожидалось: fidelity ≈ 100% (p=0%), Получено: ${(fidelity2 * 100).toFixed(2)}%`);

console.log('\n🧪 ТЕСТ 3: Gate Errors с вероятностью 100% (гарантированные ошибки)');
console.log('━'.repeat(70));

const gateErrorConfig100: GateErrorConfig = {
  enabled: true,
  type: 'bit-flip',
  probability: 1.0, 
  applyTo: 'single-qubit'
};

const test3Config: SimulatorConfig = {
  codeType: 'repetition',
  initialState: 'zero',
  noiseConfig: {
    type: 'none',
    probability: 0,
    mode: 'exact-count',
    exactCount: 0
  },
  gateErrorConfig: gateErrorConfig100
};

const sim3 = new QECSimulator(test3Config);
const result3 = sim3.runFullCycle();

console.log('✓ Gate Errors: ВКЛЮЧЕНЫ (p=100%)');
console.log('✓ Тип ошибки: bit-flip (X)');
console.log('✓ Область применения: однокубитные гейты');

const gateErrorSteps = result3.steps.filter(step => 
  step.type === 'gate-error' && step.gateErrorDetails
);
console.log(`✓ Количество gate errors: ${gateErrorSteps.length}`);

const hasGateErrors = gateErrorSteps.length > 0;
console.log(`✓ Gate errors обнаружены: ${hasGateErrors ? '✅ ДА' : '❌ НЕТ'}`);

if (hasGateErrors) {
  console.log('\n📊 Детали gate errors:');
  gateErrorSteps.slice(0, 5).forEach((step, idx) => {
    const details = step.gateErrorDetails!;
    console.log(`   ${idx + 1}. Гейт: ${step.gateName}, Кубит: q${details.affectedQubit}, Ошибка: ${details.errorType}`);
  });
}

const fidelity3 = result3.system.state.fidelity(targetState1);
console.log(`\n✓ Fidelity с |0⟩_L: ${(fidelity3 * 100).toFixed(2)}%`);

const test3Passed = hasGateErrors;
console.log(`\n${test3Passed ? '✅ ТЕСТ 3 ПРОЙДЕН' : '❌ ТЕСТ 3 НЕ ПРОЙДЕН'}`);
console.log(`Ожидалось: gate errors присутствуют при p=100%`);
console.log(`Получено: ${gateErrorSteps.length} gate error(s)`);

console.log('\n🧪 ТЕСТ 4: Статистическая проверка (p=10%, множество прогонов)');
console.log('━'.repeat(70));

const gateErrorConfig10: GateErrorConfig = {
  enabled: true,
  type: 'bit-flip',
  probability: 0.1, 
  applyTo: 'all'
};

const test4Config: SimulatorConfig = {
  codeType: 'repetition',
  initialState: 'zero',
  noiseConfig: {
    type: 'none',
    probability: 0,
    mode: 'exact-count',
    exactCount: 0
  },
  gateErrorConfig: gateErrorConfig10
};

const numRuns = 50;
let totalGateErrors = 0;
let totalGates = 0;

console.log(`✓ Запуск ${numRuns} симуляций с p=10%...`);

for (let i = 0; i < numRuns; i++) {
  const sim = new QECSimulator(test4Config);
  const result = sim.runFullCycle();
  
  const errorSteps = result.steps.filter(step => step.type === 'gate-error');
  totalGateErrors += errorSteps.length;
  
  totalGates += result.steps.length;
}

const observedProbability = totalGates > 0 ? totalGateErrors / totalGates : 0;
const expectedProbability = 0.1;
const tolerance = 0.05; 

console.log(`✓ Всего гейтов выполнено: ${totalGates}`);
console.log(`✓ Всего gate errors: ${totalGateErrors}`);
console.log(`✓ Наблюдаемая вероятность: ${(observedProbability * 100).toFixed(2)}%`);
console.log(`✓ Ожидаемая вероятность: ${(expectedProbability * 100).toFixed(2)}%`);

const probabilityMatch = Math.abs(observedProbability - expectedProbability) < tolerance;
console.log(`✓ Соответствие (±${(tolerance * 100).toFixed(0)}%): ${probabilityMatch ? '✅ ДА' : '⚠️ НЕТ (возможны статистические отклонения)'}`);

const test4Passed = observedProbability > 0 && observedProbability < 0.2; 
console.log(`\n${test4Passed ? '✅ ТЕСТ 4 ПРОЙДЕН' : '❌ ТЕСТ 4 НЕ ПРОЙДЕН'}`);
console.log(`Ожидалось: вероятность близка к 10% (с учетом статистики)`);
console.log(`Получено: ${(observedProbability * 100).toFixed(2)}%`);

console.log('\n🧪 ТЕСТ 5: Разные типы gate errors');
console.log('━'.repeat(70));

const errorTypes: Array<'bit-flip' | 'phase-flip' | 'bit-phase-flip' | 'depolarizing'> = [
  'bit-flip',
  'phase-flip',
  'bit-phase-flip',
  'depolarizing'
];

const test5Results: { type: string; errorCount: number; passed: boolean }[] = [];

for (const errorType of errorTypes) {
  const config: SimulatorConfig = {
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
      type: errorType,
      probability: 1.0, 
      applyTo: 'all'
    }
  };

  const sim = new QECSimulator(config);
  const result = sim.runFullCycle();
  
  const errorSteps = result.steps.filter(step => step.type === 'gate-error');
  const hasErrors = errorSteps.length > 0;
  
  console.log(`\n  ${errorType}:`);
  console.log(`    Ошибок обнаружено: ${errorSteps.length}`);
  console.log(`    Статус: ${hasErrors ? '✅ Работает' : '❌ Не работает'}`);
  
  if (hasErrors && errorSteps[0].gateErrorDetails) {
    console.log(`    Тип ошибки: ${errorSteps[0].gateErrorDetails.errorType}`);
  }
  
  test5Results.push({
    type: errorType,
    errorCount: errorSteps.length,
    passed: hasErrors
  });
}

const test5Passed = test5Results.every(r => r.passed);
console.log(`\n${test5Passed ? '✅ ТЕСТ 5 ПРОЙДЕН' : '❌ ТЕСТ 5 НЕ ПРОЙДЕН'}`);
console.log(`Ожидалось: все типы gate errors работают корректно`);
console.log(`Получено: ${test5Results.filter(r => r.passed).length}/${test5Results.length} типов работают`);

console.log('\n🧪 ТЕСТ 6: Gate Errors в коде Шора (9 кубитов)');
console.log('━'.repeat(70));

const test6Config: SimulatorConfig = {
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
    type: 'bit-flip',
    probability: 0.15, 
    applyTo: 'all'
  }
};

const sim6 = new QECSimulator(test6Config);
const result6 = sim6.runFullCycle();

const gateErrors6 = result6.steps.filter(step => step.type === 'gate-error');
console.log('✓ Код: Shor (9 кубитов)');
console.log('✓ Gate Errors: включены (p=15%)');
console.log(`✓ Всего операций: ${result6.steps.length}`);
console.log(`✓ Gate errors: ${gateErrors6.length}`);
console.log(`✓ Процент ошибок: ${((gateErrors6.length / result6.steps.length) * 100).toFixed(2)}%`);

const test6Passed = gateErrors6.length > 0;
console.log(`\n${test6Passed ? '✅ ТЕСТ 6 ПРОЙДЕН' : '❌ ТЕСТ 6 НЕ ПРОЙДЕН'}`);
console.log(`Ожидалось: gate errors работают в коде Шора`);
console.log(`Получено: ${gateErrors6.length} gate error(s)`);

console.log('\n🧪 ТЕСТ 7: Влияние gate errors на успешность коррекции');
console.log('━'.repeat(70));

const numRuns7 = 30;
let successCount = 0;

const test7Config: SimulatorConfig = {
  codeType: 'repetition',
  initialState: 'zero',
  noiseConfig: {
    type: 'bit-flip',
    probability: 0,
    mode: 'exact-count',
    exactCount: 1 
  },
  gateErrorConfig: {
    enabled: true,
    type: 'bit-flip',
    probability: 0.05, 
    applyTo: 'all'
  }
};

console.log(`✓ Запуск ${numRuns7} симуляций (1 X-ошибка + 5% gate errors)...`);

let totalFidelity = 0;
for (let i = 0; i < numRuns7; i++) {
  const sim = new QECSimulator(test7Config);
  const result = sim.runFullCycle();
  
  const fidelity = result.system.state.fidelity(targetState1);
  totalFidelity += fidelity;
  
  if (fidelity > 0.95) {
    successCount++;
  }
}

const avgFidelity = totalFidelity / numRuns7;
const successRate = successCount / numRuns7;

console.log(`✓ Средняя fidelity: ${(avgFidelity * 100).toFixed(2)}%`);
console.log(`✓ Успешных коррекций (fidelity>95%): ${successCount}/${numRuns7} (${(successRate * 100).toFixed(0)}%)`);

const test7Passed = successRate > 0.5; 
console.log(`\n${test7Passed ? '✅ ТЕСТ 7 ПРОЙДЕН' : '❌ ТЕСТ 7 НЕ ПРОЙДЕН'}`);
console.log(`Ожидалось: gate errors влияют на коррекцию, но не разрушают её полностью`);
console.log(`Получено: ${(successRate * 100).toFixed(0)}% успешных коррекций`);

console.log('\n');
console.log('═'.repeat(70));
console.log('📊 ИТОГОВЫЙ ОТЧЁТ: GATE ERRORS');
console.log('═'.repeat(70));

const allTests = [
  { name: 'ТЕСТ 1: Gate Errors выключены', passed: test1Passed },
  { name: 'ТЕСТ 2: Gate Errors p=0%', passed: test2Passed },
  { name: 'ТЕСТ 3: Gate Errors p=100%', passed: test3Passed },
  { name: 'ТЕСТ 4: Статистика p=10%', passed: test4Passed },
  { name: 'ТЕСТ 5: Разные типы ошибок', passed: test5Passed },
  { name: 'ТЕСТ 6: Код Шора с gate errors', passed: test6Passed },
  { name: 'ТЕСТ 7: Влияние на коррекцию', passed: test7Passed }
];

allTests.forEach((test, index) => {
  const status = test.passed ? '✅' : '❌';
  console.log(`${status} ${test.name}`);
});

const passedCount = allTests.filter(t => t.passed).length;
const totalCount = allTests.length;
const percentage = (passedCount / totalCount * 100).toFixed(0);

console.log('\n' + '─'.repeat(70));
console.log(`📈 Результат: ${passedCount}/${totalCount} тестов пройдено (${percentage}%)`);

if (passedCount === totalCount) {
  console.log('\n🎉 ВСЕ ТЕСТЫ GATE ERRORS ПРОЙДЕНЫ!');
  console.log('✅ Функциональность gate errors работает корректно!');
} else {
  console.log('\n⚠️ Некоторые тесты gate errors не пройдены. Требуется проверка.');
}

console.log('═'.repeat(70));
console.log('\n');

export { allTests, passedCount, totalCount };
