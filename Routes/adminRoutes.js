import express from "express";

import {
  getAllAdminChats,
  getAllAdminMessages,
  getAllAdminUsers,
  getStats,
} from "../Controllers/adminControllers.js";

const router = express.Router();

router.get("/getAllUsers", getAllAdminUsers);

router.get("/getAllChats", getAllAdminChats);
router.get("/getAllMessages", getAllAdminMessages);
router.get("/stats", getStats);
export default router;
