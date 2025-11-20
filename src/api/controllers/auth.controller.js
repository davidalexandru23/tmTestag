import {
  register as registerService,
  login as loginService,
  refreshAccessToken,
  logout as logoutService,
} from '../services/auth.service.js';

export const register = async (req, res) => {
  const result = await registerService(req.body);
  res.status(201).json(result);
};

export const login = async (req, res) => {
  const result = await loginService(req.body);
  res.status(200).json(result);
};

export const refresh = async (req, res) => {
  const result = await refreshAccessToken(req.body);
  res.status(200).json(result);
};

export const logout = async (req, res) => {
  await logoutService({ userId: req.user.id, refreshToken: req.body.refreshToken });
  res.status(204).send();
};
