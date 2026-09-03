const { createDoctor, findByUserId, findById, updateDoctor, findAll, search, incrementCompletedAppointments } = require('../models/Doctor');
const { findById: findHospitalById } = require('../models/Hospital');
const { findByDoctorId, findById: findAppointmentById, updateStatus, updatePaymentStatus, complete, getDoctorAvailability } = require('../models/Appointment');
const Review = require('../models/Review');

exports.createDoctorProfile = async (req, res) => {
  try {
    const {
      name, photo, bmdc_number, specialty, qualifications,
      experience, hospital_id, consultation_fee, bio
    } = req.body;

    if (!name || !specialty) {
      return res.status(400).json({
        success: false,
        message: 'Name and specialty are required'
      });
    }

    const existingProfile = await findByUserId(req.user.id);
    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: 'Profile already exists'
      });
    }

    const doctor = await createDoctor({
      user_id: req.user.id,
      name,
      photo,
      bmdc_number,
      specialty,
      qualifications,
      experience,
      hospital_id,
      consultation_fee,
      bio
    });

    res.status(201).json({
      success: true,
      message: 'Doctor profile created successfully',
      doctor
    });
  } catch (error) {
    console.error('Create doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create profile'
    });
  }
};

exports.getDoctorProfile = async (req, res) => {
  try {
    const doctor = await findByUserId(req.user.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.status(200).json({
      success: true,
      doctor
    });
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

exports.updateDoctorProfile = async (req, res) => {
  try {
    const {
      name, photo, bmdc_number, specialty, qualifications,
      experience, hospital_id, consultation_fee, bio, is_available
    } = req.body;

    const doctor = await findByUserId(req.user.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const updated = await updateDoctor(doctor.id, {
      name,
      photo,
      bmdc_number,
      specialty,
      qualifications,
      experience,
      hospital_id,
      consultation_fee,
      bio,
      is_available
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      doctor: updated
    });
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

exports.searchDoctors = async (req, res) => {
  try {
    const { query, specialty, hospital_id, min_rating, limit } = req.query;

    let doctors;
    if (query) {
      const searchQuery = query;
      const filters = {
        is_available: true,
        is_verified: true,
        limit: limit || 20
      };
      doctors = await search(searchQuery, filters);
    } else {
      doctors = await findAll({
        is_available: true,
        is_verified: true,
        specialty,
        hospital_id,
        min_rating,
        limit: limit || 20
      });
    }

    res.status(200).json({
      success: true,
      doctors
    });
  } catch (error) {
    console.error('Search doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search doctors'
    });
  }
};

exports.getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await findById(id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    if (doctor.hospital_id) {
      const hospital = await findHospitalById(doctor.hospital_id);
      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: 'Hospital not found'
        });
      }
    }

    const reviews = await Review.findByProviderId(id, 'doctor', { limit: 10 });

    res.status(200).json({
      success: true,
      doctor,
      reviews
    });
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor'
    });
  }
};

exports.getDoctorAppointments = async (req, res) => {
  try {
    const { status, date_from, date_to, limit } = req.query;

    const doctor = await findByUserId(req.user.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const appointments = await findByDoctorId(doctor.id, {
      status,
      date_from,
      date_to,
      limit: limit || 50
    });

    res.status(200).json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments'
    });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, prescription_url } = req.body;

    const doctor = await findByUserId(req.user.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const appointment = await findAppointmentById(id);
    if (!appointment || appointment.doctor_id !== doctor.id) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or not assigned to you'
      });
    }

    let updated;
    if (status === 'completed' && prescription_url) {
      updated = await complete(id, prescription_url);
      await incrementCompletedAppointments(doctor.id);
    } else {
      updated = await updateStatus(id, status);
    }

    res.status(200).json({
      success: true,
      message: 'Appointment status updated successfully',
      appointment: updated
    });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment status'
    });
  }
};

exports.getAvailability = async (req, res) => {
  try {
    const { date } = req.query;

    const doctor = await findByUserId(req.user.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const availability = await getDoctorAvailability(doctor.id, date);

    res.status(200).json({
      success: true,
      availability
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch availability'
    });
  }
};
