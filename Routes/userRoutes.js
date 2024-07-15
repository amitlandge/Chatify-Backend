import express from "express";
import {
  acceptRequest,
  getAllNotifications,
  getAllUser,
  getMyFriends,
  getProfile,
  getSingleUser,
  login,
  logout,
  register,
  sendRequest,
} from "../Controllers/userControllers.js";

import { auth } from "../Middlewares/auth.js";

const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.get("/myprofile", auth, getProfile);
router.get("/logout", auth, logout);
router.get("/", auth, getAllUser);
router.put("/sendRequest", auth, sendRequest);
router.put("/acceptRequest", auth, acceptRequest);
router.get("/getAllNotifications", auth, getAllNotifications);
router.get("/getMyFriends", auth, getMyFriends);
router.get("/friend/:uid", auth, getSingleUser);

export default router;
