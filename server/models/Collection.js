const mongoose = require('mongoose');

const expectedPayerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contact: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['PENDING', 'PAID'],
      default: 'PENDING',
    },
    paidAt: { type: Date, default: null },
    txnRef: { type: String, default: null },
  },
  { _id: true }
);

const collectionSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Collection title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['POOL', 'OPEN', 'INVENTORY'],
      default: 'OPEN',
    },
    mode: {
      type: String,
      enum: ['SPLIT', 'FLEXIBLE'],
      default: 'FLEXIBLE',
    },
    pricingRule: {
      type: String,
      enum: ['FIXED', 'MINIMUM', 'FLEXIBLE'],
      default: 'FIXED',
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    targetAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalTarget: {
      type: Number,
      default: 0,
      min: 0,
    },
    perPersonAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountRaised: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCollected: {
      type: Number,
      default: 0,
      min: 0,
    },
    stockLimit: {
      type: Number,
      default: null,
      min: 0,
    },
    stockSold: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxQuantityPerOrder: {
      type: Number,
      default: 5,
      min: 1,
    },
    passFeeToPayer: {
      type: Boolean,
      default: true,
    },
    customFields: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    contributorCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'SOLD_OUT', 'PAUSED', 'CLOSED'],
      default: 'ACTIVE',
    },
    targetReachedNotified: { type: Boolean, default: false },
    soldOutNotified: { type: Boolean, default: false },
    expectedPayers: {
      type: [expectedPayerSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Collection', collectionSchema);