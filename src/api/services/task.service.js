import prisma from '../../config/prisma.js';
import ApiError from '../../utils/apiError.js';
import { Role, Status } from '@prisma/client';

const ensureWorkspaceMember = async (userId, workspaceId) => {
  return prisma.workspaceMember.findFirst({ where: { userId, workspaceId } });
};

const requireWorkspaceMembership = async (userId, workspaceId) => {
  const membership = await ensureWorkspaceMember(userId, workspaceId);
  if (!membership) {
    throw new ApiError(403, 'Nu aveți acces la acest workspace.');
  }
  return membership;
};

const ensureAssigneeMembership = async (userId, workspaceId) => {
  const membership = await ensureWorkspaceMember(userId, workspaceId);
  if (!membership) {
    throw new ApiError(400, 'Utilizatorul nu este membru al workspace-ului.');
  }
};

const validateDueDate = (dueDate) => {
  if (!dueDate) return null;
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, 'dueDate este invalid.');
  }
  return parsed;
};

const getDueDateFilter = (filter) => {
  const now = new Date();
  if (filter === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (filter === 'week') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  return null;
};

const createActivityLogs = async (userIds, actorName, action) => {
  if (!userIds?.length) return;
  await prisma.activityLog.createMany({
    data: userIds.map((userId) => ({ userId, actorName, action })),
  });
};

const hydrateDelegationChain = async (delegationChain) => {
  if (!delegationChain?.length) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: delegationChain } },
    select: { id: true, name: true },
  });
  const map = users.reduce((acc, user) => acc.set(user.id, user.name), new Map());
  return delegationChain.map((id) => ({ id, name: map.get(id) || 'Utilizator necunoscut' }));
};

const includeAssignments = {
  assignments: {
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
  },
};

export const createTask = async (userId, payload) => {
  const { workspaceId, title, description, dueDate, assigneeId, latitude, longitude } = payload;

  if (!title) {
    throw new ApiError(400, 'title este obligatoriu.');
  }

  // If workspace is provided, validate memberships
  if (workspaceId) {
    await requireWorkspaceMembership(userId, workspaceId);

    if (assigneeId) {
      await ensureAssigneeMembership(assigneeId, workspaceId);
    }
  }

  const parsedDueDate = validateDueDate(dueDate);

  const task = await prisma.$transaction(async (tx) => {
    const taskData = {
      title,
      description,
      dueDate: parsedDueDate,
      creatorId: userId,
      latitude,
      longitude,
    };

    // Add workspace-specific fields if workspace is provided
    if (workspaceId) {
      taskData.workspaceId = workspaceId;
      taskData.delegationChain = assigneeId ? [userId, assigneeId] : [userId];
    } else {
      taskData.delegationChain = [userId]; // Personal task
    }

    const createdTask = await tx.task.create({
      data: taskData,
    });

    // Create assignment only if assignee is provided
    if (assigneeId) {
      await tx.taskAssignment.create({
        data: {
          taskId: createdTask.id,
          assigneeId,
        },
      });
    }

    return createdTask;
  });

  return task;
};

export const listTasks = async (userId, filter) => {
  if (filter === 'delegated') {
    const tasks = await prisma.task.findMany({
      where: {
        creatorId: userId,
        assignments: {
          some: {
            assigneeId: { not: userId },
          },
        },
      },
      include: includeAssignments,
      orderBy: { createdAt: 'desc' },
    });
    return tasks;
  }

  const dueDateFilter = getDueDateFilter(filter);

  const tasks = await prisma.task.findMany({
    where: {
      assignments: {
        some: { assigneeId: userId },
      },
      ...(dueDateFilter ? { dueDate: dueDateFilter } : {}),
    },
    include: includeAssignments,
    orderBy: { createdAt: 'desc' },
  });

  return tasks;
};

export const getTaskById = async (userId, taskId) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      subTasks: {
        include: includeAssignments,
      },
      ...includeAssignments,
    },
  });

  if (!task) {
    throw new ApiError(404, 'Task-ul nu există.');
  }

  // For workspace tasks, check membership. For personal tasks, check creator/assignee
  if (task.workspaceId) {
    await requireWorkspaceMembership(userId, task.workspaceId);
  } else {
    // Personal task - user must be creator or assignee
    const isCreator = task.creatorId === userId;
    const isAssignee = task.assignments.some(a => a.assigneeId === userId);
    if (!isCreator && !isAssignee) {
      throw new ApiError(403, 'Nu aveți acces la acest task.');
    }
  }

  const delegationChain = await hydrateDelegationChain(task.delegationChain);

  return {
    ...task,
    delegationChain,
  };
};

export const delegateTask = async (userId, taskId, newAssigneeId) => {
  if (!newAssigneeId) {
    throw new ApiError(400, 'newAssigneeId este obligatoriu.');
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: includeAssignments,
  });

  if (!task) {
    throw new ApiError(404, 'Task-ul nu există.');
  }

  const currentAssignment = task.assignments.find((assignment) => assignment.assigneeId === userId);
  if (!currentAssignment) {
    throw new ApiError(403, 'Doar persoana asignată poate delega sarcina.');
  }

  if (task.delegationCount >= 3) {
    throw new ApiError(400, 'Limita de delegare (3) a fost atinsă.');
  }

  if (task.delegationChain.includes(newAssigneeId)) {
    throw new ApiError(400, 'Utilizatorul este deja în lanțul de delegare.');
  }

  await ensureAssigneeMembership(newAssigneeId, task.workspaceId);

  const updatedChain = [...task.delegationChain, newAssigneeId];

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: taskId },
      data: {
        delegationChain: { push: newAssigneeId },
        delegationCount: { increment: 1 },
      },
    });

    await tx.taskAssignment.delete({ where: { id: currentAssignment.id } });

    await tx.taskAssignment.create({
      data: {
        taskId,
        assigneeId: newAssigneeId,
      },
    });
  });

  const [actor, newAssignee] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: newAssigneeId }, select: { name: true } }),
  ]);

  await createActivityLogs(
    updatedChain,
    actor?.name || 'Sistem',
    `${actor?.name || 'Sistem'} a delegat sarcina '${task.title}' către ${newAssignee?.name || 'un coleg'}.`
  );

  const updatedTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: includeAssignments,
  });

  return updatedTask;
};

export const createSubTask = async (userId, parentTaskId, payload) => {
  const { title, assigneeId, description, dueDate } = payload;
  if (!title || !assigneeId) {
    throw new ApiError(400, 'title și assigneeId sunt obligatorii.');
  }

  const parentTask = await prisma.task.findUnique({ where: { id: parentTaskId } });
  if (!parentTask) {
    throw new ApiError(404, 'Task-ul părinte nu există.');
  }

  const membership = await requireWorkspaceMembership(userId, parentTask.workspaceId);
  if (![Role.OWNER, Role.LEADER].includes(membership.role)) {
    throw new ApiError(403, 'Doar OWNER sau LEADER pot crea sub-sarcini.');
  }

  await ensureAssigneeMembership(assigneeId, parentTask.workspaceId);

  const parsedDueDate = validateDueDate(dueDate);

  const subTask = await prisma.$transaction(async (tx) => {
    const createdTask = await tx.task.create({
      data: {
        title,
        description,
        dueDate: parsedDueDate,
        creatorId: userId,
        workspaceId: parentTask.workspaceId,
        parentId: parentTaskId,
        delegationChain: [userId, assigneeId],
      },
    });

    await tx.taskAssignment.create({
      data: {
        taskId: createdTask.id,
        assigneeId,
      },
    });

    return createdTask;
  });

  return subTask;
};

export const updateTaskStatus = async (userId, taskId, status) => {
  if (!status) {
    throw new ApiError(400, 'status este obligatoriu.');
  }

  if (!Object.values(Status).includes(status)) {
    throw new ApiError(400, 'Status invalid.');
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: includeAssignments,
  });

  if (!task) {
    throw new ApiError(404, 'Task-ul nu există.');
  }

  // For workspace tasks, check membership. For personal tasks, user must be assigned
  if (task.workspaceId) {
    await requireWorkspaceMembership(userId, task.workspaceId);
  }

  const currentAssignment = task.assignments.find((assignment) => assignment.assigneeId === userId);
  if (!currentAssignment) {
    throw new ApiError(403, 'Doar persoana asignată poate actualiza status-ul.');
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { status },
    include: includeAssignments,
  });

  const actor = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const action =
    status === Status.DONE
      ? `${actor?.name || 'Sistem'} a finalizat sarcina '${task.title}'.`
      : `${actor?.name || 'Sistem'} a actualizat sarcina '${task.title}' la status-ul ${status}.`;
  await createActivityLogs(task.delegationChain, actor?.name || 'Sistem', action);

  if (status === Status.DONE && task.parentId) {
    const [totalSubTasks, doneSubTasks] = await Promise.all([
      prisma.task.count({ where: { parentId: task.parentId } }),
      prisma.task.count({ where: { parentId: task.parentId, status: Status.DONE } }),
    ]);

    if (totalSubTasks > 0 && totalSubTasks === doneSubTasks) {
      const parentTask = await prisma.task.update({ where: { id: task.parentId }, data: { status: Status.DONE } });
      await createActivityLogs(
        parentTask.delegationChain,
        actor?.name || 'Sistem',
        `${actor?.name || 'Sistem'} a finalizat sarcina '${parentTask.title}'.`
      );
    }
  }

  return updatedTask;
};

export const getTaskLocations = async (userId) => {
  const tasks = await prisma.task.findMany({
    where: {
      workspace: {
        members: {
          some: { userId },
        },
      },
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      title: true,
      latitude: true,
      longitude: true,
      status: true,
      assignments: {
        include: {
          assignee: { select: { name: true } },
        },
      },
    },
  });
  return tasks;
};

export const updateTask = async (userId, taskId, payload) => {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new ApiError(404, 'Task-ul nu există.');

  // For personal tasks, only creator can edit. For workspace tasks, check permissions
  if (task.workspaceId) {
    const membership = await requireWorkspaceMembership(userId, task.workspaceId);
    if (![Role.OWNER, Role.LEADER].includes(membership.role) && task.creatorId !== userId) {
      throw new ApiError(403, 'Nu aveți permisiunea de a edita acest task.');
    }
  } else {
    // Personal task - only creator can edit
    if (task.creatorId !== userId) {
      throw new ApiError(403, 'Nu aveți permisiunea de a edita acest task.');
    }
  }

  const { title, description, dueDate, assigneeId } = payload;
  const parsedDueDate = validateDueDate(dueDate);

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      description,
      dueDate: parsedDueDate,
    },
    include: includeAssignments,
  });

  return updatedTask;
};

export const deleteTask = async (userId, taskId) => {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new ApiError(404, 'Task-ul nu există.');

  // For personal tasks (no workspace), only creator can delete
  if (!task.workspaceId) {
    if (task.creatorId !== userId) {
      throw new ApiError(403, 'Nu aveți permisiunea de a șterge acest task.');
    }
  } else {
    // For workspace tasks, check membership permissions
    const membership = await requireWorkspaceMembership(userId, task.workspaceId);
    if (![Role.OWNER, Role.LEADER].includes(membership.role) && task.creatorId !== userId) {
      throw new ApiError(403, 'Nu aveți permisiunea de a șterge acest task.');
    }
  }

  await prisma.task.delete({ where: { id: taskId } });
};

export const listWorkspaceTasks = async (userId, workspaceId) => {
  const membership = await requireWorkspaceMembership(userId, workspaceId);
  if (![Role.OWNER, Role.LEADER].includes(membership.role)) {
    throw new ApiError(403, 'Doar liderii pot vedea toate task-urile din workspace.');
  }

  const tasks = await prisma.task.findMany({
    where: { workspaceId },
    include: includeAssignments,
    orderBy: { createdAt: 'desc' },
  });

  return tasks;
};
