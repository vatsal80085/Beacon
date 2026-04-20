import express from "express";
import { getMe, login, logout, register } from "../controller/auth.controller.js";
import { authMiddleWare } from "../middleware/auth.js";
import { allowRoles } from "../middleware/role.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/logout", asyncHandler(logout));
router.get("/me", authMiddleWare, asyncHandler(getMe));
router.get("/admin", authMiddleWare, allowRoles("ADMIN"), (_req, res) => res.send("Admin Only"));
router.get("/manager", authMiddleWare, allowRoles("ADMIN", "MANAGER"), (_req, res) => res.send("Manager access"));

export default router;
