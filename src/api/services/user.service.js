import prisma from '../../config/prisma.js';
import ApiError from '../../utils/apiError.js';

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 20;

export const searchUsers = async (query) => {
  const trimmedQuery = query?.trim();

  if (!trimmedQuery) {
    throw new ApiError(400, 'Parametrul q este obligatoriu.');
  }

  if (trimmedQuery.length < MIN_QUERY_LENGTH) {
    throw new ApiError(400, `Parametrul q trebuie să conțină cel puțin ${MIN_QUERY_LENGTH} caractere.`);
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: trimmedQuery, mode: 'insensitive' } },
        { email: { contains: trimmedQuery, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
    take: MAX_RESULTS,
  });

  return users;
};
