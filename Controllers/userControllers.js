import { compare } from "bcrypt";
import { User } from "../Models/userSchema.js";
import { sendToken } from "../utils/features.js";
import { ErrorHandler } from "../utils/error.js";

import { cookieOption } from "../utils/cookieOption.js";
import { Request } from "../Models/userRequestSchema.js";
import { emitEvent } from "../utils/emittingEvent.js";
import { NEW_REQUEST, REFETCH_DATA } from "../constants/chatContants.js";
import cloudinary from "cloudinary";
import { Chat } from "../Models/chatSchema.js";
const register = async (req, res, next) => {
  try {
    const { name, bio, username, password } = req.body;
    const { avatar } = req.files;

    if (!avatar) {
      return next(new ErrorHandler("Please Upload Aavatar", 400));
    }
    let user = await User.findOne({ username: username });
    if (user) {
      return next(new ErrorHandler("This Username Already Used", 400));
    }
    let profilePicture = {};

    await cloudinary.v2.uploader
      .upload(avatar.tempFilePath, {
        folder: "avatars",
        width: 150,
        crop: "scale",
      })
      .then(async (res) => {
        (profilePicture.public_id = res.public_id),
          (profilePicture.url = res.secure_url);
        user = await User.create({
          name,
          bio,
          username,
          password,
          avatar: profilePicture,
        });
      })
      .catch((err) => {
        return next(new ErrorHandler(err.message, 400));
      });

    sendToken(res, user, 200, "User Register");
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username && !password) {
      res.status(400).json({
        message: "Please Fill All the field",
      });
    }

    const user = await User.findOne({ username })
      .select("+password")
      .populate("friends", "name avatar");
    if (!user) {
      return next(new ErrorHandler("Invalid User", 400));
    }
    const comparePassword = await compare(password, user.password);
    if (!comparePassword) {
      return next(new ErrorHandler("Password Does Not Matched", 400));
    }

    sendToken(res, user, 200, "SuccesFully Login");
  } catch (error) {
    next(error);
  }
};
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user)
      .populate("friends", "name avatar")
      .lean();
    res.status(200).json({
      message: "success",
      user: {
        ...user,
        avatar: user?.avatar?.url,
      },
    });
  } catch (error) {
    next(error);
  }
};
const logout = (req, res) => {
  res
    .status(200)
    .cookie("token", "", { ...cookieOption, maxAge: 0 })
    .json({
      message: "logout Successfully",
    });
};

const getAllUser = async (req, res, next) => {
  try {
    const { search = "" } = req.query;

    const user = await User.findById(req.user);

    const filterUser = await User.find({
      _id: { $nin: [...user.friends, req.user] },
      $or: [
        {
          name: { $regex: search, $options: "i" },
        },
        {
          username: { $regex: search, $options: "i" },
        },
      ],
    });

    res.status(200).json({
      message: "SuccessFully",
      filterUser,
    });
  } catch (error) {
    next(error);
  }
};
const sendRequest = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const request = await Request.findOne({
      $or: [
        { sender: req.user, receiver: userId },
        { sender: userId, receiver: req.user },
      ],
    });
    if (request) {
      return next(
        new ErrorHandler("You Have Already Send Friend Request", 400)
      );
    }
    const sendRequest = await Request.create({
      sender: req.user,
      receiver: userId,
    });
    emitEvent(req, NEW_REQUEST, [userId]);
    res.status(200).json({
      message: "Successfully",
      sendRequest,
    });
  } catch (error) {
    next(error);
  }
};
const acceptRequest = async (req, res, next) => {
  try {
    const { requestId, accept } = req.body;
    const request = await Request.findById(requestId)
      .populate("sender", "name")
      .populate("receiver", "name");
    if (!request) {
      return next(new ErrorHandler("Request is Not Found"));
    }

    if (request.receiver._id.toString() !== req.user.toString()) {
      return next(new ErrorHandler("You Can't Take a Action"));
    }
    const user = await User.findById(req.user);
    const isAlreadyFriend = user.friends.filter((user) => {
      return user.toString().includes(request.sender._id.toString());
    });

    if (isAlreadyFriend.length !== 0) {
      return next(new ErrorHandler("You are Already Friends"));
    }
    if (!accept) {
      await Request.findByIdAndDelete(requestId);
      res.status(200).json({
        message: "Friend Request Rejected",
      });
    } else {
      const requestSender = await User.findById(request.sender._id);
      requestSender.friends.push(request.receiver._id);
      await requestSender.save();
      const requestReceiver = await User.findById(request.receiver._id);
      requestReceiver.friends.push(request.sender._id);
      await requestReceiver.save();

      const chats = await Chat.create({
        name: `${request.sender.name}-${request.receiver.name}`,
        groupChat: false,
        members: [request.sender._id, request.receiver._id],
        creator: request.sender._id,
      });
      request.status = "Accepted";
      await request.save();

      emitEvent(req, REFETCH_DATA, chats.members, {
        chatId: chats._id,
        type: "CHAT",
      });
      res.status(200).json({
        message: "Request Accepted",
      });
    }
  } catch (error) {
    next(error);
  }
};

const getAllNotifications = async (req, res, next) => {
  try {
    const request = await Request.find({
      receiver: req.user,
      status: "Pending",
    }).populate("sender", "name avatar");
    if (!request) {
      return next(new ErrorHandler("No Request Found"));
    }
    const getNotifications = request.map((request) => {
      return {
        _id: request._id,
        sender: {
          _id: request.sender._id,
          name: request.sender.name,
          avatar: request.sender.avatar?.url,
        },
      };
    });
    res.status(200).json({
      message: "Successfull",
      getNotifications,
    });
  } catch (error) {
    next(error);
  }
};

const getMyFriends = async (req, res, next) => {
  try {
    const user = await User.findById(req.user).populate(
      "friends",
      "name avatar"
    );
    if (!user.friends) {
      return next(new ErrorHandler("No Friends Found"));
    }

    const myFriends = user.friends.map((friend) => {
      return {
        _id: friend._id,
        name: friend.name,
        avatar: friend.avatar.url,
        username: friend.username,
      };
    });
    res.status(200).json({
      message: "SuccessFully",
      myFriends,
    });
  } catch (error) {
    next(error);
  }
};

const getSingleUser = async (req, res, next) => {
  try {
    const { uid } = req.params;
    const user = await User.findById(uid);

    res.status(200).json({
      message: "SuccessFully",
      user,
    });
  } catch (error) {
    next(error);
  }
};
export {
  login,
  register,
  getProfile,
  logout,
  getAllUser,
  sendRequest,
  acceptRequest,
  getAllNotifications,
  getMyFriends,
  getSingleUser,
};
