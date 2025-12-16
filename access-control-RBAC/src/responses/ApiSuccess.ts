import type { Response } from "express";

export function ApiSuccess<T>(
    res: Response,
    data: T,
    status = 200,
    message?: string,
    debug_message?: string
) {
    return res.status(status).json({
        success: true,
        message,
        debug_message,
        data,
        timestamp: new Date().toISOString()
    });
}
