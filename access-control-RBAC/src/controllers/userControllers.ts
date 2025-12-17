import {type IUser, User} from "../models/User.ts";
import type {Request, Response, NextFunction} from "express";
import {StatusCodes} from "http-status-codes";
import {ApiSuccess} from "../responses/ApiSuccess.ts";
import {ApiError} from "../responses/ApiError.ts";
import jwt from "jsonwebtoken"
import type {Document, HydratedDocument} from "mongoose";
import bcrypt from "bcryptjs";
import {generateAccessToken, generateRefreshToken, hashRefreshToken} from "../utils/auth.ts";
import RefreshToken from "../models/RefreshToken.ts";

class UserServiceControllers{

    async saveNewUser(req: Request, res: Response, next: NextFunction){
       try{
           const user: IUser = req.body;

           // if(!user.username || !user.password) throw new Error("Username or Password is missing");

           const newUser = new User(user);

           const saved = await newUser.save();

           return ApiSuccess(
               res,
               saved,
               StatusCodes.CREATED,
               "You have successfully registered!! You can now login using your credentials",
               "User Created Successfully"
           )
       }
       catch(error){
           console.log(`Error while saving new user: ${error}`);
           res.status(StatusCodes.BAD_REQUEST).json({error: "Invalid User Data"});
           next(error);
       }
    }

    async login(req: Request, res: Response, next: NextFunction){
        const {username, email, password} = req.body;

        if(!username || !password) return ApiError(res, StatusCodes.BAD_REQUEST, "Invalid Credentials", "Username or Password is missing");

        try{
            const existingUser: HydratedDocument<IUser> | null = await User.findOne({$or: [
                    {username}, {email}
                ]}).select("+password");

            if(!existingUser) {
                return ApiError(res, StatusCodes.NOT_FOUND, `User not found`);
            }

            // verify password
            const match = await bcrypt.compare(password, existingUser.password)
            if(!match){
                return ApiError(res, StatusCodes.UNAUTHORIZED, "Invalid Credentials", "Entered Password is incorrect");
            }

            const accessToken = generateAccessToken(
                existingUser._id.toString("hex"), existingUser.role
            );

            // generate refresh token
            const refreshToken = generateRefreshToken();

            console.log(`Refresh Token Generated: ${refreshToken}`);

            // save the hashed refresh token to DB for reference later
            await RefreshToken.create({
                userId: existingUser._id,
                refreshTokenHash: hashRefreshToken(refreshToken),
                expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days after the issue date
                revoked: false // valid
            })

            return  res
                        .status(StatusCodes.OK)
                        .cookie("auth-access-token", accessToken, {
                            httpOnly: true,
                            secure: process.env.NODE_ENV === "production",
                            sameSite: "lax",
                            // maxAge: 60 * 60 * 1000 // 1 hour
                            maxAge: 3 * 60 * 1000 // 3 minutes --> testing
                        })
                        .cookie("auth-refresh-token", refreshToken, {
                            httpOnly: true,
                            secure: process.env.NODE_ENV === "production",
                            sameSite: "lax",
                            // maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
                            maxAge: 10 * 60 * 1000,// 10 minutes --> testing,
                            path: "/api/user/refresh" // cookie is only sent on this refresh endpoint
                        })
                        .json({
                            "message": "Login Successful",
                            success: true
                        });

        }catch(error){
            console.log(`Error while logging in: ${error}`);
            next(error);
            return ApiError(res, StatusCodes.INTERNAL_SERVER_ERROR, "Internal Server Error");
        }
    }

    async refreshAccessToken(req: Request, res: Response, next: NextFunction){
        // get the refresh token from the cookie
        const refreshToken = req.cookies?.["auth-refresh-token"];
        if(!refreshToken) return ApiError(res, StatusCodes.UNAUTHORIZED, "Please login to continue", "Unauthorized");

        // check the token with the one saved in DB
        const hashedRefreshToken = hashRefreshToken(refreshToken);

        const savedToken = await RefreshToken.findOne({
            refreshTokenHash: hashedRefreshToken,
        })

        if(!savedToken) return ApiError(res, StatusCodes.UNAUTHORIZED, "Please login to continue", "Unauthorized");

        // revoke all tokens for the user associated with this refresh token if security gets compromised -> token reuse
        if(savedToken.revoked){
            await RefreshToken.updateMany(
                {userId: savedToken.userId},
                {revoked: true} // mark all tokens as revoked for the user
            )

            return ApiError(res, StatusCodes.UNAUTHORIZED, "Access Denied", "Security compromised. All tokens revoked.");
        }

        // token is valid and not revoked
        if(savedToken.expiresAt < new Date()){
            return ApiError(res, StatusCodes.UNAUTHORIZED, "Please login to continue", "Refresh Token Expired");
        }

        // revoke the saved refresh token
        savedToken.revoked = true
        await savedToken.save();

        // generate a new access token and refresh token
        const new_refresh_token = generateRefreshToken();

        // save the new refresh token to DB
        await RefreshToken.create({
            userId: savedToken.userId,
            refreshTokenHash: hashRefreshToken(new_refresh_token),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            revoked: false
        })

        // fetch the user role
        const user = await User.findById(savedToken.userId).select("role");

        if(!user){
            return ApiError(res, StatusCodes.UNAUTHORIZED, "Please login to continue", "User not found");
        }

        const new_access_token = generateAccessToken(
            savedToken.userId.toString(), // id is already known from the refresh token record
            user.role
        );

        return res
            .status(StatusCodes.OK)
            .cookie("auth-access-token", new_access_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                // maxAge: 60 * 60 * 1000 // 1 hour
                maxAge: 3 * 60 * 1000 // 3 minutes --> testing
            })
            .cookie("auth-refresh-token", new_refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                // maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
                maxAge: 10 * 60 * 1000,// 10 minutes --> testing,
                path: "/api/user/refresh" // cookie is only sent on this refresh endpoint
            })
            .json({
                "message": "Access token refreshed successfully. New token expires in 3 minutes",
                success: true
            });
    }

    async getAllRegisteredUsers(req: Request, res: Response, next: NextFunction){
        try{
            const users: HydratedDocument<IUser>[] | null = await User.find().select("-password -__v -createdAt -updatedAt");
            if(!users){
                console.log("Failed to fetch users");
                return ApiError(res, StatusCodes.INTERNAL_SERVER_ERROR, "Internal Server Error", "Failed to fetch users");
            }

            return ApiSuccess(res, users, StatusCodes.OK, "Users fetched successfully", "Users fetched successfully");
        }catch(error){
            console.log(`Error while fetching users: ${error}`);
            next(error);
        }
    }
}

const userServices = new UserServiceControllers();

export default userServices;