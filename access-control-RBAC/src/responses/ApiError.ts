import type {Response} from "express";

export function ApiError(
    res: Response,
    status = 500,
    message?: string,
    debug_message?: string
) {
    return res.status(status).json({
        message,
        debug_message,
        timestamp: new Date().toISOString()
    });
}