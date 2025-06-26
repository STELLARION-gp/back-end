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

    res.status(status).json({
        error: {
            message,
            status,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
};

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
    const error = new Error(`Not found - ${req.originalUrl}`) as CustomError;
    error.status = 404;
    next(error);
};
