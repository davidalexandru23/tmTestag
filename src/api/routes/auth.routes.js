import { Router } from 'express';
import { register, login, refresh, logout, changePassword } from '../controllers/auth.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', protectRoute, logout);
router.post('/change-password', protectRoute, changePassword);

export default router;
