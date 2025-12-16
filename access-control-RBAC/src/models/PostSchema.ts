import mongoose from "mongoose";
import User from "./User.ts";

interface IPost{
    title: string;
    description: string;
    main_content: string;
    cover_image: string;
    posted_by: typeof User;
    tags: string[];
    likes: number;
}

const postSchema = new mongoose.Schema<IPost>({
    title: {
        type: String,
        require: true,
    },
    description: {
        type: String,
        require: true
    },
    main_content: {
        type: String,
        require: true,
        minLength: 100,
        maxLength: 5000
    },
    cover_image: String,
    posted_by: {
        type: User,
        require: true
    },
    tags: [String],
    likes: {
        type: Number,
        default: 0,
    }
}, { timestamps: true})

const Post = mongoose.model("Post", postSchema);

export {
    Post, type IPost
}