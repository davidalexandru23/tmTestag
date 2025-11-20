import { searchUsers as searchUsersService, getUserById } from '../services/user.service.js';

export const searchUsers = async (req, res) => {
  const users = await searchUsersService(req.query.q);
  res.status(200).json(users);
};

export const getCurrentUser = async (req, res) => {
  const user = await getUserById(req.user.id);
  res.status(200).json(user);
};
