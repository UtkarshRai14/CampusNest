






class HttpError extends Error {
  constructor(status, detail, extraHeaders = null) {
    super(typeof detail === 'string' ? detail : 'Request failed');
    this.status = status;
    this.detail = detail;
    this.extraHeaders = extraHeaders;
  }
}

module.exports = HttpError;
