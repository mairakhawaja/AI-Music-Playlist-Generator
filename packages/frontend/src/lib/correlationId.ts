/**
 * Logs the correlation ID from API responses to the browser console.
 * This enables support teams to trace errors back to specific backend log entries.
 *
 * @param id - The X-Correlation-ID value from the response header
 */
export function logCorrelationId(id: string): void {
  console.error('[CorrelationID]', id);
}
