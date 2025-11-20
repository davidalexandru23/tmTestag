import { getDirectMessages as getDirectMessagesService, getConversationsList as getConversationsListService, getWorkspaceMessages as getWorkspaceMessagesService } from '../services/message.service.js';

export const getDirectMessages = async (req, res) => {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    const messages = await getDirectMessagesService(currentUserId, otherUserId);
    res.status(200).json(messages);
};

export const getConversations = async (req, res) => {
    const currentUserId = req.user.id;

    const conversations = await getConversationsListService(currentUserId);
    res.status(200).json(conversations);
};

export const getWorkspaceMessages = async (req, res) => {
    const currentUserId = req.user.id;
    const workspaceId = req.params.workspaceId;

    const messages = await getWorkspaceMessagesService(currentUserId, workspaceId);
    res.status(200).json(messages);
};
