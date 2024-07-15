import { Schema, Types, model } from "mongoose";
const messageSchema = new Schema(
  {
    content: {
      type: String,
    },
    attachments: [
      {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],
    sender: {
      type: Types.ObjectId,
      ref: "User",
    },
    chatId: {
      type: Types.ObjectId,
      ref: "Chat",
    },
  },
  {
    timestamps: true,
  }
);
export const Message = model.Message || model("Message", messageSchema);
