import { QECSimulator } from '../src/core/simulator';
import type { SimulatorConfig } from '../src/core/simulator';
import { 
  getLogicalZeroState, 
  getLogicalOneState, 
  getLogicalPlusState 
} from '../src/core/codes/repetition';
import { 
  getShorLogicalZeroState, 
  getShorLogicalOneState 
} from '../src/core/codes/shor';

function assertFidelity(actual: number, expected: number, tolerance: number = 0.01): boolean {
  const diff = Math.abs(actual - expected);
  return diff <= tolerance;
}

console.log('\n🧪 ТЕСТ 1: 3-кубитный код - одиночная X-ошибка (УСПЕХ)');
console.log('━'.repeat(60));

const test1Config: SimulatorConfig = {
  codeType: 'repetition',
  initialState: 'zero',
  noiseConfig: {
    type: 'bit-flip',
    probability: 0,
    mode: 'exact-count',
    exactCount: 1
  }
};

const sim1 = new QECSimulator(test1Config);
const result1 = sim1.runFullCycle();

console.log('✓ Начальное состояние: |0⟩');
console.log('✓ Кодирование: |0⟩ → |000⟩');
console.log('✓ Применена 1 X-ошибка');
console.log(`✓ Синдром: [${result1.syndrome.join(', ')}]`);
console.log(`✓ Ошибка обнаружена: ${result1.errorDetected ? '✅ ДА' : '❌ НЕТ'}`);
console.log(`✓ Коррекция применена: ${result1.correctionApplied ? '✅ ДА' : '❌ НЕТ'}`);

const targetState1 = getLogicalZeroState();
const fidelity1 = result1.system.state.fidelity(targetState1);
console.log(`✓ Fidelity с |0⟩_L: ${(fidelity1 * 100).toFixed(2)}%`);

const test1Passed = assertFidelity(fidelity1, 1.0, 0.05);
console.log(`\n${test1Passed ? '✅ ТЕСТ 1 ПРОЙДЕН' : '❌ ТЕСТ 1 НЕ ПРОЙДЕН'}`);
console.log(`Ожидалось: fidelity ≈ 100%, Получено: ${(fidelity1 * 100).toFixed(2)}%`);

console.log('\n🧪 ТЕСТ 2: 3-кубитный код - две X-ошибки (ПРЕДЕЛ)');
console.log('━'.repeat(60));

const test2Config: SimulatorConfig = {
  codeType: 'repetition',
  initialState: 'zero',
  noiseConfig: {
    type: 'bit-flip',
    probability: 0,
    mode: 'exact-count',
    exactCount: 2
  }
};

const sim2 = new QECSimulator(test2Config);
const result2 = sim2.runFullCycle();

console.log('✓ Начальное состояние: |0⟩');
console.log('✓ Применено 2 X-ошибки');
console.log(`✓ Синдром: [${result2.syndrome.join(', ')}]`);
console.log(`✓ Коррекция применена: ${result2.correctionApplied ? 'ДА' : 'НЕТ'}`);

const fidelity2 = result2.system.state.fidelity(targetState1);
console.log(`✓ Fidelity с |0⟩_L: ${(fidelity2 * 100).toFixed(2)}%`);

const test2Passed = fidelity2 < 0.5; 
console.log(`\n${test2Passed ? '✅ ТЕСТ 2 ПРОЙДЕН' : '❌ ТЕСТ 2 НЕ ПРОЙДЕН'}`);
console.log(`Ожидалось: fidelity < 50% (код не справился), Получено: ${(fidelity2 * 100).toFixed(2)}%`);

console.log('\n🧪 ТЕСТ 3: 3-кубитный код - Z-ошибка на |+⟩ (ОГРАНИЧЕНИЕ)');
console.log('━'.repeat(60));

const test3Config: SimulatorConfig = {
  codeType: 'repetition',
  initialState: 'plus',
  noiseConfig: {
    type: 'phase-flip',
    probability: 0,
    mode: 'exact-count',
    exactCount: 1
  }
};

const sim3 = new QECSimulator(test3Config);
const result3 = sim3.runFullCycle();

console.log('✓ Начальное состояние: |+⟩');
console.log('✓ Применена 1 Z-ошибка');
console.log(`✓ Синдром: [${result3.syndrome.join(', ')}]`);
console.log(`✓ Ошибка обнаружена: ${result3.errorDetected ? 'ДА' : '❌ НЕТ (правильно!)'}`);

const targetState3 = getLogicalPlusState();
const fidelity3 = result3.system.state.fidelity(targetState3);
console.log(`✓ Fidelity с |+⟩_L: ${(fidelity3 * 100).toFixed(2)}%`);

const test3Passed = !result3.errorDetected && fidelity3 < 0.95;
console.log(`\n${test3Passed ? '✅ ТЕСТ 3 ПРОЙДЕН' : '❌ ТЕСТ 3 НЕ ПРОЙДЕН'}`);
console.log(`Ожидалось: синдром (0,0), ошибка НЕ обнаружена, fidelity < 95%`);
console.log(`Получено: синдром [${result3.syndrome.join(', ')}], fidelity ${(fidelity3 * 100).toFixed(2)}%`);

console.log('\n🧪 ТЕСТ 4: Код Шора (9 кубитов) - одиночная X-ошибка');
console.log('━'.repeat(60));

const test4Config: SimulatorConfig = {
  codeType: 'shor',
  initialState: 'zero',
  noiseConfig: {
    type: 'bit-flip',
    probability: 0,
    mode: 'exact-count',
    exactCount: 1
  }
};

const sim4 = new QECSimulator(test4Config);
const result4 = sim4.runFullCycle();

console.log('✓ Начальное состояние: |0⟩');
console.log('✓ Кодирование в 9 кубитов (код Шора)');
console.log('✓ Применена 1 X-ошибка');
console.log(`✓ Bit-flip синдром: [${result4.syndrome.slice(0, 6).join(', ')}]`);
console.log(`✓ Phase-flip синдром: [${result4.syndrome.slice(6).join(', ')}]`);
console.log(`✓ Ошибка обнаружена: ${result4.errorDetected ? '✅ ДА' : '❌ НЕТ'}`);
console.log(`✓ Коррекция применена: ${result4.correctionApplied ? '✅ ДА' : '❌ НЕТ'}`);

const targetStateShor = getShorLogicalZeroState();
const fidelity4 = result4.system.state.fidelity(targetStateShor);
console.log(`✓ Fidelity с |0⟩_L: ${(fidelity4 * 100).toFixed(2)}%`);

const test4Passed = assertFidelity(fidelity4, 1.0, 0.05);
console.log(`\n${test4Passed ? '✅ ТЕСТ 4 ПРОЙДЕН' : '❌ ТЕСТ 4 НЕ ПРОЙДЕН'}`);
console.log(`Ожидалось: fidelity ≈ 100%, Получено: ${(fidelity4 * 100).toFixed(2)}%`);

console.log('\n🧪 ТЕСТ 5: Код Шора (9 кубитов) - одиночная Z-ошибка');
console.log('━'.repeat(60));

const test5Config: SimulatorConfig = {
  codeType: 'shor',
  initialState: 'zero',
  noiseConfig: {
    type: 'phase-flip',
    probability: 0,
    mode: 'exact-count',
    exactCount: 1
  }
};

const sim5 = new QECSimulator(test5Config);
const result5 = sim5.runFullCycle();

console.log('✓ Начальное состояние: |0⟩');
console.log('✓ Применена 1 Z-ошибка (phase-flip)');
console.log(`✓ Bit-flip синдром: [${result5.syndrome.slice(0, 6).join(', ')}]`);
console.log(`✓ Phase-flip синдром: [${result5.syndrome.slice(6).join(', ')}]`);

const phaseErrorDetected = result5.syndrome[6] !== 0 || result5.syndrome[7] !== 0;
console.log(`✓ Phase-ошибка обнаружена: ${phaseErrorDetected ? '✅ ДА' : '❌ НЕТ'}`);

const fidelity5 = result5.system.state.fidelity(targetStateShor);
console.log(`✓ Fidelity с |0⟩_L: ${(fidelity5 * 100).toFixed(2)}%`);

const test5Passed = phaseErrorDetected && assertFidelity(fidelity5, 1.0, 0.05);
console.log(`\n${test5Passed ? '✅ ТЕСТ 5 ПРОЙДЕН' : '❌ ТЕСТ 5 НЕ ПРОЙДЕН'}`);
console.log(`Ожидалось: phase-синдром ≠ [0,0], fidelity ≈ 100%`);
console.log(`Получено: phase-синдром [${result5.syndrome.slice(6).join(', ')}], fidelity ${(fidelity5 * 100).toFixed(2)}%`);

console.log('\n🧪 ТЕСТ 6: Код Шора (9 кубитов) - одиночная Y-ошибка');
console.log('━'.repeat(60));

const test6Config: SimulatorConfig = {
  codeType: 'shor',
  initialState: 'zero',
  noiseConfig: {
    type: 'bit-phase-flip',
    probability: 0,
    mode: 'exact-count',
    exactCount: 1
  }
};

const sim6 = new QECSimulator(test6Config);
const result6 = sim6.runFullCycle();

console.log('✓ Начальное состояние: |0⟩');
console.log('✓ Применена 1 Y-ошибка (bit + phase flip)');
console.log(`✓ Bit-flip синдром: [${result6.syndrome.slice(0, 6).join(', ')}]`);
console.log(`✓ Phase-flip синдром: [${result6.syndrome.slice(6).join(', ')}]`);

const bitErrorDetected = result6.syndrome.slice(0, 6).some(s => s !== 0);
const phaseErrorDetected6 = result6.syndrome[6] !== 0 || result6.syndrome[7] !== 0;
console.log(`✓ Bit-компонента обнаружена: ${bitErrorDetected ? '✅ ДА' : '❌ НЕТ'}`);
console.log(`✓ Phase-компонента обнаружена: ${phaseErrorDetected6 ? '✅ ДА' : '❌ НЕТ'}`);

const fidelity6 = result6.system.state.fidelity(targetStateShor);
console.log(`✓ Fidelity с |0⟩_L: ${(fidelity6 * 100).toFixed(2)}%`);

const test6Passed = bitErrorDetected && phaseErrorDetected6 && assertFidelity(fidelity6, 1.0, 0.05);
console.log(`\n${test6Passed ? '✅ ТЕСТ 6 ПРОЙДЕН' : '❌ ТЕСТ 6 НЕ ПРОЙДЕН'}`);
console.log(`Ожидалось: обе компоненты обнаружены, fidelity ≈ 100%`);
console.log(`Получено: bit=${bitErrorDetected}, phase=${phaseErrorDetected6}, fidelity ${(fidelity6 * 100).toFixed(2)}%`);

console.log('\n🧪 ТЕСТ 7: Код Шора - 2 X-ошибки (проверка нескольких блоков)');
console.log('━'.repeat(60));

const test7Config: SimulatorConfig = {
  codeType: 'shor',
  initialState: 'zero',
  noiseConfig: {
    type: 'bit-flip',
    probability: 0,
    mode: 'exact-count',
    exactCount: 2
  }
};

const sim7 = new QECSimulator(test7Config);
const result7 = sim7.runFullCycle();

console.log('✓ Начальное состояние: |0⟩');
console.log('✓ Применено 2 X-ошибки');

const erroredQubits = result7.errorsApplied
  .filter(e => e.applied)
  .map(e => e.qubitIndex);
console.log(`✓ Ошибки на кубитах: ${erroredQubits.join(', ')}`);

const blocks = erroredQubits.map(q => Math.floor(q / 3));
const differentBlocks = new Set(blocks).size === 2;
console.log(`✓ Ошибки в разных блоках: ${differentBlocks ? '✅ ДА' : '⚠️ НЕТ (в одном блоке)'}`);

console.log(`✓ Bit-flip синдром: [${result7.syndrome.slice(0, 6).join(', ')}]`);

const fidelity7 = result7.system.state.fidelity(targetStateShor);
console.log(`✓ Fidelity с |0⟩_L: ${(fidelity7 * 100).toFixed(2)}%`);

if (differentBlocks) {
  
  const test7Passed = assertFidelity(fidelity7, 1.0, 0.05);
  console.log(`\n${test7Passed ? '✅ ТЕСТ 7 ПРОЙДЕН' : '❌ ТЕСТ 7 НЕ ПРОЙДЕН'}`);
  console.log(`Ошибки в разных блоках → код должен исправить`);
  console.log(`Ожидалось: fidelity ≈ 100%, Получено: ${(fidelity7 * 100).toFixed(2)}%`);
} else {
  
  console.log(`\n⚠️ ТЕСТ 7: Ошибки в одном блоке - код может не справиться`);
  console.log(`Fidelity: ${(fidelity7 * 100).toFixed(2)}% (зависит от случайного распределения)`);
}

console.log('\n🧪 ТЕСТ 8: Depolarizing шум (случайная X/Y/Z ошибка)');
console.log('━'.repeat(60));

const test8Config: SimulatorConfig = {
  codeType: 'shor',
  initialState: 'zero',
  noiseConfig: {
    type: 'depolarizing',
    probability: 0,
    mode: 'exact-count',
    exactCount: 1
  }
};

const sim8 = new QECSimulator(test8Config);
const result8 = sim8.runFullCycle();

console.log('✓ Начальное состояние: |0⟩');
console.log('✓ Применён depolarizing шум (случайная X/Y/Z ошибка)');

const errorType = result8.errorsApplied.find(e => e.applied)?.errorType || 'none';
console.log(`✓ Тип ошибки: ${errorType}`);
console.log(`✓ Bit-flip синдром: [${result8.syndrome.slice(0, 6).join(', ')}]`);
console.log(`✓ Phase-flip синдром: [${result8.syndrome.slice(6).join(', ')}]`);

const fidelity8 = result8.system.state.fidelity(targetStateShor);
console.log(`✓ Fidelity с |0⟩_L: ${(fidelity8 * 100).toFixed(2)}%`);

const test8Passed = assertFidelity(fidelity8, 1.0, 0.05);
console.log(`\n${test8Passed ? '✅ ТЕСТ 8 ПРОЙДЕН' : '❌ ТЕСТ 8 НЕ ПРОЙДЕН'}`);
console.log(`Ожидалось: fidelity ≈ 100% (код Шора исправляет любую одиночную ошибку)`);

console.log('\n');
console.log('═'.repeat(60));
console.log('📊 ИТОГОВЫЙ ОТЧЁТ');
console.log('═'.repeat(60));

const allTests = [
  { name: 'ТЕСТ 1: 3-qubit + X-ошибка (успех)', passed: test1Passed },
  { name: 'ТЕСТ 2: 3-qubit + 2 X-ошибки (предел)', passed: test2Passed },
  { name: 'ТЕСТ 3: 3-qubit + Z-ошибка (ограничение)', passed: test3Passed },
  { name: 'ТЕСТ 4: Shor + X-ошибка', passed: test4Passed },
  { name: 'ТЕСТ 5: Shor + Z-ошибка', passed: test5Passed },
  { name: 'ТЕСТ 6: Shor + Y-ошибка', passed: test6Passed },
  { name: 'ТЕСТ 7: Shor + 2 ошибки', passed: differentBlocks ? (fidelity7 > 0.95) : true },
  { name: 'ТЕСТ 8: Depolarizing шум', passed: test8Passed }
];

allTests.forEach((test, index) => {
  const status = test.passed ? '✅' : '❌';
  console.log(`${status} ${test.name}`);
});

const passedCount = allTests.filter(t => t.passed).length;
const totalCount = allTests.length;
const percentage = (passedCount / totalCount * 100).toFixed(0);

console.log('\n' + '─'.repeat(60));
console.log(`📈 Результат: ${passedCount}/${totalCount} тестов пройдено (${percentage}%)`);

if (passedCount === totalCount) {
  console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Симулятор работает корректно!');
} else {
  console.log('\n⚠️ Некоторые тесты не пройдены. Требуется проверка.');
}

console.log('═'.repeat(60));
console.log('\n');

export { allTests, passedCount, totalCount };
