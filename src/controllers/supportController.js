const SupportTicket = require('../models/SupportTicket');

exports.createSupportTicket = async (req, res) => {
  try {
    const { subject, description, category, priority } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Subject and description are required'
      });
    }

    const ticket = await SupportTicket.create({
      user_id: req.user.id,
      subject,
      description,
      category,
      priority: priority || 'medium'
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      ticket
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket'
    });
  }
};

exports.getSupportTickets = async (req, res) => {
  try {
    const { status, category, limit } = req.query;

    const tickets = await SupportTicket.findByUserId(req.user.id, {
      status,
      category,
      limit: limit || 20
    });

    res.status(200).json({
      success: true,
      tickets
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support tickets'
    });
  }
};

exports.getSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await SupportTicket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (ticket.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket'
    });
  }
};

exports.updateSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, description, category, priority } = req.body;

    const ticket = await SupportTicket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (ticket.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updated = await SupportTicket.update(id, {
      subject,
      description,
      category,
      priority
    });

    res.status(200).json({
      success: true,
      message: 'Ticket updated successfully',
      ticket: updated
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket'
    });
  }
};
