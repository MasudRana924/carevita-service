const Medication = require('../models/Medication');
const FamilyMember = require('../models/FamilyMember');

exports.createMedication = async (req, res) => {
  try {
    const {
      family_member_id, medicine_name, dosage, frequency,
      start_date, end_date, instructions, reminder_enabled, reminder_times
    } = req.body;

    if (!medicine_name || !dosage || !frequency || !start_date) {
      return res.status(400).json({
        success: false,
        message: 'Medicine name, dosage, frequency, and start date are required'
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

    const medication = await Medication.create({
      user_id: req.user.id,
      family_member_id,
      medicine_name,
      dosage,
      frequency,
      start_date,
      end_date,
      instructions,
      reminder_enabled: reminder_enabled !== undefined ? reminder_enabled : true,
      reminder_times
    });

    res.status(201).json({
      success: true,
      message: 'Medication created successfully',
      medication
    });
  } catch (error) {
    console.error('Create medication error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create medication'
    });
  }
};

exports.getMedications = async (req, res) => {
  try {
    const { family_member_id, is_active, limit } = req.query;

    const medications = await Medication.findByUserId(req.user.id, {
      family_member_id,
      is_active,
      limit: limit || 50
    });

    res.status(200).json({
      success: true,
      medications
    });
  } catch (error) {
    console.error('Get medications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medications'
    });
  }
};

exports.getMedication = async (req, res) => {
  try {
    const { id } = req.params;

    const medication = await Medication.findById(id);

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found'
      });
    }

    if (medication.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      medication
    });
  } catch (error) {
    console.error('Get medication error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medication'
    });
  }
};

exports.updateMedication = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      medicine_name, dosage, frequency, start_date, end_date,
      instructions, is_active, reminder_enabled, reminder_times
    } = req.body;

    const medication = await Medication.findById(id);

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found'
      });
    }

    if (medication.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updated = await Medication.update(id, {
      medicine_name,
      dosage,
      frequency,
      start_date,
      end_date,
      instructions,
      is_active,
      reminder_enabled,
      reminder_times
    });

    res.status(200).json({
      success: true,
      message: 'Medication updated successfully',
      medication: updated
    });
  } catch (error) {
    console.error('Update medication error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medication'
    });
  }
};

exports.deleteMedication = async (req, res) => {
  try {
    const { id } = req.params;

    const medication = await Medication.findById(id);

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found'
      });
    }

    if (medication.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await Medication.delete(id);

    res.status(200).json({
      success: true,
      message: 'Medication deleted successfully'
    });
  } catch (error) {
    console.error('Delete medication error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete medication'
    });
  }
};
