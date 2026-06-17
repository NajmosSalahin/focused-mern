const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'focused-dev-secret-change-in-production';

exports.auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

exports.JWT_SECRET = JWT_SECRET;
