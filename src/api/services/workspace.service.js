import prisma from '../../config/prisma.js';
import ApiError from '../../utils/apiError.js';
import { Role } from '@prisma/client';

const ensureMembership = async (userId, workspaceId) => {
  return prisma.workspaceMember.findFirst({ where: { userId, workspaceId } });
};

export const createWorkspace = async (userId, { name }) => {
  if (!name) {
    throw new ApiError(400, 'Numele workspace-ului este obligatoriu.');
  }

  const workspace = await prisma.$transaction(async (tx) => {
    const createdWorkspace = await tx.workspace.create({ data: { name, ownerId: userId } });
    await tx.workspaceMember.create({
      data: {
        userId,
        workspaceId: createdWorkspace.id,
        role: Role.OWNER,
      },
    });
    return createdWorkspace;
  });

  return workspace;
};

export const listWorkspaces = async (userId) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: true,
    },
  });

  return memberships.map((membership) => ({
    id: membership.workspace.id,
    name: membership.workspace.name,
    ownerId: membership.workspace.ownerId,
    createdAt: membership.workspace.createdAt,
    role: membership.role,
  }));
};

export const getWorkspace = async (userId, workspaceId) => {
  const membership = await ensureMembership(userId, workspaceId);
  if (!membership) {
    throw new ApiError(403, 'Nu aveți acces la acest workspace.');
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  if (!workspace) {
    throw new ApiError(404, 'Workspace-ul nu există.');
  }

  return {
    id: workspace.id,
    name: workspace.name,
    ownerId: workspace.ownerId,
    members: workspace.members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
    })),
  };
};

export const addWorkspaceMember = async (requesterId, workspaceId, { userId, role }) => {
  if (!userId || !role) {
    throw new ApiError(400, 'userId și role sunt obligatorii.');
  }

  if (![Role.LEADER, Role.MEMBER].includes(role)) {
    throw new ApiError(400, 'Rol invalid.');
  }

  const requesterMembership = await ensureMembership(requesterId, workspaceId);
  if (!requesterMembership) {
    throw new ApiError(403, 'Nu aveți acces la acest workspace.');
  }

  if (![Role.OWNER, Role.LEADER].includes(requesterMembership.role)) {
    throw new ApiError(403, 'Nu aveți permisiunea de a adăuga membri.');
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    throw new ApiError(404, 'Utilizatorul nu există.');
  }

  const existing = await ensureMembership(userId, workspaceId);
  if (existing) {
    throw new ApiError(400, 'Utilizatorul este deja membru în acest workspace.');
  }

  const member = await prisma.workspaceMember.create({
    data: {
      userId,
      workspaceId,
      role,
    },
  });

  return {
    id: member.id,
    userId: member.userId,
    workspaceId: member.workspaceId,
    role: member.role,
  };
};
