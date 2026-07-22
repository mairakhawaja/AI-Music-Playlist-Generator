import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a new UUID v4 correlation ID.
 */
export function generateCorrelationId(): string {
  return uuidv4();
}
