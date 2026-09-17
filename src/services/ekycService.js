const { findById, updateEkyc, findByEkycReference } = require('../models/User');
const {
  getCaregiverProfileByUserId,
  updateCaregiverEkyc
} = require('../models/CaregiverProfile');
const EkycSession = require('../models/EkycSession');
const diditService = require('./diditService');
const diditConfig = require('../config/didit');
const { writeAudit } = require('../utils/audit');
const { notifyUser } = require('./pushNotificationService');

const presentSession = (user, session) => ({
  ekyc_status: Boolean(user?.ekyc_status),
  ekyc_verified_at: user?.ekyc_verified_at || null,
  ekyc_reference_id: user?.ekyc_reference_id || session?.session_id || null,
  ekyc_session_status: user?.ekyc_session_status || session?.status || null,
  session_id: session?.session_id || user?.ekyc_reference_id || null,
  verification_url: session?.verification_url || null,
  session_token: session?.session_token || null
});

const applyDiditStatus = async ({
  userId,
  sessionId,
  status,
  eventId = null,
  actorId = null
}) => {
  if (!userId || !status) return null;

  const user = await findById(userId);
  if (!user) return null;

  let ekycStatus = user.ekyc_status;
  if (status === diditService.APPROVED_STATUS) {
    ekycStatus = true;
  } else if (diditService.NEGATIVE_STATUSES.has(status)) {
    ekycStatus = false;
  }

  const verifiedAt = ekycStatus === true
    ? (user.ekyc_verified_at || new Date())
    : (ekycStatus === false ? null : user.ekyc_verified_at);

  const updatedUser = await updateEkyc(userId, {
    ekyc_status: ekycStatus,
    ekyc_verified_at: verifiedAt,
    ekyc_reference_id: sessionId || user.ekyc_reference_id,
    ekyc_session_status: status
  });

  if (sessionId) {
    const existing = await EkycSession.findBySessionId(sessionId);
    if (existing) {
      await EkycSession.updateStatus(sessionId, { status, lastEventId: eventId });
    } else {
      await EkycSession.upsertSession({
        userId,
        sessionId,
        status,
        vendorData: String(userId)
      });
    }
  }

  const profile = await getCaregiverProfileByUserId(userId);
  if (profile) {
    const verificationStatus = status === diditService.APPROVED_STATUS
      && profile.verification_status !== 'SUSPENDED'
      ? 'APPROVED'
      : undefined;

    await updateCaregiverEkyc(profile.id, {
      ekyc_status: ekycStatus,
      ekyc_verified_at: verifiedAt,
      ekyc_reference_id: sessionId || user.ekyc_reference_id,
      ekyc_session_status: status,
      verification_status: verificationStatus
    });
  }

  await writeAudit({
    actorId: actorId || userId,
    action: `EKYC_${String(status).toUpperCase().replace(/\s+/g, '_')}`,
    entityType: 'user',
    entityId: userId,
    meta: { session_id: sessionId, status }
  });

  const previousStatus = user.ekyc_session_status;
  if (previousStatus !== status) {
    await notifyEkycStatus(updatedUser || user, status, sessionId);
  }

  return updatedUser;
};

const notifyEkycStatus = async (user, status, sessionId) => {
  if (status !== diditService.APPROVED_STATUS && !diditService.NEGATIVE_STATUSES.has(status)) {
    return;
  }

  const bn = user.language_preference === 'bn';
  const approved = status === diditService.APPROVED_STATUS;

  try {
    await notifyUser({
      userId: user.id,
      title: approved
        ? (bn ? 'অ্যাকাউন্ট ভেরিফাই হয়েছে' : 'Identity verified')
        : (bn ? 'ভেরিফিকেশন ব্যর্থ' : 'Verification declined'),
      body: approved
        ? (bn
          ? 'আপনার কেয়ারগিভার অ্যাকাউন্ট অনুমোদিত হয়েছে। এখন হোম থেকে কাজ শুরু করতে পারেন।'
          : 'Your caregiver account is approved. You can continue to Home.')
        : (bn
          ? 'আপনার পরিচয় যাচাই অনুমোদিত হয়নি। আবার চেষ্টা করুন।'
          : 'Your identity verification was not approved. Please try again.'),
      type: approved ? 'EKYC_APPROVED' : 'EKYC_DECLINED',
      referenceId: sessionId,
      referenceType: 'ekyc',
      extraData: {
        screen: approved ? 'HOME' : 'EKYC',
        ekyc_status: approved ? 'true' : 'false',
        ekyc_session_status: status,
        session_id: sessionId || ''
      }
    });
  } catch (error) {
    console.error('eKYC notify failed:', error.message);
  }
};

const resolveUserFromWebhook = async (payload) => {
  const isUuid = (value) =>
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

  if (isUuid(payload?.vendor_data)) {
    const user = await findById(payload.vendor_data);
    if (user) return user;
  }

  if (payload?.session_id) {
    const session = await EkycSession.findBySessionId(payload.session_id);
    if (session) {
      const user = await findById(session.user_id);
      if (user) return user;
    }
    return findByEkycReference(payload.session_id);
  }

  return null;
};

const initiateForCaregiver = async (user, { redirectUrl, reverify = false } = {}) => {
  const latest = await EkycSession.findLatestByUserId(user.id);

  if (user.ekyc_status === true && !reverify) {
    return {
      alreadyVerified: true,
      data: presentSession(user, latest)
    };
  }

  if (
    !reverify &&
    latest &&
    latest.verification_url &&
    diditService.OPEN_STATUSES.has(latest.status)
  ) {
    return {
      alreadyVerified: false,
      reused: true,
      data: {
        ...presentSession(user, latest),
        verification_url: latest.verification_url,
        session_id: latest.session_id,
        reference_id: latest.session_id,
        session_token: latest.session_token,
        status: latest.status
      }
    };
  }

  const callback = redirectUrl || diditConfig.callbackUrl || undefined;
  const session = await diditService.createSession({
    vendorData: user.id,
    callback,
    email: user.email,
    language: user.language_preference,
    metadata: { role: 'CAREGIVER' }
  });

  const saved = await EkycSession.upsertSession({
    userId: user.id,
    sessionId: session.session_id,
    sessionToken: session.session_token,
    verificationUrl: session.url,
    status: session.status || 'Not Started',
    vendorData: String(user.id)
  });

  await updateEkyc(user.id, {
    ekyc_reference_id: session.session_id,
    ekyc_session_status: saved.status
  });

  const profile = await getCaregiverProfileByUserId(user.id);
  if (profile) {
    await updateCaregiverEkyc(profile.id, {
      ekyc_reference_id: session.session_id,
      ekyc_session_status: saved.status
    });
  }

  const freshUser = await findById(user.id);

  return {
    alreadyVerified: false,
    reused: false,
    data: {
      ...presentSession(freshUser, saved),
      verification_url: saved.verification_url,
      session_id: saved.session_id,
      reference_id: saved.session_id,
      session_token: saved.session_token,
      status: saved.status
    }
  };
};

const getStatusForCaregiver = async (user) => {
  let session = await EkycSession.findLatestByUserId(user.id);
  const sessionId = session?.session_id || user.ekyc_reference_id;

  if (sessionId && (!user.ekyc_status || diditService.OPEN_STATUSES.has(user.ekyc_session_status))) {
    try {
      const decision = await diditService.getDecision(sessionId);
      if (decision?.status && decision.status !== user.ekyc_session_status) {
        await applyDiditStatus({
          userId: user.id,
          sessionId,
          status: decision.status
        });
        user = await findById(user.id);
        session = await EkycSession.findBySessionId(sessionId) || session;
      } else if (decision?.session_url && session && !session.verification_url) {
        session = await EkycSession.upsertSession({
          userId: user.id,
          sessionId,
          verificationUrl: decision.session_url,
          status: decision.status || session.status,
          vendorData: String(user.id)
        });
      }
    } catch (error) {
      console.error('Didit status refresh failed:', error.message);
    }
  }

  return presentSession(user, session);
};

const handleWebhook = async (payload, { trustedDecision = true } = {}) => {
  const type = payload?.webhook_type;
  if (type && type !== 'status.updated' && type !== 'data.updated') {
    return { ignored: true };
  }

  const claimed = await EkycSession.claimWebhookEvent({
    eventId: payload?.event_id,
    sessionId: payload?.session_id,
    webhookType: type
  });
  if (!claimed) {
    return { duplicate: true };
  }

  let status = payload?.status;
  const sessionId = payload?.session_id;

  if (!trustedDecision && sessionId) {
    const decision = await diditService.getDecision(sessionId);
    status = decision?.status || status;
  }

  if (!status || !sessionId) {
    return { ignored: true };
  }

  const user = await resolveUserFromWebhook(payload);
  if (!user) {
    console.warn('Didit webhook user not found', { sessionId, vendor_data: payload.vendor_data });
    return { userMissing: true };
  }

  await applyDiditStatus({
    userId: user.id,
    sessionId,
    status,
    eventId: payload.event_id
  });

  return { processed: true, userId: user.id, status };
};

const syncProfileFromUser = async (userId) => {
  const user = await findById(userId);
  const profile = await getCaregiverProfileByUserId(userId);
  if (!user || !profile) return profile;

  if (!user.ekyc_reference_id && !user.ekyc_status) return profile;

  return updateCaregiverEkyc(profile.id, {
    ekyc_status: user.ekyc_status,
    ekyc_verified_at: user.ekyc_verified_at,
    ekyc_reference_id: user.ekyc_reference_id,
    ekyc_session_status: user.ekyc_session_status,
    verification_status: user.ekyc_status && profile.verification_status !== 'SUSPENDED'
      ? 'APPROVED'
      : undefined
  });
};

module.exports = {
  presentSession,
  applyDiditStatus,
  initiateForCaregiver,
  getStatusForCaregiver,
  handleWebhook,
  syncProfileFromUser
};
