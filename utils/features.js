import jwt from "jsonwebtoken";
import { cookieOption } from "./cookieOption.js";
import { userSocketIds } from "../app.js";
import { User } from "../Models/userSchema.js";
import cloudinary from "cloudinary";
const sendToken = (res, payload, code, message) => {
  const token = jwt.sign({ id: payload._id }, process.env.SECRETE_KEY, {
    expiresIn: "1d",
  });

  return res
    .status(code)
    .cookie("token", token, cookieOption)
    .json({
      message: message,
      user: {
        name: payload.name,
        token: token,
        _id: payload._id,
        avatar: payload.avatar?.url,
        username: payload.username,
        friends: payload.friends,
        email: payload.email,
      },
    });
};

const socketUser = async (token) => {
  const verify = await jwt.verify(token, process.env.SECRETE_KEY);
  const user = await User.findById(verify.id);

  return {
    _id: user?._id,
    name: user?.name,
  };
};
const deleteImageFromCloudanary = (public_ids) => {
  const deleteImageFromCloudanary = public_ids.map((publicId) =>
    cloudinary.uploader.destroy(publicId)
  );
  return deleteImageFromCloudanary;
};

const sendFileToCloud = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.v2.uploader.upload(
        file.tempFilePath,
        {
          folder: "images",
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          if (result) {
            return resolve(result);
          }
        }
      );
    });
  });

  const results = await Promise.all(uploadPromises);

  try {
    const formattedResults = results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));

    return formattedResults;
  } catch (error) {}
};

const getSocket = (users = []) => {
  const socket = users.map((user) => userSocketIds.get(user?.toString()));

  return socket;
};

export {
  sendToken,
  deleteImageFromCloudanary,
  getSocket,
  socketUser,
  sendFileToCloud,
};
