const { findAll, countAll, findById, getStatusHistory } = require('../models/Booking');
const Dispute = require('../models/Dispute');
const { parsePagination } = require('../utils/pagination');
const { writeAudit, listAuditLogs } = require('../utils/audit');
const { notifyUser } = require('../services/pushNotificationService');

exports.getAllBookings = async (req, res) => {
  try {
    const { status, date_from, date_to } = req.query;
    const { page, limit, offset } = parsePagination(req.query);
    const filters = { status, date_from, date_to, limit, offset };
    const [items, total] = await Promise.all([
      findAll(filters),
      countAll(filters)
    ]);
    return res.paginated(items, { page, limit, total }, 'Bookings fetched successfully');
  } catch (error) {
    console.error('Admin get bookings error:', error);
    return res.serverError('Failed to fetch bookings');
  }
};

exports.getBooking = async (req, res) => {
  try {
    const booking = await findById(req.params.id);
    if (!booking) return res.notFound('Booking not found');
    const history = await getStatusHistory(booking.id);

    const hasPhi =
      booking.medical_history ||
      booking.allergies ||
      booking.existing_conditions ||
      booking.current_medications ||
      booking.family_member_medical_history;

    if (hasPhi) {
      await writeAudit({
        actorId: req.user.id,
        action: 'ADMIN_PHI_ACCESS',
        entityType: 'booking',
        entityId: booking.id,
        meta: { path: 'admin/bookings/:id', requestId: req.requestId }
      });
    }

    return res.success({ ...booking, history }, 'Booking fetched successfully');
  } catch (error) {
    console.error('Admin get booking error:', error);
    return res.serverError('Failed to fetch booking');
  }
};

exports.listDisputes = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { items, total } = await Dispute.listAll({
      status: req.query.status,
      limit,
      offset
    });
    return res.paginated(items, { page, limit, total }, 'Disputes fetched successfully');
  } catch (error) {
    console.error('Admin list disputes error:', error);
    return res.serverError('Failed to fetch disputes');
  }
};

exports.updateDispute = async (req, res) => {
  try {
    const { status, resolution } = req.body;
    if (!status) return res.badRequest('status is required');
    if (!['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'].includes(status)) {
      return res.badRequest('status must be OPEN, IN_REVIEW, RESOLVED, or REJECTED');
    }

    const existing = await Dispute.findById(req.params.id);
    if (!existing) return res.notFound('Dispute not found');

    const updated = await Dispute.updateDispute(req.params.id, {
      status,
      resolution,
      resolvedBy: req.user.id
    });

    await writeAudit({
      actorId: req.user.id,
      action: 'DISPUTE_UPDATED',
      entityType: 'dispute',
      entityId: updated.id,
      meta: { status, resolution }
    });

    try {
      await notifyUser({
        userId: existing.raised_by,
        title: 'Dispute updated',
        body: `Your dispute on booking ${existing.booking_number} is now ${status}.`,
        type: 'DISPUTE_UPDATED',
        bookingId: existing.booking_id,
        referenceId: existing.id,
        referenceType: 'dispute'
      });
    } catch (e) {
      console.error('Dispute update notify failed:', e.message);
    }

    return res.success(updated, 'Dispute updated');
  } catch (error) {
    console.error('Admin update dispute error:', error);
    return res.serverError('Failed to update dispute');
  }
};

exports.listSafetyIncidents = async (req, res) => {
  try {
    const { parsePagination } = require('../utils/pagination');
    const { listIncidentsForAdmin } = require('../services/safetyIncidentService');
    const { page, limit } = parsePagination(req.query);
    const { items, total } = await listIncidentsForAdmin({
      status: req.query.status,
      page,
      limit
    });
    return res.paginated(items, { page, limit, total }, 'Safety incidents fetched');
  } catch (error) {
    console.error('List safety incidents error:', error);
    return res.serverError('Failed to list safety incidents');
  }
};

exports.updateSafetyIncident = async (req, res) => {
  try {
    const { resolveIncident } = require('../services/safetyIncidentService');
    const status = req.body?.status;
    if (!status) return res.badRequest('status is required');
    const updated = await resolveIncident({
      incidentId: req.params.id,
      admin: req.user,
      status,
      adminNote: req.body?.note || req.body?.admin_note || null,
      unfreezePayout: req.body?.unfreeze_payout === true || req.body?.unfreezePayout === true
    });
    return res.success(updated, 'Safety incident updated');
  } catch (error) {
    console.error('Update safety incident error:', error);
    if (error.statusCode) {
      return res.error(error.message, [], error.statusCode, error.code);
    }
    return res.serverError('Failed to update safety incident');
  }
};

exports.listAuditLogs = async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const { items, total } = await listAuditLogs({
      entityType: req.query.entity_type,
      entityId: req.query.entity_id,
      page,
      limit
    });
    return res.paginated(items, { page, limit, total }, 'Audit logs fetched successfully');
  } catch (error) {
    console.error('Admin audit logs error:', error);
    return res.serverError('Failed to fetch audit logs');
  }
};
