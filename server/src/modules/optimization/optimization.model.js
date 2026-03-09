import mongoose from "mongoose";

const optimizationSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    type: {
      type: String,
      enum: ["RESOURCE", "SPRINT", "RISK"],
    },
    suggestion: String,
    confidenceScore: Number,
  },
  { timestamps: true }
);

export default mongoose.model(
  "OptimizationSuggestion",
  optimizationSchema
);