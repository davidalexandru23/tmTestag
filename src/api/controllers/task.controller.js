import {
  createTask as createTaskService,
  listTasks as listTasksService,
  getTaskById,
  delegateTask as delegateTaskService,
  createSubTask as createSubTaskService,
  updateTaskStatus as updateTaskStatusService,
  getTaskLocations as getTaskLocationsService,
  updateTask as updateTaskService,
  deleteTask as deleteTaskService,
  listWorkspaceTasks as listWorkspaceTasksService,
} from '../services/task.service.js';

export const createTask = async (req, res) => {
  const task = await createTaskService(req.user.id, req.body);
  res.status(201).json(task);
};

export const listTasks = async (req, res) => {
  const tasks = await listTasksService(req.user.id, req.query.filter);
  res.status(200).json(tasks);
};

export const getTask = async (req, res) => {
  const task = await getTaskById(req.user.id, req.params.id);
  res.status(200).json(task);
};

export const delegateTask = async (req, res) => {
  const updatedTask = await delegateTaskService(req.user.id, req.params.id, req.body.newAssigneeId);
  res.status(200).json(updatedTask);
};

export const createSubTask = async (req, res) => {
  const subTask = await createSubTaskService(req.user.id, req.params.id, req.body);
  res.status(201).json(subTask);
};

export const updateTaskStatus = async (req, res) => {
  const task = await updateTaskStatusService(req.user.id, req.params.id, req.body.status);
  res.status(200).json(task);
};

export const getTaskLocations = async (req, res) => {
  const locations = await getTaskLocationsService(req.user.id);
  res.status(200).json(locations);
};

export const updateTask = async (req, res) => {
  const task = await updateTaskService(req.user.id, req.params.id, req.body);
  res.status(200).json(task);
};

export const deleteTask = async (req, res) => {
  await deleteTaskService(req.user.id, req.params.id);
  res.status(204).send();
};

export const listWorkspaceTasks = async (req, res) => {
  const tasks = await listWorkspaceTasksService(req.user.id, req.params.workspaceId);
  res.status(200).json(tasks);
};
