import type { GateOperation } from '../core/quantum/gates';
import type { GateErrorScope, GateErrorType } from '../core/noise/gateErrors';

export interface CustomGateStep {
  op: GateOperation;
  errorProbability: number;
  errorType: GateErrorType;
  applyTo?: GateErrorScope;
}
