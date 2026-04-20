import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing. Add it to server/.env before starting the backend.");
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection failed.");
    console.error(`Tried: ${mongoUri}`);
    console.error(
      "If you are running locally, make sure mongod is started or switch MONGO_URI to a MongoDB Atlas connection string.",
    );
    console.error(error.message);
    process.exit(1);
  }
};

export default connectDB;
