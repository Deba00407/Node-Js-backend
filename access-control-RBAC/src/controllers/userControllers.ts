import {type IUser, User} from "../models/User.ts";
import type {Request, Response, NextFunction} from "express";
import {StatusCodes} from "http-status-codes";
import {ApiSuccess} from "../responses/ApiSuccess.ts";
import {ApiError} from "../responses/ApiError.ts";
import jwt from "jsonwebtoken"
import type {HydratedDocument} from "mongoose";
import bcrypt from "bcryptjs";

interface IUserControllers{
    saveNewUser(user: IUser): Promise<IUser>;
    login(username: string, password: string): Promise<IUser | null>;
    getUserById(id: string): Promise<IUser | null>;
    getAllUsers(): Promise<IUser[]>;
    updateUser(id: string, user: IUser): Promise<void>;
    deleteUser(id: string): Promise<void>;
    login(username: string, password: string): Promise<IUser | null>;
    logout(id: string): Promise<void>;
    forgotPassword(email: string): Promise<void>;
    resetPassword(token: string, newPassword: string): Promise<void>;
    changePassword(id: string, oldPassword: string, newPassword: string): Promise<void>;
}

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

            const SECRET_KEY = process.env.JWT_SECRET;
            if(!SECRET_KEY){
                throw new Error("JWT_SECRET is not defined");
            }

            // verify password
            const match = await bcrypt.compare(password, existingUser.password)
            if(!match){
                return ApiError(res, StatusCodes.UNAUTHORIZED, "Invalid Credentials", "Entered Password is incorrect");
            }

            const token = jwt.sign(
                {
                    user_id: existingUser._id.toString(),
                    role: existingUser.role
                },
                SECRET_KEY,
                { expiresIn: '2h'}
            );

            return  res
                        .status(StatusCodes.OK)
                        .cookie("auth-token", token, {
                            httpOnly: true,
                            secure: process.env.NODE_ENV !== "dev",
                            sameSite: "lax",
                            maxAge: 60 * 60 * 1000 // 1 hour
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