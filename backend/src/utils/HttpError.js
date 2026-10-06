// An error with an HTTP status; errorHandler sends it to the client as { detail }.
class HttpError extends Error {
  constructor(status, detail) {
    super(typeof detail === 'string' ? detail : 'Request failed');
    this.status = status;
    this.detail = detail;
  }
}

module.exports = HttpError;
