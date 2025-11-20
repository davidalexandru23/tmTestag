import { Router } from 'express';
import { getDirectMessages, getConversations, getWorkspaceMessages } from '../controllers/message.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protectRoute);
router.get('/conversations', getConversations);
router.get('/direct/:userId', getDirectMessages);
router.get('/workspace/:workspaceId', getWorkspaceMessages);

export default router;
