import { searchUsers as searchUsersService } from '../services/user.service.js';

export const searchUsers = async (req, res) => {
  const users = await searchUsersService(req.query.q);
  res.status(200).json(users);
};
