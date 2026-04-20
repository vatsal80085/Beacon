import mongoose from "mongoose";

const sprintSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    goal: {
      type: String,
      default: "",
      trim: true,
    },
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ["PLANNED", "ACTIVE", "COMPLETED"],
      default: "PLANNED",
    },
    committedStoryPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

sprintSchema.index({ projectId: 1, status: 1 });

export default mongoose.model("Sprint", sprintSchema);
