import { Router } from 'express';
import { searchUsers } from '../controllers/user.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protectRoute);
router.get('/', searchUsers);

export default router;
