const User = require('../models/User');
const Collection = require('../models/Collection');
const { formatUser } = require('./authController');

exports.updateSettlementBank = async (req, res) => {
  try {
    const { bankCode, bankName, accountNumber, accountName } = req.body;

    if (!bankName || !accountNumber) {
      return res.status(400).json({ message: 'Bank name and account number are required' });
    }

    const cleanAccount = String(accountNumber).trim();
    if (!/^\d{10}$/.test(cleanAccount)) {
      return res.status(400).json({ message: 'Account number must be a valid 10-digit NUBAN' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    user.settlementBank = {
      bankCode: bankCode ? String(bankCode).trim() : '',
      bankName: String(bankName).trim(),
      accountNumber: cleanAccount,
      accountName: accountName ? String(accountName).trim() : user.fullName,
    };
    user.verified = true;

    await user.save();

    const formatted = formatUser(user);
    return res.status(200).json({ organizer: formatted, user: formatted });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update settlement bank', error: error.message });
  }
};

exports.getOrganizerPublicHub = async (req, res) => {
  try {
    const handle = String(req.params.handle || '').toLowerCase().trim();
    const user = await User.findOne({ handle });

    if (!user) {
      return res.status(404).json({ message: 'Organizer handle not found' });
    }

    const collections = await Collection.find({
      organizer: user._id,
      status: 'ACTIVE',
    })
      .populate('organizer', 'fullName handle verified')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      organizer: formatUser(user),
      collections,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load organizer hub', error: error.message });
  }
};
