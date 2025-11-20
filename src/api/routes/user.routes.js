import { Router } from 'express';
import { searchUsers, getCurrentUser } from '../controllers/user.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protectRoute);
router.get('/me', getCurrentUser);
router.get('/', searchUsers);

export default router;
