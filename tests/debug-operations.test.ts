import { QECSimulator } from '../src/core/simulator';
import type { SimulatorConfig } from '../src/core/simulator';

console.log('\n🔍 АНАЛИЗ ОПЕРАЦИЙ В СИМУЛЯЦИИ');
console.log('═'.repeat(70));

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
    probability: 1.0,
    applyTo: 'all'
  }
};

console.log('\n📊 3-кубитный код (repetition):');
console.log('─'.repeat(70));

const sim3 = new QECSimulator(config3);
const result3 = sim3.runFullCycle();

console.log(`\nВсего операций: ${result3.steps.length}`);

const stepsByType = result3.steps.reduce((acc, step) => {
  acc[step.type] = (acc[step.type] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('\nРаспределение по типам:');
Object.entries(stepsByType).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

console.log('\nДетали операций:');
result3.steps.forEach((step, idx) => {
  if (step.type === 'gate') {
    const gateName = step.operation?.name || '?';
    const qubits = step.operation?.qubits || [];
    console.log(`  ${idx + 1}. [gate] ${gateName} на кубитах: [${qubits.join(', ')}]`);
  } else if (step.type === 'gate-error') {
    const details = step.gateErrorDetails!;
    console.log(`  ${idx + 1}. [gate-error] ${details.errorType} на кубите q${details.qubitIndex} (после ${details.gateName})`);
  } else {
    console.log(`  ${idx + 1}. [${step.type}] ${step.description}`);
  }
});

console.log('\n\n📊 Код Шора (9 кубитов):');
console.log('─'.repeat(70));

const configShor: SimulatorConfig = {
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
    probability: 1.0,
    applyTo: 'all'
  }
};

const simShor = new QECSimulator(configShor);
const resultShor = simShor.runFullCycle();

console.log(`\nВсего операций: ${resultShor.steps.length}`);

const stepsByTypeShor = resultShor.steps.reduce((acc, step) => {
  acc[step.type] = (acc[step.type] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('\nРаспределение по типам:');
Object.entries(stepsByTypeShor).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

console.log('\nДетали операций (первые 20):');
resultShor.steps.slice(0, 20).forEach((step, idx) => {
  if (step.type === 'gate') {
    const gateName = step.operation?.name || '?';
    const qubits = step.operation?.qubits || [];
    console.log(`  ${idx + 1}. [gate] ${gateName} на кубитах: [${qubits.join(', ')}]`);
  } else if (step.type === 'gate-error') {
    const details = step.gateErrorDetails!;
    console.log(`  ${idx + 1}. [gate-error] ${details.errorType} на кубите q${details.qubitIndex} (после ${details.gateName})`);
  } else {
    console.log(`  ${idx + 1}. [${step.type}] ${step.description.substring(0, 50)}...`);
  }
});

console.log('\n═'.repeat(70));
