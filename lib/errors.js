/** A business error with a stable code and optional machine-readable details. */
export class DshCatError extends Error {
  /**
   * @param {string} code stable error code
   * @param {string} message user-facing message
   * @param {unknown} [details] optional supporting details
   */
  constructor(code, message, details) {
    super(message);
    this.name = 'DshCatError';
    this.code = code;
    this.details = details;
  }
}

/** Render any thrown value as a short message. */
export function messageOf(error) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/** Wrap a driver failure with a DshCat code while preserving the message. */
export function connectionError(error, fallback = 'Database operation failed') {
  if (error instanceof DshCatError) return error;
  return new DshCatError('database_error', `${fallback}: ${messageOf(error)}`);
}
