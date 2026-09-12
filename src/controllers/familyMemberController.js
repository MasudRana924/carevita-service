const {
  createFamilyMember,
  findById,
  findByUserId,
  updateFamilyMember,
  deleteFamilyMember,
  findByUserIdAndId
} = require('../models/FamilyMember');

const emptyToNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return value;
};

exports.addFamilyMember = async (req, res) => {
  try {
    const {
      name,
      relationship,
      phone,
      blood_group,
      date_of_birth,
      gender,
      district,
      thana,
      house,
      emergency_contact_name,
      emergency_contact_phone,
      medical_history,
      existing_conditions,
      allergies,
      current_medications
    } = req.body;

    if (!name) {
      return res.error('name is required');
    }

    let photoUrl = null;
    if (req.file) {
      photoUrl = req.file.path;
    }

    const familyMember = await createFamilyMember({
      user_id: req.user.id,
      name,
      photo: photoUrl,
      date_of_birth: emptyToNull(date_of_birth),
      gender: emptyToNull(gender),
      relationship: emptyToNull(relationship),
      blood_group: emptyToNull(blood_group),
      phone: emptyToNull(phone),
      district: emptyToNull(district),
      thana: emptyToNull(thana),
      house: emptyToNull(house),
      emergency_contact_name: emptyToNull(emergency_contact_name),
      emergency_contact_phone: emptyToNull(emergency_contact_phone || phone),
      medical_history: emptyToNull(medical_history),
      existing_conditions: emptyToNull(existing_conditions),
      allergies: emptyToNull(allergies),
      current_medications: emptyToNull(current_medications)
    });

    const created = await findById(familyMember.id);
    res.created(created, 'Family member added successfully');
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
    const familyMember = await findByUserIdAndId(req.user.id, req.params.id);
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
    const {
      name,
      relationship,
      phone,
      blood_group,
      date_of_birth,
      gender,
      district,
      thana,
      house,
      emergency_contact_name,
      emergency_contact_phone,
      medical_history,
      existing_conditions,
      allergies,
      current_medications
    } = req.body;

    const familyMember = await findByUserIdAndId(req.user.id, id);
    if (!familyMember) {
      return res.notFound('Family member not found');
    }

    let photoUrl = familyMember.photo;
    if (req.file) {
      photoUrl = req.file.path;
    }

    const updatedMember = await updateFamilyMember(id, {
      name: emptyToNull(name),
      photo: photoUrl,
      date_of_birth: emptyToNull(date_of_birth),
      gender: emptyToNull(gender),
      relationship: emptyToNull(relationship),
      blood_group: emptyToNull(blood_group),
      phone: emptyToNull(phone),
      district: emptyToNull(district),
      thana: emptyToNull(thana),
      house: emptyToNull(house),
      emergency_contact_name: emptyToNull(emergency_contact_name),
      emergency_contact_phone: emptyToNull(emergency_contact_phone || phone),
      medical_history: emptyToNull(medical_history),
      existing_conditions: emptyToNull(existing_conditions),
      allergies: emptyToNull(allergies),
      current_medications: emptyToNull(current_medications)
    });

    const updated = await findById(updatedMember.id);
    res.success(updated, 'Family member updated successfully');
  } catch (error) {
    console.error('Update family member error:', error);
    res.serverError('Failed to update family member');
  }
};

exports.deleteFamilyMember = async (req, res) => {
  try {
    const familyMember = await findByUserIdAndId(req.user.id, req.params.id);
    if (!familyMember) {
      return res.notFound('Family member not found');
    }

    await deleteFamilyMember(req.params.id);
    res.success(null, 'Family member deleted successfully');
  } catch (error) {
    console.error('Delete family member error:', error);
    res.serverError('Failed to delete family member');
  }
};
