const {
  createConversation,
  findConversationByUserId,
  findAllConversationsForAdmin,
  findConversationById,
  updateConversation,
  assignAdminToConversation,
  updateConversationStatus,
  countConversationsForAdmin,
  getUnreadCountForUser,
  getUnreadCountForAdmin
} = require('../models/Conversation');
const { parsePagination } = require('../utils/pagination');

// User creates a new conversation
exports.createConversation = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const user_id = req.user.id;

    // Check if user already has an active conversation
    const existingConversations = await findConversationByUserId(user_id);
    const activeConversation = existingConversations.find(c => c.status === 'active');

    if (activeConversation) {
      return res.badRequest('You already have an active conversation. Please continue the existing one.');
    }

    const conversation = await createConversation({
      user_id,
      subject,
      status: 'active'
    });

    return res.success(conversation, 'Conversation created successfully');
  } catch (error) {
    console.error('Create conversation error:', error);
    return res.serverError('Failed to create conversation');
  }
};

// User gets their conversations
exports.getUserConversations = async (req, res) => {
  try {
    const conversations = await findConversationByUserId(req.user.id);
    const unreadCount = await getUnreadCountForUser(req.user.id);

    return res.success(conversations, 'Conversations fetched successfully', { unreadCount });
  } catch (error) {
    console.error('Get user conversations error:', error);
    return res.serverError('Failed to fetch conversations');
  }
};

// Admin gets all conversations
exports.getAllConversations = async (req, res) => {
  try {
    const { status, user_role } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const [conversations, total, unreadCount] = await Promise.all([
      findAllConversationsForAdmin({ status, user_role, limit, offset }),
      countConversationsForAdmin({ status, user_role }),
      getUnreadCountForAdmin()
    ]);

    return res.paginated(conversations, { page, limit, total }, 'Conversations fetched successfully', { unreadCount });
  } catch (error) {
    console.error('Get all conversations error:', error);
    return res.serverError('Failed to fetch conversations');
  }
};

// Get single conversation by ID
exports.getConversationById = async (req, res) => {
  try {
    const conversation = await findConversationById(req.params.conversation_id);

    if (!conversation) {
      return res.notFound('Conversation not found');
    }

    return res.success(conversation, 'Conversation fetched successfully');
  } catch (error) {
    console.error('Get conversation error:', error);
    return res.serverError('Failed to fetch conversation');
  }
};

// Admin assigns themselves to a conversation
exports.assignAdmin = async (req, res) => {
  try {
    const { admin_id } = req.body;
    const conversationId = req.params.conversation_id;

    const conversation = await findConversationById(conversationId);
    if (!conversation) {
      return res.notFound('Conversation not found');
    }

    const updated = await assignAdminToConversation(conversationId, admin_id || req.user.id);
    return res.success(updated, 'Admin assigned successfully');
  } catch (error) {
    console.error('Assign admin error:', error);
    return res.serverError('Failed to assign admin');
  }
};

// Update conversation status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const conversationId = req.params.conversation_id;

    const conversation = await findConversationById(conversationId);
    if (!conversation) {
      return res.notFound('Conversation not found');
    }

    const updated = await updateConversationStatus(conversationId, status);
    return res.success(updated, 'Conversation status updated successfully');
  } catch (error) {
    console.error('Update status error:', error);
    return res.serverError('Failed to update conversation status');
  }
};

// Get unread count for current user
exports.getUnreadCount = async (req, res) => {
  try {
    let unreadCount;
    
    if (req.user.role === 'ADMIN') {
      unreadCount = await getUnreadCountForAdmin();
    } else {
      unreadCount = await getUnreadCountForUser(req.user.id);
    }

    return res.success({ unreadCount }, 'Unread count fetched successfully');
  } catch (error) {
    console.error('Get unread count error:', error);
    return res.serverError('Failed to fetch unread count');
  }
};
