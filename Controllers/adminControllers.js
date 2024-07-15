import { User } from "../Models/userSchema.js";
import { Chat } from "../Models/chatSchema.js";
import { Message } from "../Models/messageSchema.js";

const getAllAdminUsers = async (req, res, next) => {
  try {
    const users = await User.find({});

    const changeUsers = await Promise.all(
      users.map(async (user) => {
        const [groups] = await Promise.all([
          Chat.countDocuments({ groupChat: true, members: user._id }),
        ]);
        return {
          name: user.name,
          _id: user._id,
          avatar: user.avatar.url,
          friends: user.friends.length,
          groups: groups,
          username: user?.username,
        };
      })
    );

    res.status(200).json({
      message: "Successfull",
      users: changeUsers,
    });
  } catch (error) {
    next(error);
  }
};

const getAllAdminChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({})
      .populate("creator", "name avatar")
      .populate("members", "name avatar");
    const changeChats = await Promise.all(
      chats.map(async (chats) => {
        const messages = await Message.find({ chatId: chats._id });
        return {
          name: chats.name,
          groupChat: chats.groupChat,
          _id: chats._id,
          creator: {
            name: chats.creator?.name || "None",
            avatar: chats.creator?.avatar.url || "",
          },
          members: chats.members.slice(0, 3).map((mem) => mem.avatar.url),
          totalMembers: chats.members.length,
          totalMessages: messages.length,
        };
      })
    );
    res.status(200).json({
      message: "Successufull",
      chats: changeChats,
    });
  } catch (error) {
    next(error);
  }
};
const getAllAdminMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({})
      .populate("sender", "name avatar")
      .populate("chatId", "groupChat");
    const changeMessage = messages.map((mess) => {
      return {
        _id: mess?._id,
        content: mess?.content,
        attachments: mess?.attachments,
        groupChat: mess?.chatId?.groupChat,
        chatId: mess?.chatId?._id,
        sender: {
          name: mess.sender.name,
          avatar: mess.sender.avatar.url,
        },
      };
    });

    res.status(200).json({
      message: "Succesfull",
      messages: changeMessage,
    });
  } catch (error) {
    next(error);
  }
};
const getStats = async (req, res, next) => {
  try {
    const [GroupChats, MessageCount, UserCount, ChatCount] = await Promise.all([
      Chat.countDocuments({ groupChat: true }),
      Message.countDocuments(),
      User.countDocuments(),
      Chat.countDocuments(),
    ]);
    const today = new Date();
    let last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const last7DaysMessages = await Message.find({
      createdAt: {
        $gte: last7Days,
      },
    }).select("createdAt");

    const messages = new Array(7).fill(0);
    const daysInMilliseconds = 1000 * 60 * 60 * 24;
    last7DaysMessages.forEach((mess) => {
      const indexOfMessage =
        (today.getTime() - mess.createdAt.getTime()) / daysInMilliseconds;
      const getIndex = Math.floor(indexOfMessage);
      messages[6 - getIndex]++;
    });

    const stats = {
      GroupChats,
      MessageCount,
      UserCount,
      ChatCount,
      messages: messages,
    };
    res.status(200).json({
      messages: "Successfull",
      stats,
    });
  } catch (error) {
    next(error);
  }
};

export { getAllAdminUsers, getAllAdminChats, getAllAdminMessages, getStats };
