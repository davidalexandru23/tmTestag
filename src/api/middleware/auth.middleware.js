import ApiError from '../../utils/apiError.js';
import { verifyAccessToken } from '../../utils/token.js';

export const protectRoute = (req, _res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Lipsește header-ul de autorizare.');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new ApiError(401, 'Token-ul de acces este necesar.');
  }

  const payload = verifyAccessToken(token);
  req.user = { id: payload.userId };
  next();
};
