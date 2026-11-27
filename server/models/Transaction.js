const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection',
      required: true,
      index: true,
    },
    txnRef: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    receiptCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    contributorName: {
      type: String,
      required: true,
      trim: true,
    },
    payerName: {
      type: String,
      trim: true,
      default: '',
    },
    contributorEmail: {
      type: String,
      trim: true,
      default: '',
    },
    contributorPhone: {
      type: String,
      trim: true,
      default: '',
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    baseAmount: {
      type: Number,
      required: true,
      min: 100,
    },
    amount: {
      type: Number,
      required: true,
      min: 100,
    },
    feeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPaid: {
      type: Number,
      required: true,
      min: 100,
    },
    customResponses: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    customFieldAnswers: {
      type: Array,
      default: [],
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    interswitchRef: {
      type: String,
      default: null,
    },
    receiptHash: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
