const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendWelcomeEmail } = require("../services/emailService");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const slugifyHandle = (raw) =>
  String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "organizer";

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
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const normalizedFullName = String(fullName || "").trim();

    if (!normalizedFullName || !normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "Full name, email, and password are required" });
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address (e.g. name@example.com).",
      });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please log in.",
      });
    }

    const uniqueHandle = await buildUniqueHandle(handle, normalizedFullName);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      fullName: normalizedFullName,
      email: normalizedEmail,
      phone: phone ? phone.trim() : "",
      handle: uniqueHandle,
      passwordHash,
    });

    void Promise.resolve()
      .then(() => sendWelcomeEmail({ name: user.fullName, email: user.email }))
      .catch((error) => console.error("[Brevo Welcome Error]:", error.message));

    const token = signToken(user._id);
    return res
      .status(201)
      .json({ token, user: formatUser(user), organizer: formatUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email or handle already exists.",
      });
    }
    return res
      .status(500)
      .json({ message: "Registration failed", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.handle) {
      user.handle = await buildUniqueHandle("", user.fullName);
      await user.save();
    }

    const token = signToken(user._id);
    return res
      .status(200)
      .json({ token, user: formatUser(user), organizer: formatUser(user) });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Login failed", error: error.message });
  }
};

exports.getMe = async (req, res) => {
  return res
    .status(200)
    .json({ user: formatUser(req.user), organizer: formatUser(req.user) });
};

exports.formatUser = formatUser;
