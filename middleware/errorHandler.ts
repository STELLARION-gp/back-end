// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
    status?: number;
    statusCode?: number;
}

export const errorHandler = (
    err: CustomError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    console.error(`Error ${status}: ${message}`);
    console.error(err.stack);

    // Map status codes to error types
    let errorType = 'internal_error';
    if (status === 400) errorType = 'validation_error';
    else if (status === 401) errorType = 'unauthorized';
    else if (status === 403) errorType = 'forbidden';
    else if (status === 404) errorType = 'not_found';
    else if (status === 429) errorType = 'rate_limit_exceeded';

    res.status(status).json({
        success: false,
        error: errorType,
        message: message,
        ...(process.env.NODE_ENV === 'development' && {
            details: err.stack
        })
    });
};

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
    res.status(404).json({
        success: false,
        error: 'not_found',
        message: `Endpoint not found - ${req.originalUrl}`
    });
};
