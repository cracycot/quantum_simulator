#!/usr/bin/env node
/**
 * Запуск тестов QEC Simulator
 * Usage: node run-tests.mjs
 */

import { QECSimulator } from './src/core/simulator.ts';
import { 
  getLogicalZeroState, 
  getLogicalPlusState 
} from './src/core/codes/repetition.ts';
import { 
  getShorLogicalZeroState 
} from './src/core/codes/shor.ts';

// Утилита для округления
function assertFidelity(actual, expected, tolerance = 0.01) {
  return Math.abs(actual - expected) <= tolerance;
}

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║     QEC SIMULATOR - АВТОМАТИЧЕСКИЕ ТЕСТЫ                   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const results = [];

// ============================================
// ТЕСТ 1: 3-кубитный код - X-ошибка
// ============================================
try {
  console.log('🧪 ТЕСТ 1: 3-кубитный код - одиночная X-ошибка');
  console.log('─'.repeat(60));
  
  const config1 = {
    codeType: 'repetition',
    initialState: 'zero',
    noiseConfig: {
      type: 'bit-flip',
      probability: 0,
      mode: 'exact-count',
      exactCount: 1
    }
  };
  
  const sim1 = new QECSimulator(config1);
  const result1 = sim1.runFullCycle();
  
  const targetState1 = getLogicalZeroState();
  const fidelity1 = result1.system.state.fidelity(targetState1);
  
  console.log(`  • Синдром: [${result1.syndrome.join(', ')}]`);
  console.log(`  • Ошибка обнаружена: ${result1.errorDetected ? '✓' : '✗'}`);
  console.log(`  • Коррекция применена: ${result1.correctionApplied ? '✓' : '✗'}`);
  console.log(`  • Fidelity: ${(fidelity1 * 100).toFixed(2)}%`);
  
  const passed1 = assertFidelity(fidelity1, 1.0, 0.05);
  results.push({ name: 'ТЕСТ 1', passed: passed1 });
  console.log(`\n  ${passed1 ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН'}\n`);
} catch (error) {
  console.error('  ❌ ОШИБКА:', error.message);
  results.push({ name: 'ТЕСТ 1', passed: false });
}

// ============================================
// ТЕСТ 2: 3-кубитный код - 2 X-ошибки
// ============================================
try {
  console.log('🧪 ТЕСТ 2: 3-кубитный код - две X-ошибки (предел)');
  console.log('─'.repeat(60));
  
  const config2 = {
    codeType: 'repetition',
    initialState: 'zero',
    noiseConfig: {
      type: 'bit-flip',
      probability: 0,
      mode: 'exact-count',
      exactCount: 2
    }
  };
  
  const sim2 = new QECSimulator(config2);
  const result2 = sim2.runFullCycle();
  
  const targetState2 = getLogicalZeroState();
  const fidelity2 = result2.system.state.fidelity(targetState2);
  
  console.log(`  • Синдром: [${result2.syndrome.join(', ')}]`);
  console.log(`  • Fidelity: ${(fidelity2 * 100).toFixed(2)}%`);
  
  const passed2 = fidelity2 < 0.5; // Ожидаем провал коррекции
  results.push({ name: 'ТЕСТ 2', passed: passed2 });
  console.log(`\n  ${passed2 ? '✅ ПРОЙДЕН (код правильно не справился)' : '❌ НЕ ПРОЙДЕН'}\n`);
} catch (error) {
  console.error('  ❌ ОШИБКА:', error.message);
  results.push({ name: 'ТЕСТ 2', passed: false });
}

// ============================================
// ТЕСТ 3: 3-кубитный код - Z-ошибка
// ============================================
try {
  console.log('🧪 ТЕСТ 3: 3-кубитный код - Z-ошибка (ограничение)');
  console.log('─'.repeat(60));
  
  const config3 = {
    codeType: 'repetition',
    initialState: 'plus',
    noiseConfig: {
      type: 'phase-flip',
      probability: 0,
      mode: 'exact-count',
      exactCount: 1
    }
  };
  
  const sim3 = new QECSimulator(config3);
  const result3 = sim3.runFullCycle();
  
  const targetState3 = getLogicalPlusState();
  const fidelity3 = result3.system.state.fidelity(targetState3);
  
  console.log(`  • Синдром: [${result3.syndrome.join(', ')}]`);
  console.log(`  • Ошибка обнаружена: ${result3.errorDetected ? '✓' : '✗ (правильно!)'}`);
  console.log(`  • Fidelity: ${(fidelity3 * 100).toFixed(2)}%`);
  
  const passed3 = !result3.errorDetected && fidelity3 < 0.95;
  results.push({ name: 'ТЕСТ 3', passed: passed3 });
  console.log(`\n  ${passed3 ? '✅ ПРОЙДЕН (код правильно НЕ обнаружил Z-ошибку)' : '❌ НЕ ПРОЙДЕН'}\n`);
} catch (error) {
  console.error('  ❌ ОШИБКА:', error.message);
  results.push({ name: 'ТЕСТ 3', passed: false });
}

// ============================================
// ТЕСТ 4: Код Шора - X-ошибка
// ============================================
try {
  console.log('🧪 ТЕСТ 4: Код Шора (9 кубитов) - X-ошибка');
  console.log('─'.repeat(60));
  
  const config4 = {
    codeType: 'shor',
    initialState: 'zero',
    noiseConfig: {
      type: 'bit-flip',
      probability: 0,
      mode: 'exact-count',
      exactCount: 1
    }
  };
  
  const sim4 = new QECSimulator(config4);
  const result4 = sim4.runFullCycle();
  
  const targetState4 = getShorLogicalZeroState();
  const fidelity4 = result4.system.state.fidelity(targetState4);
  
  console.log(`  • Bit-flip синдром: [${result4.syndrome.slice(0, 6).join(', ')}]`);
  console.log(`  • Phase-flip синдром: [${result4.syndrome.slice(6).join(', ')}]`);
  console.log(`  • Ошибка обнаружена: ${result4.errorDetected ? '✓' : '✗'}`);
  console.log(`  • Коррекция применена: ${result4.correctionApplied ? '✓' : '✗'}`);
  console.log(`  • Fidelity: ${(fidelity4 * 100).toFixed(2)}%`);
  
  const passed4 = assertFidelity(fidelity4, 1.0, 0.05);
  results.push({ name: 'ТЕСТ 4', passed: passed4 });
  console.log(`\n  ${passed4 ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН'}\n`);
} catch (error) {
  console.error('  ❌ ОШИБКА:', error.message);
  results.push({ name: 'ТЕСТ 4', passed: false });
}

// ============================================
// ТЕСТ 5: Код Шора - Z-ошибка
// ============================================
try {
  console.log('🧪 ТЕСТ 5: Код Шора (9 кубитов) - Z-ошибка');
  console.log('─'.repeat(60));
  
  const config5 = {
    codeType: 'shor',
    initialState: 'zero',
    noiseConfig: {
      type: 'phase-flip',
      probability: 0,
      mode: 'exact-count',
      exactCount: 1
    }
  };
  
  const sim5 = new QECSimulator(config5);
  const result5 = sim5.runFullCycle();
  
  const targetState5 = getShorLogicalZeroState();
  const fidelity5 = result5.system.state.fidelity(targetState5);
  
  const phaseErrorDetected = result5.syndrome[6] !== 0 || result5.syndrome[7] !== 0;
  
  console.log(`  • Bit-flip синдром: [${result5.syndrome.slice(0, 6).join(', ')}]`);
  console.log(`  • Phase-flip синдром: [${result5.syndrome.slice(6).join(', ')}]`);
  console.log(`  • Phase-ошибка обнаружена: ${phaseErrorDetected ? '✓' : '✗'}`);
  console.log(`  • Fidelity: ${(fidelity5 * 100).toFixed(2)}%`);
  
  const passed5 = phaseErrorDetected && assertFidelity(fidelity5, 1.0, 0.05);
  results.push({ name: 'ТЕСТ 5', passed: passed5 });
  console.log(`\n  ${passed5 ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН'}\n`);
} catch (error) {
  console.error('  ❌ ОШИБКА:', error.message);
  results.push({ name: 'ТЕСТ 5', passed: false });
}

// ============================================
// ТЕСТ 6: Код Шора - Y-ошибка
// ============================================
try {
  console.log('🧪 ТЕСТ 6: Код Шора (9 кубитов) - Y-ошибка');
  console.log('─'.repeat(60));
  
  const config6 = {
    codeType: 'shor',
    initialState: 'zero',
    noiseConfig: {
      type: 'bit-phase-flip',
      probability: 0,
      mode: 'exact-count',
      exactCount: 1
    }
  };
  
  const sim6 = new QECSimulator(config6);
  const result6 = sim6.runFullCycle();
  
  const targetState6 = getShorLogicalZeroState();
  const fidelity6 = result6.system.state.fidelity(targetState6);
  
  const bitDetected = result6.syndrome.slice(0, 6).some(s => s !== 0);
  const phaseDetected = result6.syndrome[6] !== 0 || result6.syndrome[7] !== 0;
  
  console.log(`  • Bit-flip синдром: [${result6.syndrome.slice(0, 6).join(', ')}]`);
  console.log(`  • Phase-flip синдром: [${result6.syndrome.slice(6).join(', ')}]`);
  console.log(`  • Bit-компонента обнаружена: ${bitDetected ? '✓' : '✗'}`);
  console.log(`  • Phase-компонента обнаружена: ${phaseDetected ? '✓' : '✗'}`);
  console.log(`  • Fidelity: ${(fidelity6 * 100).toFixed(2)}%`);
  
  const passed6 = bitDetected && phaseDetected && assertFidelity(fidelity6, 1.0, 0.05);
  results.push({ name: 'ТЕСТ 6', passed: passed6 });
  console.log(`\n  ${passed6 ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН'}\n`);
} catch (error) {
  console.error('  ❌ ОШИБКА:', error.message);
  results.push({ name: 'ТЕСТ 6', passed: false });
}

// ============================================
// ИТОГОВЫЙ ОТЧЁТ
// ============================================
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                   ИТОГОВЫЙ ОТЧЁТ                           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

results.forEach((result, index) => {
  const status = result.passed ? '✅' : '❌';
  console.log(`${status} ${result.name}: ${result.passed ? 'ПРОЙДЕН' : 'НЕ ПРОЙДЕН'}`);
});

const passedCount = results.filter(r => r.passed).length;
const totalCount = results.length;
const percentage = (passedCount / totalCount * 100).toFixed(0);

console.log('\n' + '─'.repeat(60));
console.log(`📊 Результат: ${passedCount}/${totalCount} тестов пройдено (${percentage}%)`);

if (passedCount === totalCount) {
  console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Симулятор работает корректно!\n');
  process.exit(0);
} else {
  console.log('\n⚠️ Некоторые тесты не пройдены. Требуется проверка.\n');
  process.exit(1);
}

