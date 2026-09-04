const { createFamilyMember, findById, findByUserId, updateFamilyMember, deleteFamilyMember, findByUserIdAndId } = require('../models/FamilyMember');
const { createAddress } = require('../models/Address');

exports.addFamilyMember = async (req, res) => {
  try {
    const { name, relationship, phone, gender, date_of_birth, blood_group, address, emergency_contact } = req.body;
    
    let address_id = null;
    if (address) {
      const newAddress = await createAddress({
        address_line: address.addressLine,
        city: address.city,
        district: address.district,
        division: address.division,
        latitude: address.latitude,
        longitude: address.longitude
      });
      address_id = newAddress.id;
    }

    const familyMember = await createFamilyMember({
      user_id: req.user.id,
      name,
      photo: null,
      date_of_birth,
      gender,
      relationship,
      blood_group,
      address_id,
      emergency_contact_name: emergency_contact?.name,
      emergency_contact_phone: emergency_contact?.phone,
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
    const { name, relationship, phone, gender, date_of_birth, blood_group, address, emergency_contact } = req.body;
    
    const familyMember = await findByUserIdAndId(req.user.id, id);
    
    if (!familyMember) {
      return res.notFound('Family member not found');
    }

    let address_id = familyMember.address_id;
    if (address && (!address_id || address.addressLine)) {
      if (address_id) {
        await updateAddress(address_id, {
          address_line: address.addressLine,
          city: address.city,
          district: address.district,
          division: address.division,
          latitude: address.latitude,
          longitude: address.longitude
        });
      } else {
        const newAddress = await createAddress({
          address_line: address.addressLine,
          city: address.city,
          district: address.district,
          division: address.division,
          latitude: address.latitude,
          longitude: address.longitude
        });
        address_id = newAddress.id;
      }
    }

    const updatedMember = await updateFamilyMember(id, {
      name,
      date_of_birth,
      gender,
      relationship,
      blood_group,
      address_id,
      emergency_contact_name: emergency_contact?.name,
      emergency_contact_phone: emergency_contact?.phone
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
