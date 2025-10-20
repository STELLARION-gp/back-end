// utils/responses.ts
import { Response } from 'express';

export interface ApiMeta { [k: string]: any }

export function ok<T>(res: Response, message: string, data?: T, meta?: ApiMeta) {
    return res.json({ success: true, message, data, meta });
}

export function created<T>(res: Response, message: string, data?: T, meta?: ApiMeta) {
    return res.status(201).json({ success: true, message, data, meta });
}

export function fail(res: Response, status: number, message: string, error?: string, meta?: ApiMeta) {
    return res.status(status).json({ success: false, message, error, meta });
}

// Add these for compatibility with chat controller
export function successResponse<T>(res: Response, message: string, data?: T, status: number = 200, meta?: ApiMeta) {
    return res.status(status).json({ success: true, message, data, meta });
}

export function errorResponse(res: Response, message: string, status: number = 500, error?: string, meta?: ApiMeta) {
    return res.status(status).json({ success: false, message, error, meta });
}
