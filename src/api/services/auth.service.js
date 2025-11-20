import bcrypt from 'bcrypt';
import prisma from '../../config/prisma.js';
import ApiError from '../../utils/apiError.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiryDate,
} from '../../utils/token.js';

const SALT_ROUNDS = 10;

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const persistRefreshToken = async (userId, token) => {
  await prisma.refreshToken.deleteMany({ where: { userId } });
  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt: getRefreshTokenExpiryDate(),
    },
  });
};

export const register = async ({ name, email, password, role }) => {
  if (!name || !email || !password) {
    throw new ApiError(400, 'Nume, email și parolă sunt obligatorii.');
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ApiError(409, 'Email-ul este deja folosit.');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: role || 'MEMBER',
    },
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  await persistRefreshToken(user.id, refreshToken);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

export const login = async ({ email, password }) => {
  if (!email || !password) {
    throw new ApiError(400, 'Email și parolă sunt obligatorii.');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(401, 'Credențiale invalide.');
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new ApiError(401, 'Credențiale invalide.');
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  await persistRefreshToken(user.id, refreshToken);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

export const refreshAccessToken = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token-ul este obligatoriu.');
  }

  const payload = verifyRefreshToken(refreshToken);
  const storedToken = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

  if (!storedToken || storedToken.userId !== payload.userId) {
    throw new ApiError(403, 'Refresh token invalid sau expirat.');
  }

  if (storedToken.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    throw new ApiError(403, 'Refresh token invalid sau expirat.');
  }

  const accessToken = generateAccessToken(payload.userId);
  return { accessToken };
};

export const logout = async ({ userId, refreshToken }) => {
  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token-ul este obligatoriu.');
  }

  await prisma.refreshToken.deleteMany({ where: { userId, token: refreshToken } });
};
