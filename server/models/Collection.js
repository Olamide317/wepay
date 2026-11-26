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
    mode: {
      type: String,
      enum: ['SPLIT', 'FLEXIBLE'],
      required: true,
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
    totalCollected: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CLOSED'],
      default: 'ACTIVE',
    },
    expectedPayers: {
      type: [expectedPayerSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Collection', collectionSchema);