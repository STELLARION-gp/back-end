"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    console.error(`Error ${status}: ${message}`);
    console.error(err.stack);
    // Map status codes to error types
    let errorType = 'internal_error';
    if (status === 400)
        errorType = 'validation_error';
    else if (status === 401)
        errorType = 'unauthorized';
    else if (status === 403)
        errorType = 'forbidden';
    else if (status === 404)
        errorType = 'not_found';
    else if (status === 429)
        errorType = 'rate_limit_exceeded';
    res.status(status).json(Object.assign({ success: false, error: errorType, message: message }, (process.env.NODE_ENV === 'development' && {
        details: err.stack
    })));
};
exports.errorHandler = errorHandler;
const notFound = (req, res, next) => {
    res.status(404).json({
        success: false,
        error: 'not_found',
        message: `Endpoint not found - ${req.originalUrl}`
    });
};
exports.notFound = notFound;
