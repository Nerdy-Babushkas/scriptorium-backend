import dotenv from "dotenv";
import app from "./app.js";

// Initialize environment variables so process.env can be used
dotenv.config();

//Define Port number
const PORT = process.env.PORT || 3001;

//Start the Backend Server
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
