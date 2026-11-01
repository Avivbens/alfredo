/** Carries the HTTP status, so a rejected key and the beta rate limit each get their own row. */
export class GiphyRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'GiphyRequestError';
  }
}
