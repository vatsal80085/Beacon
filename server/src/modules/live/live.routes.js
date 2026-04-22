import express from "express";
import { streamLiveEventsController } from "./live.controller.js";

const router = express.Router();

router.get("/events", streamLiveEventsController);

export default router;
