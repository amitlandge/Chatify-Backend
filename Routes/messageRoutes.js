import express from "express";

import { auth } from "../Middlewares/auth.js";

import {
  deleteChat,
  getMessages,
  sendAttachment,
} from "../Controllers/messageControllers.js";

const router = express.Router();

router.use(auth);
router.post("/attachments", sendAttachment);
router.get("/:cid", getMessages);
router.delete("/:cid", deleteChat);

export default router;
