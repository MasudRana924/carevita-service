const PrivacyPolicy = require('../models/PrivacyPolicy');
const { writeAudit } = require('../utils/audit');

const normalizeAudience = (raw) => String(raw || '').trim().toUpperCase();

/** Public: registration screens — GET /privacy-policies/:audience */
exports.getPublicByAudience = async (req, res) => {
  try {
    const audience = normalizeAudience(req.params.audience);
    if (!PrivacyPolicy.AUDIENCES.includes(audience)) {
      return res.badRequest('audience must be USER or CAREGIVER');
    }

    const policy = await PrivacyPolicy.findByAudience(audience, { publishedOnly: true });
    if (!policy) {
      return res.notFound('Privacy policy not found for this audience');
    }

    return res.success(
      {
        id: policy.id,
        audience: policy.audience,
        title: policy.title,
        content: policy.content,
        version: policy.version,
        updated_at: policy.updated_at
      },
      'Privacy policy fetched successfully'
    );
  } catch (error) {
    console.error('Public get privacy policy error:', error);
    return res.serverError('Failed to fetch privacy policy');
  }
};

/** Public: optional list of published policies — GET /privacy-policies */
exports.listPublic = async (req, res) => {
  try {
    const rows = await PrivacyPolicy.listAll({ publishedOnly: true });
    return res.success(
      rows.map((p) => ({
        id: p.id,
        audience: p.audience,
        title: p.title,
        content: p.content,
        version: p.version,
        updated_at: p.updated_at
      })),
      'Privacy policies fetched successfully'
    );
  } catch (error) {
    console.error('Public list privacy policies error:', error);
    return res.serverError('Failed to fetch privacy policies');
  }
};

/** Admin: list all (incl. unpublished) — GET /admin/privacy-policies */
exports.adminList = async (req, res) => {
  try {
    const items = await PrivacyPolicy.listAll({ publishedOnly: false });
    return res.success(items, 'Privacy policies fetched successfully');
  } catch (error) {
    console.error('Admin list privacy policies error:', error);
    return res.serverError('Failed to fetch privacy policies');
  }
};

/**
 * Admin: create or update policy for USER | CAREGIVER
 * PUT /admin/privacy-policies
 * Body: { audience, title, content, version?, is_published? }
 */
exports.adminUpsert = async (req, res) => {
  try {
    const audience = normalizeAudience(req.body.audience);
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    const version = req.body.version != null ? String(req.body.version).trim() : '1.0';
    const isPublished =
      req.body.is_published === undefined ? true : Boolean(req.body.is_published);

    if (!PrivacyPolicy.AUDIENCES.includes(audience)) {
      return res.badRequest('audience must be USER or CAREGIVER (NURSE uses CAREGIVER)');
    }
    if (!title) return res.badRequest('title is required');
    if (!content) return res.badRequest('content is required');
    if (content.length > 200000) {
      return res.badRequest('content is too long (max 200000 characters)');
    }

    const existing = await PrivacyPolicy.findByAudience(audience);
    const policy = await PrivacyPolicy.upsert({
      audience,
      title,
      content,
      version,
      isPublished,
      actorId: req.user.id
    });

    await writeAudit({
      actorId: req.user.id,
      action: existing ? 'PRIVACY_POLICY_UPDATED' : 'PRIVACY_POLICY_CREATED',
      entityType: 'privacy_policy',
      entityId: policy.id,
      meta: { audience, version: policy.version, is_published: policy.is_published }
    });

    return existing
      ? res.success(policy, 'Privacy policy updated successfully')
      : res.created(policy, 'Privacy policy created successfully');
  } catch (error) {
    console.error('Admin upsert privacy policy error:', error);
    return res.serverError('Failed to save privacy policy');
  }
};
