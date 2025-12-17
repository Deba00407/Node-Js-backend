import type {NextFunction, Request, Response} from "express";
import {ApiError} from "../responses/ApiError.ts";
import {StatusCodes} from "http-status-codes";
import jwt from "jsonwebtoken";
import userServices from "../controllers/userControllers.ts";

export async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
) {

    const token = req.cookies?.["auth-token"];

    if(token){
        const SECRET_KEY = process.env.JWT_SECRET;
        if(!SECRET_KEY){
            throw new Error("JWT_SECRET is not defined");
        }

        // decode the token
        try{
            req.user = jwt.verify(token, SECRET_KEY) as { user_id: string, role: "ADMIN" | "USER" };
            next();
        }catch(error){
            console.log(`Error while decoding token: ${error}`);
            return ApiError(res, StatusCodes.UNAUTHORIZED, "Missing or Invalid Token", "Token is missing or invalid");
        }
    }

    try{
        await userServices.refreshAccessToken(req, res, next)
    }catch(error){
        return ApiError(res, StatusCodes.INTERNAL_SERVER_ERROR, "Internal Server Error", "Failed to refresh access token");
    }
}