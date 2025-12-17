import mongoose, {model, Schema} from "mongoose";

const refreshTokenSchema = new Schema({
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        refreshTokenHash: {
            type: String,
            required: true,
            unique: true
        },

        expiresAt: {
            type: Date,
            required: true,
        },

        revoked: { // to revoke the refresh token --> invalidate sessions
            type: Boolean,
            default: false
        },

        userAgent: { // --> login from (suspicious login, etc.)
            type: String
        },

        ipHash: { // --> login from (suspicious login, etc.)
            type: String
        }
    }, { timestamps: true }
);

// remove the refresh token automatically after it expires
refreshTokenSchema.index(
    {expiresAt: 1},
    {expireAfterSeconds: 0}
);

const RefreshToken = model("RefreshToken", refreshTokenSchema);

export default RefreshToken;

