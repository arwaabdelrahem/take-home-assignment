import { z, ZodType } from 'zod';
import { QuarantinedRecord, ValidateResult } from '../../interfaces/types';

/**
 * Validate records against a schema. Failures are quarantined with a reason
 * and never dropped. Pure: same input always produces the same output.
 */
export function validateRecords<T>(
  records: unknown[],
  schema: ZodType<T>,
): ValidateResult<T> {
  const valid: T[] = [];
  const quarantined: QuarantinedRecord[] = [];

  for (const record of records) {
    const result = schema.safeParse(record);
    if (result.success) {
      valid.push(result.data);
    } else {
      quarantined.push({
        record,
        reason: z.prettifyError(result.error),
      });
    }
  }

  return { valid, quarantined };
}
