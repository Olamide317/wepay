const jwt = require('jsonwebtoken');
const User = require('../models/User');

const isFounderEmail = (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return false;
  return String(process.env.FOUNDER_EMAILS || '')
    .split(',')
    .some((founderEmail) => founderEmail.trim().toLowerCase() === normalizedEmail);
};

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, missing token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

const requireFounder = (req, res, next) => {
  if (!req.user || !isFounderEmail(req.user.email)) {
    return res.status(403).json({ message: 'Founder access required.' });
  }
  return next();
};

module.exports = { protect, requireFounder, isFounderEmail };