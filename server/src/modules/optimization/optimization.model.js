const mongoose = require("mongoose");

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

module.exports = mongoose.model(
  "OptimizationSuggestion",
  optimizationSchema
);