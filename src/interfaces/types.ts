export type QuarantinedRecord = {
  record: unknown;
  reason: string;
};

export type ValidateResult<T> = {
  valid: T[];
  quarantined: QuarantinedRecord[];
};
