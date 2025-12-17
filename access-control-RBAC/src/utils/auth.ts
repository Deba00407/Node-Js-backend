
import * as crypto from "node:crypto";
import jwt from "jsonwebtoken";

function generateRefreshToken(): string{
    return crypto.randomBytes(64).toString("hex")
}

function hashRefreshToken(token : string) : string{
    return crypto.createHash("sha256").update(token).digest("hex");
}

function generateAccessToken(user_id: string, role: "ADMIN" | "USER"): string{
    const SECRET_KEY = process.env.JWT_SECRET;
    if(!SECRET_KEY){
        throw new Error("JWT_SECRET is not defined");
    }

    return jwt.sign(
        {
            user_id: user_id,
            role: role
        },
        SECRET_KEY,
        { expiresIn: '2h'}
    );
}

export {
    generateRefreshToken,
    hashRefreshToken,
    generateAccessToken
}