import mongoose, {type HydratedDocument, Schema} from "mongoose";
import bcrypt from "bcryptjs";

interface IUser{
    name: string;
    username: string;
    email: string;
    password: string,
    role: "ADMIN" | "USER"
}

const userSchema = new mongoose.Schema<IUser>({
    name: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true
    },
    email: String,
    password: String,
    role: {
        type: String,
        enum: ["ADMIN", "USER"],
        default: "USER"
    }
}, { timestamps: true})

userSchema.pre("save", async function(this: HydratedDocument<IUser>){
    if(!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
})

const User = mongoose.model("User", userSchema);

export {
    User, type IUser
}