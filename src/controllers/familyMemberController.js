const { createFamilyMember, findById, findByUserId, updateFamilyMember, deleteFamilyMember, findByUserIdAndId } = require('../models/FamilyMember');
const { createAddress, updateAddress } = require('../models/Address');

const emptyToNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return value;
};

const parseAddressPayload = (body) => {
  if (!body) return null;

  let source = body.address;

  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) {
      source = null;
    } else if (trimmed.startsWith('{')) {
      try {
        source = JSON.parse(trimmed);
      } catch {
        source = { address_line: trimmed };
      }
    } else {
      source = { address_line: trimmed };
    }
  }

  const nested = source && typeof source === 'object' ? source : {};

  const address_line = emptyToNull(nested.address_line || nested.address || body.address_line);
  const city = emptyToNull(nested.city || body.city);
  const district = emptyToNull(nested.district || body.district);
  const division = emptyToNull(nested.division || body.division);
  const latitude = emptyToNull(nested.latitude ?? body.latitude);
  const longitude = emptyToNull(nested.longitude ?? body.longitude);

  const hasValue = [address_line, city, district, division, latitude, longitude].some(Boolean);
  if (!hasValue) return null;

  return { address_line, city, district, division, latitude, longitude };
};

const saveAddress = async (addressPayload, existingAddressId) => {
  if (!addressPayload) return existingAddressId || null;

  if (existingAddressId) {
    const updated = await updateAddress(existingAddressId, addressPayload);
    return updated ? updated.id : existingAddressId;
  }

  const created = await createAddress(addressPayload);
  return created.id;
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
      emergency_contact_name,
      emergency_contact_phone,
      medical_history,
      existing_conditions,
      allergies,
      current_medications
    } = req.body;

    const addressPayload = parseAddressPayload(req.body);
    const address_id = await saveAddress(addressPayload, null);
    
    let photoUrl = null;
    if (req.file) {
      photoUrl = req.file.path;
    }

    const familyMember = await createFamilyMember({
      user_id: req.user.id,
      name,
      photo: photoUrl,
      date_of_birth,
      gender: gender || null,
      relationship,
      blood_group,
      address_id,
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || phone || null,
      medical_history: medical_history || null,
      existing_conditions: existing_conditions || null,
      allergies: allergies || null,
      current_medications: current_medications || null
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
    const { 
      name, 
      relationship, 
      phone, 
      blood_group, 
      date_of_birth,
      gender,
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

    const addressPayload = parseAddressPayload(req.body);
    const address_id = addressPayload
      ? await saveAddress(addressPayload, familyMember.address_id)
      : undefined;

    const updatedMember = await updateFamilyMember(id, {
      name,
      photo: photoUrl,
      date_of_birth,
      gender: gender || null,
      relationship,
      blood_group,
      address_id,
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || phone || null,
      medical_history: medical_history || null,
      existing_conditions: existing_conditions || null,
      allergies: allergies || null,
      current_medications: current_medications || null
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
