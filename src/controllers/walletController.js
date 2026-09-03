const Wallet = require('../models/Wallet');

exports.getCustomerWallet = async (req, res) => {
  try {
    let wallet = await Wallet.getCustomerWallet(req.user.id);

    if (!wallet) {
      wallet = await Wallet.createCustomerWallet(req.user.id);
    }

    const transactions = await Wallet.getTransactions(wallet.id, 'customer', { limit: 20 });

    res.status(200).json({
      success: true,
      wallet,
      transactions
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet'
    });
  }
};

exports.addFunds = async (req, res) => {
  try {
    const { amount, payment_method } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    const wallet = await Wallet.updateCustomerBalance(req.user.id, amount, 'credit');

    await Wallet.addTransaction(wallet.id, 'customer', {
      type: 'credit',
      amount,
      description: 'Funds added via ' + payment_method,
      balance_after: wallet.balance
    });

    res.status(200).json({
      success: true,
      message: 'Funds added successfully',
      wallet
    });
  } catch (error) {
    console.error('Add funds error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add funds'
    });
  }
};

exports.getWalletTransactions = async (req, res) => {
  try {
    const { type, limit } = req.query;

    const wallet = await Wallet.getCustomerWallet(req.user.id);

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    const transactions = await Wallet.getTransactions(wallet.id, 'customer', {
      type,
      limit: limit || 50
    });

    res.status(200).json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
};
