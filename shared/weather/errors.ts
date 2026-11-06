export type DataSourceErrorKind =
  /** The request could not reach the server (offline, DNS, CORS…). */
  | 'network'
  /** The server answered with an error status. */
  | 'http'
  /** The response could not be understood. */
  | 'invalid-response'
  /** The request was cancelled by the caller. */
  | 'aborted'

export class DataSourceError extends Error {
  readonly kind: DataSourceErrorKind
  readonly status?: number

  constructor(
    kind: DataSourceErrorKind,
    message: string,
    options: { status?: number; cause?: unknown } = {}
  ) {
    super(message, { cause: options.cause })
    this.name = 'DataSourceError'
    this.kind = kind
    this.status = options.status
  }
}
