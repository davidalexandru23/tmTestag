import { Router } from 'express';
import {
  createTask,
  listTasks,
  getTask,
  delegateTask,
  createSubTask,
  updateTaskStatus,
  getTaskLocations,
  updateTask,
  deleteTask,
  listWorkspaceTasks,
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
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.get('/workspace/:workspaceId', listWorkspaceTasks);

export default router;
