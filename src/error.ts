export class ApiError<TBody = unknown> extends Error {
  constructor(
    public readonly status: number,
    public readonly body: TBody,
    message?: string,
  ) {
    // String conversion is explicit so restrict-template-expressions is satisfied
    super(message ?? `API error: ${String(status)}`)
    this.name = 'ApiError'
  }

  // ─── Status helpers ───────────────────────────────────────────────────────
  is(status: number) {
    return this.status === status
  }
  isRedirect() {
    return this.status >= 300 && this.status < 400
  }
  isUnauthorized() {
    return this.status === 401
  }
  isForbidden() {
    return this.status === 403
  }
  isNotFound() {
    return this.status === 404
  }
  isConflict() {
    return this.status === 409
  }
  isUnprocessable() {
    return this.status === 422
  }
  isTooManyRequests() {
    return this.status === 429
  }
  isClientError() {
    return this.status >= 400 && this.status < 500
  }
  isServerError() {
    return this.status >= 500
  }
  isNonSuccess() {
    return this.status >= 300
  }

  // ─── Body narrowing by status ─────────────────────────────────────────────
  // `TBody` is a union of all possible error bodies declared on the endpoint.
  // After `hasStatus(422)`, TypeScript narrows `this.body` to the 422 body type.
  // Works automatically — no manual annotation needed at the call site.
  //
  // `TStatus` is prefixed with T to satisfy the naming-convention rule.
  hasStatus<TStatus extends number>(
    status: TStatus,
  ): this is ApiError<ExtractBodyForStatus<TBody, TStatus>> & { status: TStatus } {
    return this.status === status
  }

  // ─── toString ─────────────────────────────────────────────────────────────
  override toString() {
    // String(status) is explicit; JSON.stringify returns string, satisfying the rule
    return `ApiError(${String(this.status)}): ${JSON.stringify(this.body)}`
  }
}

// ─── Internal: pick the body type for a specific status from a union ──────────
// If the union has discriminated members shaped { __status: TStatus, ... }
// this extracts only the matching member. Falls back to TBody for plain objects.
type ExtractBodyForStatus<TBody, TStatus extends number> = TBody extends { __status: TStatus }
  ? TBody
  : TBody extends infer TUnionMember
    ? TUnionMember extends { __status: infer TUS }
      ? TUS extends TStatus
        ? TUnionMember
        : never
      : TBody
    : TBody
