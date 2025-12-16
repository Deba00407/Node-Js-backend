import type {Request, Response, NextFunction} from "express";
import {ApiError} from "../responses/ApiError.ts";
import {StatusCodes} from "http-status-codes";

export const authorize = (
    ...allowedRoles: Array<"ADMIN" | "USER">
) => (
    req: Request, res: Response, next: NextFunction
) => {
    if(!req.user){
        return ApiError(res, StatusCodes.UNAUTHORIZED, "Please login to access", "Unauthorized");
    }

    if(!allowedRoles.includes(req.user.role)){
        return ApiError(res, StatusCodes.FORBIDDEN, "Access Denied", "You are not authorized to access this resource");
    }
    next();
}

