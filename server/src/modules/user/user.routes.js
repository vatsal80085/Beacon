import express from "express";
import { authMiddleWare } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { deleteUserController, getUserController, listUsersController, updateUserController } from "./user.controller.js";

const router = express.Router();

router.use(authMiddleWare);
router.get("/", asyncHandler(listUsersController));
router.get("/:id", asyncHandler(getUserController));
router.patch("/:id", asyncHandler(updateUserController));
router.delete("/:id", asyncHandler(deleteUserController));

export default router;
