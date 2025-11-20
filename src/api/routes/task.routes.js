import { Router } from 'express';
import {
  createTask,
  listTasks,
  getTask,
  delegateTask,
  createSubTask,
  updateTaskStatus,
  getTaskLocations,
} from '../controllers/task.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protectRoute);

router.get('/locations', getTaskLocations);
router.post('/', createTask);
router.get('/', listTasks);
router.get('/:id', getTask);
router.post('/:id/delegate', delegateTask);
router.post('/:id/subtasks', createSubTask);
router.patch('/:id/status', updateTaskStatus);

export default router;
