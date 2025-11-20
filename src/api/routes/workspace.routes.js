import { Router } from 'express';
import {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  addWorkspaceMember,
} from '../controllers/workspace.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protectRoute);

router.post('/', createWorkspace);
router.get('/', listWorkspaces);
router.get('/:id', getWorkspace);
router.post('/:id/members', addWorkspaceMember);

export default router;
