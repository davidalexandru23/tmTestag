import { getDirectMessages as getDirectMessagesService, getConversationsList as getConversationsListService } from '../services/message.service.js';

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
