import express from "express";
import cors from "cors";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Health Check Route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "Server is running" });
});

// TODO: Register routes here
// app.use("/api/auth", authRoutes);

export default app;