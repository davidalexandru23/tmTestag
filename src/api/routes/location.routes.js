import { Router } from 'express';
import { getWorkspaceMemberLocations } from '../controllers/location.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protectRoute);
router.get('/workspaces/:workspaceId/members', getWorkspaceMemberLocations);

export default router;
