const { createFamilyMember, findByUserId, findById, updateFamilyMember, deleteFamilyMember, findByUserIdAndId } = require('../models/FamilyMember');

exports.createFamilyMember = async (req, res) => {
  try {
    const {
      name, photo, age, gender, relationship, blood_group,
      address, emergency_contact, medical_history, existing_conditions,
      allergies, current_medications, preferred_hospital, preferred_doctor
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const member = await createFamilyMember({
      user_id: req.user.id,
      name,
      photo,
      age,
      gender,
      relationship,
      blood_group,
      address,
      emergency_contact,
      medical_history,
      existing_conditions,
      allergies,
      current_medications,
      preferred_hospital,
      preferred_doctor
    });

    res.status(201).json({
      success: true,
      message: 'Family member created successfully',
      member
    });
  } catch (error) {
    console.error('Create family member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create family member'
    });
  }
};

exports.getFamilyMembers = async (req, res) => {
  try {
    const members = await findByUserId(req.user.id);

    res.status(200).json({
      success: true,
      members
    });
  } catch (error) {
    console.error('Get family members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch family members'
    });
  }
};

exports.getFamilyMember = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await findById(id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    res.status(200).json({
      success: true,
      member
    });
  } catch (error) {
    console.error('Get family member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch family member'
    });
  }
};

exports.updateFamilyMember = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, photo, age, gender, relationship, blood_group,
      address, emergency_contact, medical_history, existing_conditions,
      allergies, current_medications, preferred_hospital, preferred_doctor
    } = req.body;

    const existingMember = await findByUserIdAndId(req.user.id, id);
    if (!existingMember) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    const member = await updateFamilyMember(id, {
      name,
      photo,
      age,
      gender,
      relationship,
      blood_group,
      address,
      emergency_contact,
      medical_history,
      existing_conditions,
      allergies,
      current_medications,
      preferred_hospital,
      preferred_doctor
    });

    res.status(200).json({
      success: true,
      message: 'Family member updated successfully',
      member
    });
  } catch (error) {
    console.error('Update family member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update family member'
    });
  }
};

exports.deleteFamilyMember = async (req, res) => {
  try {
    const { id } = req.params;

    const existingMember = await findByUserIdAndId(req.user.id, id);
    if (!existingMember) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    await deleteFamilyMember(id);

    res.status(200).json({
      success: true,
      message: 'Family member deleted successfully'
    });
  } catch (error) {
    console.error('Delete family member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete family member'
    });
  }
};

exports.uploadFamilyMemberPhoto = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const existingMember = await findByUserIdAndId(req.user.id, id);
    if (!existingMember) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found'
      });
    }

    const member = await updateFamilyMember(id, {
      photo: req.file.path
    });

    res.status(200).json({
      success: true,
      message: 'Photo uploaded successfully',
      photo: member.photo
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload photo'
    });
  }
};
