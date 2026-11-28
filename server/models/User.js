const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const settlementBankSchema = new mongoose.Schema(
  {
    bankCode: { type: String, trim: true, default: "" },
    bankName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    accountName: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    handle: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: "",
    },
    settlementBank: {
      type: settlementBankSchema,
      default: null,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

module.exports = mongoose.model("User", userSchema);
