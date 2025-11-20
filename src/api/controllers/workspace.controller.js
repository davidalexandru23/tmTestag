import {
  createWorkspace as createWorkspaceService,
  listWorkspaces as listWorkspacesService,
  getWorkspace as getWorkspaceService,
  addWorkspaceMember as addWorkspaceMemberService,
  deleteWorkspace as deleteWorkspaceService,
} from '../services/workspace.service.js';

export const createWorkspace = async (req, res) => {
  const workspace = await createWorkspaceService(req.user.id, req.body);
  res.status(201).json(workspace);
};

export const listWorkspaces = async (req, res) => {
  const workspaces = await listWorkspacesService(req.user.id);
  res.status(200).json(workspaces);
};

export const getWorkspace = async (req, res) => {
  const workspace = await getWorkspaceService(req.user.id, req.params.id);
  res.status(200).json(workspace);
};

export const addWorkspaceMember = async (req, res) => {
  const member = await addWorkspaceMemberService(req.user.id, req.params.id, req.body.email);
  res.status(201).json(member);
};

export const deleteWorkspace = async (req, res) => {
  await deleteWorkspaceService(req.user.id, req.params.id);
  res.status(204).send();
};
