const { once } = require('events');
const Collection = require('../models/Collection');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const collectionPopulate = {
  path: 'collectionId',
  select: 'title slug organizer',
  populate: {
    path: 'organizer',
    select: 'fullName name email',
  },
};

const organizerName = (organizer) =>
  organizer?.fullName || organizer?.name || organizer?.email || '';

exports.getAdminOverview = async (req, res) => {
  try {
    const [
      volumeTotals,
      totalOrganizers,
      activeCollections,
      totalTransactions,
      successfulTransactions,
      recentTransactions,
      collections,
      users,
      organizerMetrics,
    ] = await Promise.all([
      Transaction.aggregate([
        { $match: { status: 'SUCCESS' } },
        {
          $group: {
            _id: null,
            totalGrossVolume: { $sum: { $ifNull: ['$totalPaid', 0] } },
            totalFeeRevenue: { $sum: { $ifNull: ['$feeAmount', 0] } },
          },
        },
      ]),
      User.countDocuments(),
      Collection.countDocuments({ status: 'ACTIVE' }),
      Transaction.countDocuments(),
      Transaction.countDocuments({ status: 'SUCCESS' }),
      Transaction.find()
        .sort({ createdAt: -1 })
        .limit(30)
        .populate(collectionPopulate)
        .lean(),
      Collection.find()
        .select('_id organizer title slug type status totalCollected contributorCount createdAt')
        .sort({ createdAt: -1 })
        .populate({ path: 'organizer', select: 'fullName name email' })
        .lean(),
      User.find()
        .select('_id fullName name email handle createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      Collection.aggregate([
        {
          $group: {
            _id: '$organizer',
            collectionCount: { $sum: 1 },
            totalVolumeRaised: { $sum: { $ifNull: ['$totalCollected', 0] } },
          },
        },
      ]),
    ]);

    const successfulVolume = volumeTotals[0] || {};
    const metricsByOrganizer = new Map(
      organizerMetrics.map((metric) => [
        String(metric._id),
        {
          collectionCount: metric.collectionCount,
          totalVolumeRaised: metric.totalVolumeRaised,
        },
      ])
    );
    const totalGrossVolume = successfulVolume.totalGrossVolume || 0;
    const totalFeeRevenue = successfulVolume.totalFeeRevenue || 0;

    return res.status(200).json({
      kpis: {
        totalGrossVolume,
        totalFeeRevenue,
        totalOrganizers,
        activeCollections,
        totalTransactions,
        successfulTransactions,
        conversionRate: totalTransactions
          ? Number(((successfulTransactions / totalTransactions) * 100).toFixed(2))
          : 0,
      },
      recentTransactions,
      collections,
      organizers: users.map((user) => ({
        ...user,
        name: organizerName(user),
        collectionCount: metricsByOrganizer.get(String(user._id))?.collectionCount || 0,
        totalVolumeRaised:
          metricsByOrganizer.get(String(user._id))?.totalVolumeRaised || 0,
      })),
    });
  } catch (error) {
    console.error('Founder overview query failed:', error);
    return res.status(500).json({ message: 'Failed to load founder overview.' });
  }
};

const csvCell = (value) => {
  let text = value === undefined || value === null ? '' : String(value);
  if (/^[\t\r ]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
};

const getTransactionDate = (transaction) => {
  const date = transaction.paidAt || transaction.createdAt;
  return date instanceof Date ? date.toISOString() : date || '';
};

exports.exportMasterTransactionsCsv = async (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="wepay-platform-transactions.csv"'
  );
  res.setHeader('Cache-Control', 'no-store');

  const headers = [
    'Date',
    'TxnRef',
    'ReceiptCode',
    'Collection',
    'Organizer',
    'PayerName',
    'PayerEmail',
    'Quantity',
    'BaseAmount',
    'FeeAmount',
    'TotalPaid',
    'Status',
  ];

  try {
    const cursor = Transaction.find()
      .sort({ createdAt: -1 })
      .populate(collectionPopulate)
      .cursor();

    const writeRow = async (row) => {
      if (!res.write(`${row.map(csvCell).join(',')}\r\n`)) {
        await once(res, 'drain');
      }
    };

    await writeRow(headers);
    for await (const transaction of cursor) {
      const collection = transaction.collectionId;
      await writeRow([
        getTransactionDate(transaction),
        transaction.txnRef,
        transaction.receiptCode,
        collection?.title,
        organizerName(collection?.organizer),
        transaction.payerName || transaction.contributorName,
        transaction.contributorEmail,
        transaction.quantity,
        transaction.baseAmount,
        transaction.feeAmount,
        transaction.totalPaid,
        transaction.status,
      ]);
    }

    return res.end();
  } catch (error) {
    console.error('Master transaction CSV export failed:', error);
    if (res.headersSent) {
      return res.destroy(error);
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.removeHeader('Content-Disposition');
    return res.status(500).json({ message: 'Failed to export platform transactions.' });
  }
};
