import prisma from '../../config/prisma.js';
import ApiError from '../../utils/apiError.js';

/**
 * Get direct messages between two users
 * @param {string} userId1 - First user ID (current user)
 * @param {string} userId2 - Second user ID (other user)
 * @returns {Promise<Array>} - Array of messages
 */
export const getDirectMessages = async (userId1, userId2) => {
    const messages = await prisma.message.findMany({
        where: {
            OR: [
                { senderId: userId1, receiverId: userId2 },
                { senderId: userId2, receiverId: userId1 },
            ],
            workspaceId: null, // Only direct messages
        },
        include: {
            sender: {
                select: { id: true, name: true, email: true },
            },
        },
        orderBy: { createdAt: 'asc' },
    });

    return messages;
};

/**
 * Get list of conversations for a user
 * @param {string} userId - Current user ID
 * @returns {Promise<Array>} - Array of users with last message
 */
export const getConversationsList = async (userId) => {
    // Get all messages where user is sender or receiver
    const messages = await prisma.message.findMany({
        where: {
            OR: [
                { senderId: userId, workspaceId: null },
                { receiverId: userId, workspaceId: null },
            ],
        },
        include: {
            sender: {
                select: { id: true, name: true, email: true },
            },
            receiver: {
                select: { id: true, name: true, email: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Group by conversation partner
    const conversationsMap = new Map();

    for (const message of messages) {
        // Determine who the other user is
        const otherUser = message.senderId === userId ? message.receiver : message.sender;

        if (!otherUser) continue;

        // If we haven't seen this conversation yet, add it
        if (!conversationsMap.has(otherUser.id)) {
            conversationsMap.set(otherUser.id, {
                user: otherUser,
                lastMessage: message,
            });
        }
    }

    // Convert map to array
    return Array.from(conversationsMap.values());
};

/**
 * Save a direct message
 * @param {string} senderId - Sender user ID
 * @param {string} receiverId - Receiver user ID
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message
 */
export const saveDirectMessage = async (senderId, receiverId, content) => {
    const message = await prisma.message.create({
        data: {
            senderId,
            receiverId,
            content,
        },
        include: {
            sender: {
                select: { id: true, name: true, email: true },
            },
            receiver: {
                select: { id: true, name: true, email: true },
            },
        },
    });

    return message;
};

/**
 * Get messages for a workspace
 * @param {string} userId - Current user ID
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<Array>} - Array of messages
 */
export const getWorkspaceMessages = async (userId, workspaceId) => {
    // Verify membership (assuming middleware/controller handles basic auth, but good to check access)
    // For now, we trust the route protection or add a check here if needed.
    // Ideally, we should check if user is member of workspace.

    const messages = await prisma.message.findMany({
        where: { workspaceId },
        include: {
            sender: {
                select: { id: true, name: true, email: true },
            },
        },
        orderBy: { createdAt: 'asc' },
    });

    return messages;
};
