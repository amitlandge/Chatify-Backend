import express from "express";

import { auth } from "../Middlewares/auth.js";
import {
  addMember,
  createGroup,
  deleteGroup,
  getChatDetails,
  getMyGroups,
  getchats,
  leaveGroup,
  removeMember,
  renameGroupName,
  unfriendUser,
} from "../Controllers/chatControllers.js";

const router = express.Router();

router.use(auth);
router.post("/createGroup", createGroup);
router.get("/mychats", getchats);
router.get("/myGroups", getMyGroups);
router.put("/addMember", addMember);
router.put("/removeMember", removeMember);
router.delete("/leave/:cid", leaveGroup);
router.delete("/unfriend/:cid", unfriendUser);

router
  .route("/:cid/")
  .get(getChatDetails)
  .put(renameGroupName)
  .delete(deleteGroup);

export default router;
