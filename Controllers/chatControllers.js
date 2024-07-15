import { ErrorHandler } from "../utils/error.js";
import { Chat } from "../Models/chatSchema.js";

import { emitEvent } from "../utils/emittingEvent.js";
import { Message } from "../Models/messageSchema.js";
import { deleteImageFromCloudanary } from "../utils/features.js";
import { REFETCH_DATA } from "../constants/chatContants.js";
import { User } from "../Models/userSchema.js";
import { Request } from "../Models/userRequestSchema.js";
const createGroup = async (req, res, next) => {
  try {
    const { name, members } = req.body;

    const createMember = [...members, req.user];

    if (!createMember.length >= 3) {
      return next(new ErrorHandler("Group member must be Greater than 2"));
    }
    const chat = await Chat.create({
      name: name,
      groupChat: true,
      creator: req.user,
      members: [...createMember],
    });
    emitEvent(req, "ALERT", createMember, `Welcome To ${chat.name} Group`);
    emitEvent(req, REFETCH_DATA, chat.members, {
      chatId: chat._id,
      type: "CHAT",
    });
    const members1 = await chat.populate("members");
    res.status(200).json({
      message: "Successfull",
      members1,
    });
  } catch (error) {
    next(error);
  }
};
const getchats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ members: req.user }).populate(
      "members",
      "name avatar"
    );

    const transFormChats = await chats.map((chat) => {
      const otherMember =
        !chat.groupChat &&
        chat.members.find((mem) => {
          return mem._id.toString() !== req.user.toString();
        });

      const newMembers = chat.members.filter((mem) => {
        return mem._id.toString() !== req.user.toString();
      });
      const memberId = newMembers.map((mem) => {
        return mem._id;
      });

      return {
        _id: chat._id,
        name: !chat.groupChat ? otherMember.name : chat.name,
        groupChat: chat.groupChat,
        avatar: chat.groupChat
          ? chat?.members.slice(0, 3).map((avt) => avt.avatar.url)
          : [otherMember.avatar.url],
        members: memberId,
      };
    });
    res.status(200).json({
      message: "chats",
      transFormChats: transFormChats.reverse(),
    });
  } catch (error) {
    next(error);
  }
};
const getMyGroups = async (req, res, next) => {
  try {
    const chats = await Chat.find({
      groupChat: true,
      members: req.user,
    }).populate("members", "name avatar");

    const transFormChat = await chats?.map((mem) => {
      return {
        name: mem.name,
        groupChat: mem.groupChat,
        avatar: mem.members.slice(0, 3).map((mem) => mem.avatar.url),
        _id: mem._id,
        members: mem.members,
      };
    });

    res.status(200).json({
      message: "SuccesFull",
      groups: transFormChat,
    });
  } catch (error) {
    next(error);
  }
};
const addMember = async (req, res, next) => {
  try {
    const { chatId, members } = req.body;
    const chats = await Chat.findById(chatId);

    if (!chats || !chatId) {
      return next(new ErrorHandler("Please Check Chat Id"));
    }
    let AllMember = [...chats.members];
    if (!members > 1 || !members) {
      return next(new ErrorHandler("Please Add Members"));
    }

    if (chats?.members.length > 100) {
      return next(new ErrorHandler("We can't Add Member more than 100"));
    }
    members?.map((mem) => {
      const isExist = chats?.members.includes(mem);
      if (!isExist) {
        AllMember.push(mem);
      }
    });
    const updateMembers = await Chat.findByIdAndUpdate(chatId, {
      members: AllMember,
    });
    updateMembers.save();

    emitEvent(req, REFETCH_DATA, AllMember, { chatId: chatId, type: "ADD" });
    res.status(200).json({
      message: "Successfully",
      updateMembers,
    });
  } catch (error) {
    next(error);
  }
};
const removeMember = async (req, res, next) => {
  try {
    const { chatId, userId } = req.body;
    const chats = await Chat.findById(chatId);
    const AllMembers = [...chats.members];

    if (AllMembers.length <= 3) {
      return next(new ErrorHandler("Member Must be Above 3"));
    }

    if (!chats || !chatId) {
      return next(new ErrorHandler("Please Check Chat Id"));
    }
    const deleteMember = AllMembers.filter((mem) => {
      return mem.toString() !== userId.toString();
    });
    const removeUpdate = await Chat.findByIdAndUpdate(chatId, {
      members: deleteMember,
    });
    await removeUpdate.save();
    emitEvent(req, REFETCH_DATA, AllMembers, { chatId: chatId, type: "GROUP" });
    res.status(200).json({
      message: "Successfull",
    });
  } catch (error) {
    next(error);
  }
};

const leaveGroup = async (req, res, next) => {
  try {
    const { cid } = req.params;
    const chats = await Chat.findById(cid);

    const remainingMember = chats.members.filter((mem) => {
      return mem.toString() !== req.user.toString();
    });

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
    if (remainingMember.length === 1) {
      await Promise.all([
        Chat.findByIdAndDelete(cid),
        Message.deleteMany({ chatId: cid }),
        deleteImageFromCloudanary(publicIds),
      ]);
    } else {
      if (chats.creator.toString() === req.user.toString()) {
        chats.creator = remainingMember[0];
      }
      chats.members = remainingMember;
      await chats.save();
    }
    emitEvent(req, REFETCH_DATA, chats.members, {
      chatId: cid,
      type: "DELETE",
    });
    res.status(200).json({
      message: "SuccessFull",
      members: remainingMember,
    });
  } catch (error) {
    next(error);
  }
};
const getChatDetails = async (req, res, next) => {
  try {
    const { cid } = req.params;

    if (req.query.populate) {
      const chats = await Chat.findById(cid)
        .populate("members", "name avatar")
        .lean();

      if (!chats) {
        return next(new ErrorHandler("Chat Not Found"));
      }

      let chatDetailsChange = chats.members.map((mem) => {
        return {
          _id: mem._id,
          name: mem.name,
          avatar: mem.avatar.url,
        };
      });
 

      res.status(200).json({
        message: "Successfull",
        chatDetails: { ...chats, members: chatDetailsChange },
      });
    } else {
      const chats = await Chat.findById(cid);
      if (!chats) {
        return next(new ErrorHandler("Chat Not Found"));
      }
      res.status(200).json({
        message: "Successfull",
        chats,
      });
    }
  } catch (error) {
  
    next(error);
  }
};

const renameGroupName = async (req, res, next) => {
  try {
    const { cid } = req.params;

    const { name } = req.body;

    const chats = await Chat.findById(cid);
    if (!chats) {
      return next(new ErrorHandler("Chat is Not Found"));
    }
    if (!chats.groupChat) {
      return next(new ErrorHandler("This is Not Group Chat"));
    }
    if (chats.creator.toString() !== req.user.toString()) {
      return next(new ErrorHandler("You Can't Change The name"));
    }
    chats.name = name;

    emitEvent(req, REFETCH_DATA, chats.members, {
      chatId: cid,
      type: "RENAME",
    });
    await chats.save();
    res.status(200).json({
      message: "SuccessFull",
    });
  } catch (error) {
    next(error);
  }
};
const deleteGroup = async (req, res, next) => {
  try {
    const { cid } = req.params;
    const chats = await Chat.findById(cid).lean();
    const members = chats.members;
    if (!chats) {
      return next(new ErrorHandler("Chat is Not Found"));
    }
    if (chats.groupChat && chats.creator.toString() !== req.user.toString()) {
      return next(new ErrorHandler("You Can't Change The name"));
    }
    if (!chats.groupChat && !chats.members.includes(req.user.toString())) {
      return next(new ErrorHandler("This is Not Group Chat"));
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

    await Promise.all([
      Chat.findByIdAndDelete(cid),
      Message.deleteMany({ chatId: cid }),
      deleteImageFromCloudanary(publicIds),
    ]);
    emitEvent(req, REFETCH_DATA, members, { chatId: cid, type: "DELETE" });
    res.status(200).json({
      message: "SuccessFull",
    });
  } catch (error) {
    next(error);
  }
};

const unfriendUser = async (req, res, next) => {
  try {
    const { cid } = req.params;
    const chats = await Chat.findById(cid).lean();
    const members = chats.members;
    if (!chats) {
      return next(new ErrorHandler("Chat is Not Found"));
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
    const user = await User.findById(req.user).lean();
    const otherUser = await members.filter((mem) => {
      return mem.toString() !== req.user.toString();
    });

    const searchOther = await User.findById(...otherUser).lean();

    const filterUser = user?.friends.filter((fr) => {

      return fr.toString() !== searchOther._id.toString();
    });

    const otherfilterUser = searchOther?.friends.filter((fr) => {
      
      return fr.toString() !== req.user.toString();
    });

    const requestDelete = await Request.findOne({
      status: "Accepted",
      $or: [
        {
          sender: req.user,
          receiver: otherUser,
        },
        {
          sender: otherUser,
          receiver: req.user,
        },
      ],
    });

    await Promise.all([
      Chat.findByIdAndDelete(cid),
      Message.deleteMany({ chatId: cid }),
      deleteImageFromCloudanary(publicIds),
      User.findByIdAndUpdate(req.user, {
        friends: filterUser,
      }),
      User.findByIdAndUpdate(otherUser, {
        friends: otherfilterUser,
      }),
      Request.findByIdAndDelete(requestDelete?._id),
    ]);
    emitEvent(req, REFETCH_DATA, members, { chatId: cid, type: "UNFRIEND" });
    res.status(200).json({
      message: "SuccessFull",
    });
  } catch (error) {
    next(error);
  }
};

export {
  createGroup,
  getchats,
  getMyGroups,
  addMember,
  removeMember,
  leaveGroup,
  getChatDetails,
  renameGroupName,
  deleteGroup,
  unfriendUser,
};
