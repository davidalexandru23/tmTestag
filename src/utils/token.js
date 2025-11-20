import jwt from 'jsonwebtoken';
import ApiError from './apiError.js';

const ACCESS_EXPIRES_IN = '30m';
const REFRESH_EXPIRES_IN = '7d';

export const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(401, 'Token-ul de acces este invalid sau expirat.');
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(403, 'Refresh token invalid sau expirat.');
  }
};

export const getRefreshTokenExpiryDate = () => {
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  return expires;
};
