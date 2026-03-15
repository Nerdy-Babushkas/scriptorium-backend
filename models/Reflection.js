const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema(
  {
    current: {
      type: Number,
      min: 0,
    },
    total: {
      type: Number,
      min: 1,
    },
    unit: {
      type: String,
      enum: ["chapters", "pages", "episodes", "minutes", "percent"],
    },
  },
  { _id: false },
);

const reflectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    item: {
      type: String,
      required: true,
      index: true,
    },
    itemType: {
      type: String,
      enum: ["book", "track", "movie"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200, // optional limit
      default: "", // optional default
    },
    text: {
      type: String,
      required: true,
      minlength: 30,
      maxlength: 2000,
      trim: true,
    },
    moodTags: {
      type: [String],
      default: [],
    },
    feelings: {
      type: [String],
      default: [],
    },
    progress: progressSchema,
    date: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

reflectionSchema.index({ user: 1, item: 1, date: 1 });

reflectionSchema.pre("save", async function () {
  if (
    this.progress &&
    this.progress.current != null &&
    this.progress.total != null
  ) {
    if (this.progress.current > this.progress.total) {
      throw new Error("Progress current cannot exceed total.");
    }
  }
});

module.exports = mongoose.model("Reflection", reflectionSchema);
