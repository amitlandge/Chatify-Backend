import { hash } from "bcrypt";
import mongoose, { Schema, model } from "mongoose";
const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please Enter Your Name"],
      trim: true,
    },
    username: {
      type: String,
      required: [true, "Please Enter Your Username"],
      trim: true,
      maxLength: [12, "Username must be under 12 Character"],
      minLength: [4, "Username must be minimum 4 Character"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please Enter Your Password"],
      trim: true,
      maxLength: [8, "Password must be 8 Character"],
      minLength: [8, "Password must be 8 Character"],
      select: false,
    },
    bio: {
      type: String,
      required: [true, "Please Enter Your Bio"],
      minLength: [8, "Bio must be minimum 8 Character"],
    },

    avatar: {
      public_id: {
        type: String,
        required: [true, "Please Upload Avatar"],
      },
      url: {
        type: String,
        required: [true, "Please Upload Avatar"],
      },
    },
    friends: [
      {
        type: mongoose.Types.ObjectId,
        ref: "User",
      },
    ],
    role: {
      type: String,
      default: "USER",
      enum: ["USER", "ADMIN"],
    },
  },
  {
    timestamps: true,
  }
);
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await hash(this.password, 10);
});
export const User = model.User || model("User", userSchema);
