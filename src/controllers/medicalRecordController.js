const MedicalRecord = require('../models/MedicalRecord');
const FamilyMember = require('../models/FamilyMember');

exports.createMedicalRecord = async (req, res) => {
  try {
    const {
      family_member_id, record_type, title, description,
      file_url, file_type, record_date, hospital_id, doctor_id, is_confidential
    } = req.body;

    if (!record_type || !title) {
      return res.status(400).json({
        success: false,
        message: 'Record type and title are required'
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

    const record = await MedicalRecord.create({
      user_id: req.user.id,
      family_member_id,
      record_type,
      title,
      description,
      file_url,
      file_type,
      record_date,
      hospital_id,
      doctor_id,
      is_confidential: is_confidential || false
    });

    res.status(201).json({
      success: true,
      message: 'Medical record created successfully',
      record
    });
  } catch (error) {
    console.error('Create record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create record'
    });
  }
};

exports.getMedicalRecords = async (req, res) => {
  try {
    const { family_member_id, record_type, limit } = req.query;

    const records = await MedicalRecord.findByUserId(req.user.id, {
      family_member_id,
      record_type,
      limit: limit || 50
    });

    res.status(200).json({
      success: true,
      records
    });
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch records'
    });
  }
};

exports.getMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await MedicalRecord.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    if (record.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      record
    });
  } catch (error) {
    console.error('Get record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch record'
    });
  }
};

exports.updateMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, file_url, file_type, record_date,
      hospital_id, doctor_id, is_confidential
    } = req.body;

    const record = await MedicalRecord.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    if (record.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updated = await MedicalRecord.update(id, {
      title,
      description,
      file_url,
      file_type,
      record_date,
      hospital_id,
      doctor_id,
      is_confidential
    });

    res.status(200).json({
      success: true,
      message: 'Record updated successfully',
      record: updated
    });
  } catch (error) {
    console.error('Update record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update record'
    });
  }
};

exports.deleteMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await MedicalRecord.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    if (record.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await MedicalRecord.delete(id);

    res.status(200).json({
      success: true,
      message: 'Record deleted successfully'
    });
  } catch (error) {
    console.error('Delete record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete record'
    });
  }
};

exports.uploadMedicalRecordFile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const record = await MedicalRecord.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    if (record.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updated = await MedicalRecord.update(id, {
      file_url: req.file.path,
      file_type: req.file.mimetype
    });

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      file_url: updated.file_url
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file'
    });
  }
};
