const Emergency = require('../models/Emergency');
const FamilyMember = require('../models/FamilyMember');

exports.createEmergency = async (req, res) => {
  try {
    const {
      family_member_id, emergency_type, location,
      location_lat, location_long, description, emergency_contact
    } = req.body;

    if (!emergency_type || !location) {
      return res.status(400).json({
        success: false,
        message: 'Emergency type and location are required'
      });
    }

    if (family_member_id) {
      const familyMember = await FamilyMember.findByUserIdAndId(req.user.id, family_member_id);
      if (!familyMember) {
        return res.status(404).json({
          success: false,
          message: 'Family member not found'
        });
      }
    }

    const emergency = await Emergency.create({
      user_id: req.user.id,
      family_member_id,
      emergency_type,
      location,
      location_lat,
      location_long,
      description,
      emergency_contact
    });

    res.status(201).json({
      success: true,
      message: 'Emergency created successfully',
      emergency
    });
  } catch (error) {
    console.error('Create emergency error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create emergency'
    });
  }
};

exports.getEmergencies = async (req, res) => {
  try {
    const { status, limit } = req.query;

    const emergencies = await Emergency.findByUserId(req.user.id, {
      status,
      limit: limit || 20
    });

    res.status(200).json({
      success: true,
      emergencies
    });
  } catch (error) {
    console.error('Get emergencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergencies'
    });
  }
};

exports.getEmergency = async (req, res) => {
  try {
    const { id } = req.params;

    const emergency = await Emergency.findById(id);

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found'
      });
    }

    if (emergency.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      emergency
    });
  } catch (error) {
    console.error('Get emergency error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency'
    });
  }
};

exports.updateEmergency = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      location, location_lat, location_long, description, emergency_contact
    } = req.body;

    const emergency = await Emergency.findById(id);

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found'
      });
    }

    if (emergency.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updated = await Emergency.update(id, {
      location,
      location_lat,
      location_long,
      description,
      emergency_contact
    });

    res.status(200).json({
      success: true,
      message: 'Emergency updated successfully',
      emergency: updated
    });
  } catch (error) {
    console.error('Update emergency error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update emergency'
    });
  }
};

exports.resolveEmergency = async (req, res) => {
  try {
    const { id } = req.params;

    const emergency = await Emergency.findById(id);

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found'
      });
    }

    if (emergency.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await Emergency.resolve(id);

    res.status(200).json({
      success: true,
      message: 'Emergency resolved successfully'
    });
  } catch (error) {
    console.error('Resolve emergency error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve emergency'
    });
  }
};
