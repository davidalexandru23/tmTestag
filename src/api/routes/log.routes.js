import { Router } from 'express';
import { listLogs } from '../controllers/log.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protectRoute);
router.get('/', listLogs);

export default router;
