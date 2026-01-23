import express from "express";
import cors from "cors";
import registerRoutes from "./routes/index.js";

const app = express();

// Allow frontend (Vercel) to call backend
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Register all API routes
registerRoutes(app);

// Simple health check (for demo & testing)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "Backend is running" });
});

export default app;
