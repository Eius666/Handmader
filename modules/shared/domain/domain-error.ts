export type DomainErrorCode =
  | 'FORBIDDEN'
  | 'INVALID_STATE'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR';

export class DomainError extends Error {
  public readonly code: DomainErrorCode;

  constructor(
    code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}
