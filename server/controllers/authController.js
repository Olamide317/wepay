const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const slugifyHandle = (raw) =>
  String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'organizer';

const buildUniqueHandle = async (preferred, fallbackName) => {
  const base = slugifyHandle(preferred || fallbackName);
  let candidate = base;
  let exists = await User.exists({ handle: candidate });
  while (exists) {
    const suffix = Math.floor(100 + Math.random() * 900);
    candidate = `${base}-${suffix}`;
    exists = await User.exists({ handle: candidate });
  }
  return candidate;
};

const formatUser = (user) => ({
  _id: user._id,
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  handle: user.handle || slugifyHandle(user.fullName),
  avatarUrl: user.avatarUrl || undefined,
  settlementBank: user.settlementBank || undefined,
  verified: Boolean(user.verified),
  createdAt: user.createdAt,
});

exports.register = async (req, res) => {
  try {
    const { fullName, email, phone, handle, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const uniqueHandle = await buildUniqueHandle(handle, fullName);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      handle: uniqueHandle,
      passwordHash,
    });

    const token = signToken(user._id);
    return res.status(201).json({ token, user: formatUser(user), organizer: formatUser(user) });
  } catch (error) {
    return res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.handle) {
      user.handle = await buildUniqueHandle('', user.fullName);
      await user.save();
    }

    const token = signToken(user._id);
    return res.status(200).json({ token, user: formatUser(user), organizer: formatUser(user) });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

exports.getMe = async (req, res) => {
  return res.status(200).json({ user: formatUser(req.user), organizer: formatUser(req.user) });
};

exports.formatUser = formatUser;
