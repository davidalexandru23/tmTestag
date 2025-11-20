import prisma from '../../config/prisma.js';
import ApiError from '../../utils/apiError.js';

/**
 * Get workspace member locations
 * @param {string} userId - Current user ID
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<Array>} - Array of member locations
 */
export const getWorkspaceMemberLocations = async (userId, workspaceId) => {
    // Verify user is member of workspace
    const membership = await prisma.workspaceMember.findFirst({
        where: { userId, workspaceId },
    });

    if (!membership) {
        throw new ApiError(403, 'Nu aveți acces la acest workspace.');
    }

    // Get all members with their current locations
    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    latitude: true,
                    longitude: true,
                },
            },
        },
    });

    // Filter out members without location and format response
    return members
        .filter(m => m.user.latitude !== null && m.user.longitude !== null)
        .map(m => ({
            userId: m.user.id,
            name: m.user.name,
            email: m.user.email,
            latitude: m.user.latitude,
            longitude: m.user.longitude,
        }));
};
