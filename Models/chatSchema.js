import { Schema, Types, model } from "mongoose";
const chatSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please Enter Your Chat Name"],
    },
    groupChat: {
      type: Boolean,
      default: false,
    },
    creator: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "Please Enter Creator Id"],
    },
    members: [
      {
        type: Types.ObjectId,
        ref: "User",
        required: [true, "Please Enter User Id"],
      },
    ],
  },
  {
    timestamps: true,
  }
);
export const Chat = model.Chat || model("Chat", chatSchema);
