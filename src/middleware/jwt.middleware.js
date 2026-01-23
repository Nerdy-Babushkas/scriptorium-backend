import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
  // Get Authorization header
  const authHeader = req.headers.authorization;

  // If no token is provided
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.split(" ")[1];

  try {
    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET);

    // Token is valid, continue to the route
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
