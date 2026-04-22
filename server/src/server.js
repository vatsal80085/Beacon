import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";
import { seedDatabase } from "./utils/seedData.js";

dotenv.config();

const PORT = process.env.PORT || 5050;

const startServer = async () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing. Add it to server/.env before starting the backend.");
  }

  await connectDB();
  if (String(process.env.SEED_DATABASE ?? "").toLowerCase() === "true") {
    await seedDatabase();
  }
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Server startup failed.");
  console.error(error.message);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});
