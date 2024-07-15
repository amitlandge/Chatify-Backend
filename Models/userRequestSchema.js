import { Schema, Types, model } from "mongoose";
const requestSchema = new Schema({
  status: {
    type: String,
    default: "Pending",
    enum: ["Pending", "Accepted", "Rejected"],
  },

  sender: {
    type: Types.ObjectId,
    ref: "User",
  },
  receiver: {
    type: Types.ObjectId,
    ref: "User",
  },
});
export const Request = model.Request || model("Request", requestSchema);
