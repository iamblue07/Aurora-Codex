/**
 * An error that maps directly onto an HTTP response.
 * Throw it from services/controllers; the central error handler turns it into JSON.
 */
export default class HttpError extends Error {
    constructor(status, message, details) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.details = details;
    }

    static badRequest(message = 'Bad request', details) {
        return new HttpError(400, message, details);
    }

    static unauthorized(message = 'Authentication required') {
        return new HttpError(401, message);
    }

    static forbidden(message = 'Access denied') {
        return new HttpError(403, message);
    }

    static notFound(message = 'Resource not found') {
        return new HttpError(404, message);
    }

    static conflict(message = 'Resource already exists') {
        return new HttpError(409, message);
    }

    static badGateway(message = 'Upstream service error') {
        return new HttpError(502, message);
    }

    static serviceUnavailable(message = 'Service unavailable') {
        return new HttpError(503, message);
    }
}
