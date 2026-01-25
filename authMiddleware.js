const jwt = require("jsonwebtoken");

const USE_COOKIE_AUTH = process.env.USE_COOKIE_AUTH === "true";

const authMiddleware = (req, res, next) => {
  let token = null;


  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  
  if (!token && USE_COOKIE_AUTH && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
