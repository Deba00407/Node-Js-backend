import * as mongoose from "mongoose";


export async function connectToDB() : Promise<void> {
    const db_uri = process.env.DB_CONNECTION_STRING;

    if(!db_uri) throw new Error("DB_CONNECTION_STRING is not defined");

    try {
        const conn = await mongoose.connect(db_uri);
        console.log(`DB Connected: ${conn.connection.host}`)
    }catch (error){
        console.log("DB Connection failed: ", error);
        process.exit(1);
    }
}