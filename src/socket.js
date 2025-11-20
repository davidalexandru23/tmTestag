import { Server } from 'socket.io';
import logger from './utils/logger.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: '*', // Allow all origins for now (dev)
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        logger.info(`User connected: ${socket.id}`);

        // Join a room (e.g., user ID or workspace ID)
        socket.on('join_room', (room) => {
            socket.join(room);
            logger.info(`User ${socket.id} joined room: ${room}`);
        });

        // Handle chat messages
        socket.on('send_message', async (data) => {
            // data: { senderId, receiverId?, workspaceId?, content }
            try {
                const { senderId, receiverId, workspaceId, content } = data;

                // Save to DB
                const message = await prisma.message.create({
                    data: {
                        senderId,
                        receiverId,
                        workspaceId,
                        content,
                    },
                    include: {
                        sender: { select: { id: true, name: true, email: true } },
                    },
                });

                // Emit to receiver or workspace
                if (receiverId) {
                    io.to(receiverId).emit('receive_message', message);
                    // Also emit to sender so they see it immediately (if not handled optimistically)
                    io.to(senderId).emit('receive_message', message);
                } else if (workspaceId) {
                    io.to(workspaceId).emit('receive_message', message);
                }

            } catch (error) {
                logger.error('Error sending message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Handle "Simulated Push" notifications
        // This event is triggered by the backend (via API) or other clients
        // For now, we'll allow clients to trigger it for testing
        socket.on('trigger_notification', (data) => {
            // data: { userId, title, body }
            const { userId, title, body } = data;
            io.to(userId).emit('notification', { title, body });
            logger.info(`Notification sent to ${userId}: ${title}`);
        });

        socket.on('disconnect', () => {
            logger.info(`User disconnected: ${socket.id}`);
        });
    });

    return io;
};
