const {
  createAppointment,
  findAppointmentsByUserId,
  findAppointmentById,
  updateAppointment,
  cancelAppointment
} = require('../models/Appointment');
const { findDoctorById } = require('../models/Doctor');
const { findFamilyMemberByUserIdAndId } = require('../models/FamilyMember');
const { findHospitalById } = require('../models/Hospital');

exports.createAppointment = async (req, res) => {
  try {
    const {
      family_member_id, doctor_id, hospital_id,
      scheduled_date, appointment_type, symptoms, notes
    } = req.body;

    if (!doctor_id || !scheduled_date) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID and scheduled date are required'
      });
    }

    const doctor = await findDoctorById(doctor_id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    if (family_member_id) {
      const familyMember = await findFamilyMemberByUserIdAndId(req.user.id, family_member_id);
      if (!familyMember) {
        return res.status(404).json({
          success: false,
          message: 'Family member not found'
        });
      }
    }

    const appointment = await createAppointment({
      user_id: req.user.id,
      family_member_id,
      doctor_id,
      hospital_id,
      scheduled_date,
      appointment_type: appointment_type || 'in_person',
      consultation_fee: doctor.consultation_fee,
      symptoms,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      appointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create appointment'
    });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const { status, appointment_type, limit } = req.query;

    const appointments = await findAppointmentsByUserId(req.user.id, {
      status,
      appointment_type,
      limit: limit || 20
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

exports.getAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await findAppointmentById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointment.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment'
    });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      scheduled_date, appointment_type, symptoms, notes
    } = req.body;

    const appointment = await findAppointmentById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointment.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (appointment.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update confirmed or completed appointments'
      });
    }

    const updated = await updateAppointment(id, {
      scheduled_date,
      appointment_type,
      symptoms,
      notes
    });

    res.status(200).json({
      success: true,
      message: 'Appointment updated successfully',
      appointment: updated
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment'
    });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await findAppointmentById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointment.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel this appointment'
      });
    }

    await cancelAppointment(id);

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment'
    });
  }
};
