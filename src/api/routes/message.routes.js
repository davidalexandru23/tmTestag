import { Router } from 'express';
import { getDirectMessages, getConversations } from '../controllers/message.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protectRoute);
router.get('/conversations', getConversations);
router.get('/direct/:userId', getDirectMessages);

export default router;
