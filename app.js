import express from "express";
import userRoutes from "./Routes/userRoutes.js";
import chatRoutes from "./Routes/chatRoutes.js";
import messageRoutes from "./Routes/messageRoutes.js";
import adminRoutes from "./Routes/adminRoutes.js";
import { connectDb } from "./Database/db.js";
import cloudinary from "cloudinary";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { errorHandler } from "./Middlewares/errorHandler.js";
import {
  CHAT_JOINED,
  CHAT_LEAVE,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
  TYPING_START,
  TYPING_STOP,
} from "./constants/chatContants.js";

import { getSocket, socketUser } from "./utils/features.js";
import { Message } from "./Models/messageSchema.js";
import expressUpload from "express-fileupload";
import cors from "cors";
import { corsOptions } from "./utils/option.js";
dotenv.config({
  path: "./.env",
});
connectDb();
const app = express();
app.use(
  expressUpload({
    useTempFiles: true,
  })
);

cloudinary.config({
  cloud_name: process.env.CLAUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});
const PORT = process.env.PORT;
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});
app.use(cookieParser());
app.use(express.json());
app.use(cors(corsOptions));
app.get("/", (req, res) => {
  res.status(200).send("Hiii");
});
let userSocketIds = new Map();
let onlineUsers = new Set();
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/message", messageRoutes);
app.use("/admin", adminRoutes);
app.use(errorHandler);
app.set("io", io);
io.use(async (socket, next) => {
  const cookie = socket.handshake.headers["cookie"];

  if (cookie) {
    const split = cookie.split("=")[1];

    const user = await socketUser(split);
    socket.user = user;
    if (user) {
      next();
    }
  }
});
io.on("connection", (socket) => {
  userSocketIds.set(socket.user?._id?.toString(), socket?.id);

  socket.on(NEW_MESSAGE, async ({ chatId, message, members = [] }) => {
    const realTimeMessage = {
      chatId,
      content: message,
      sender: {
        _id: socket.user?._id,
        name: socket.user?.name,
      },
      createdAt: new Date().toString(),
    };

    const mongoDBMessage = {
      chatId,
      content: message,
      sender: {
        _id: socket.user?._id,
        name: socket.user?.name,
      },
    };
    const saveToMongo = await Message.create(mongoDBMessage);
    await saveToMongo.save();

    const socketIds = getSocket(members);

    io.to(socketIds).emit(NEW_MESSAGE, {
      chatId,
      message: realTimeMessage,
    });
    io.to(socketIds).emit(NEW_MESSAGE_ALERT, {
      chatId,
    });
  });
  socket.on(TYPING_START, (data) => {
    const getSocketId = getSocket(data.members);
    io.to(getSocketId).emit(TYPING_START, { chatId: data.chatId });
  });
  socket.on(TYPING_STOP, (data) => {
    const getSocketId = getSocket(data.members);
    io.to(getSocketId).emit(TYPING_STOP, { chatId: data.chatId });
  });
  socket.on(CHAT_JOINED, (data) => {
    onlineUsers.add(data.userId.toString());
    const socketMember = getSocket(data.members);
    io.to(socketMember).emit(ONLINE_USERS, Array.from(onlineUsers));
  });
  socket.on(CHAT_LEAVE, (data) => {
    onlineUsers.delete(data.userId.toString());
    const socketMember = getSocket(data.members);
    io.to(socketMember).emit(ONLINE_USERS, Array.from(onlineUsers));
  });
  socket.on("disconnect", () => {
    onlineUsers.delete(socket.user?._id?.toString());
    userSocketIds.delete(socket.user?._id?.toString());
    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  });
});
app.get("*", (req, res) => {
  res.setHeader("Content-Type", "application/json");

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Access-Control-Allow-Origin", process.env.CLIENT_URL);
});
server.listen(PORT, () => {
  console.log("Server is Running At 3000 Port");
});

export { userSocketIds };
