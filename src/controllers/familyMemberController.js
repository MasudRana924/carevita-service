const { createFamilyMember, findById, findByUserId, updateFamilyMember, deleteFamilyMember, findByUserIdAndId } = require('../models/FamilyMember');
const { createAddress } = require('../models/Address');

exports.addFamilyMember = async (req, res) => {
  try {
    const { name, relationship, phone, blood_group, date_of_birth } = req.body;
    
    let photoUrl = null;
    if (req.file) {
      photoUrl = req.file.path;
    }

    const familyMember = await createFamilyMember({
      user_id: req.user.id,
      name,
      photo: photoUrl,
      date_of_birth,
      gender: null,
      relationship,
      blood_group,
      address_id: null,
      emergency_contact_name: null,
      emergency_contact_phone: phone,
      medical_history: null,
      existing_conditions: null,
      allergies: null,
      current_medications: null
    });

    res.created(familyMember, 'Family member added successfully');
  } catch (error) {
    console.error('Add family member error:', error);
    res.serverError('Failed to add family member');
  }
};

exports.listFamilyMembers = async (req, res) => {
  try {
    const familyMembers = await findByUserId(req.user.id);

    if (!familyMembers || familyMembers.length === 0) {
      return res.success(null, 'No family members added yet');
    }

    res.success(familyMembers);
  } catch (error) {
    console.error('List family members error:', error);
    res.serverError('Failed to list family members');
  }
};

exports.viewFamilyMember = async (req, res) => {
  try {
    const { id } = req.params;
    
    const familyMember = await findByUserIdAndId(req.user.id, id);
    
    if (!familyMember) {
      return res.notFound('Family member not found');
    }

    res.success(familyMember);
  } catch (error) {
    console.error('View family member error:', error);
    res.serverError('Failed to view family member');
  }
};

exports.updateFamilyMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, relationship, phone, blood_group, date_of_birth } = req.body;
    
    const familyMember = await findByUserIdAndId(req.user.id, id);
    
    if (!familyMember) {
      return res.notFound('Family member not found');
    }

    let photoUrl = familyMember.photo;
    if (req.file) {
      photoUrl = req.file.path;
    }

    const updatedMember = await updateFamilyMember(id, {
      name,
      photo: photoUrl,
      date_of_birth,
      gender: null,
      relationship,
      blood_group,
      address_id: null,
      emergency_contact_name: null,
      emergency_contact_phone: phone,
      medical_history: null,
      existing_conditions: null,
      allergies: null,
      current_medications: null
    });

    res.success(updatedMember, 'Family member updated successfully');
  } catch (error) {
    console.error('Update family member error:', error);
    res.serverError('Failed to update family member');
  }
};

exports.deleteFamilyMember = async (req, res) => {
  try {
    const { id } = req.params;
    
    const familyMember = await findByUserIdAndId(req.user.id, id);
    
    if (!familyMember) {
      return res.notFound('Family member not found');
    }

    await deleteFamilyMember(id);

    res.success(null, 'Family member deleted successfully');
  } catch (error) {
    console.error('Delete family member error:', error);
    res.serverError('Failed to delete family member');
  }
};
