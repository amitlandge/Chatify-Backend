import { getSocket } from "./features.js";

export const emitEvent = async (req, event, members, message) => {
  const io = req.app.get("io");

  const userSocket = getSocket(members);

  io.to(userSocket).emit(event, message);
};
