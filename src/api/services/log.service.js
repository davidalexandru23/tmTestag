import prisma from '../../config/prisma.js';

export const listLogs = async (userId) => {
  return prisma.activityLog.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
  });
};
