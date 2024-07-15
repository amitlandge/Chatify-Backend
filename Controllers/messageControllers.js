import { Chat } from "../Models/chatSchema.js";
import { Message } from "../Models/messageSchema.js";
import { User } from "../Models/userSchema.js";

import {
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_DATA,
} from "../constants/chatContants.js";
import { emitEvent } from "../utils/emittingEvent.js";
import { ErrorHandler } from "../utils/error.js";
import { sendFileToCloud } from "../utils/features.js";
import { deleteImageFromCloudanary } from "../utils/features.js";
const sendAttachment = async (req, res, next) => {
  const { chatId } = req.body;
  const files = req.files?.files || [];

  const newFileArray = Array.from(files);
  if (newFileArray.length === 0) {
    newFileArray.push(files);
  }

  try {
    const chats = await Chat.findById(chatId);
    const myProfile = await User.findById(req.user, "name");
    if (!chats) {
      return next(new ErrorHandler("Chat Not Found"));
    }

    const fileLinks = await sendFileToCloud(newFileArray);

    const messageForDB = {
      content: "",
      attachments: fileLinks,
      sender: myProfile._id,
      chatId: chatId,
    };

    const messageForRealTime = {
      ...messageForDB,
      sender: {
        _id: myProfile._id,
        name: myProfile.name,
      },
      chatId: chats._id,
    };
    const message = await Message.create(messageForDB);

    emitEvent(req, NEW_MESSAGE, chats.members, {
      message: messageForRealTime,
      chatId: chats._id,
    });
    emitEvent(req, NEW_MESSAGE_ALERT, chats.members, {
      chatId: myProfile._id,
    });
    res.status(200).json({
      message: "SuccessFully",
      message,
    });
  } catch (error) {
    next(error);
  }
};
const getMessages = async (req, res, next) => {
  try {
    const { cid } = req.params;
    const { page } = req.query;

    const resultPerpage = 7;
    const skipChat = (page - 1) * resultPerpage;
    const chats = await Message.find({ chatId: cid })
      .skip(skipChat)
      .limit(resultPerpage)
      .sort({ createdAt: -1 })
      .populate("sender", "name")
      .lean();
    if (!chats) {
      return next(new ErrorHandler("Chat Not Found"));
    }
    const messageCount = await Message.countDocuments({ chatId: cid });

    const totalPages = Math.ceil(messageCount / resultPerpage) || 0;
    res.status(200).json({
      message: "Succesfull",
      chats: chats.length,
      chats: chats.reverse(),
      totalPages: totalPages,
    });
  } catch (error) {
    next(error);
  }
};

const deleteChat = async (req, res, next) => {
  try {
    const { cid } = req.params;

    const chats = await Chat.findById(cid);
    if (!chats) {
      return next(ErrorHandler("Chat Not Found"));
    }

    const messagesWithAttchments = await Message.find({
      chatId: chats._id,
      attachments: {
        $exists: true,
        $ne: [],
      },
    });
    const publicIds = [];
    messagesWithAttchments.forEach(({ attachments }) => {
      attachments.forEach(({ public_id }) => {
        publicIds.push(public_id);
      });
    });
    const [messages] = await Promise.all([
      Message.deleteMany({ chatId: cid }),
      deleteImageFromCloudanary(publicIds),
    ]);
    emitEvent(req, REFETCH_DATA, chats?.members, "CHAT");
    if (messages) {
      res.status(200).json({
        Success: true,
        message: "Message Deleted Successfully",
      });
    }
  } catch (error) {}
};
export { sendAttachment, getMessages, deleteChat };
