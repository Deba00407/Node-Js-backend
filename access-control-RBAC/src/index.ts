import express from 'express'
import {type Response} from "express";

import {configDotenv} from "dotenv";
import {StatusCodes} from "http-status-codes";
import {connectToDB} from "./DB/db_connection.ts";
import mongoose from "mongoose";
import router from "./routes/userRoutes.ts";
import cookieParser from 'cookie-parser';

configDotenv({
    path: __dirname + '/.env'
})

await connectToDB();

const app = express();

app.use(express.json())

const PORT = process.env.PORT || 3000

app.use(cookieParser());

app.use(router)

app.get("/home", (_, res:Response) => {
    res.status(StatusCodes.OK)
        .header({
            "Content-Type": "application/json"
        })
        .json({
            "message": "Welcome to the home page"
        })
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

process.on("SIGINT", async () => {
    console.log("SIGINT received. Closing DB connection...");
    await mongoose.connection.close();
    process.exit(0);
});
