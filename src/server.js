import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import 'express-async-errors';

import authRoutes from './api/routes/auth.routes.js';
import workspaceRoutes from './api/routes/workspace.routes.js';
import taskRoutes from './api/routes/task.routes.js';
import logRoutes from './api/routes/log.routes.js';
import userRoutes from './api/routes/user.routes.js';
import messageRoutes from './api/routes/message.routes.js';
import ApiError from './utils/apiError.js';
import logger from './utils/logger.js';
import { initSocket } from './socket.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

// Make io available in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors());
app.use(express.json());

// Request Logger Middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Serve static files from the 'public' directory (Flutter Web)
app.use(express.static(path.join(__dirname, '../../public')));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/logs', logRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/messages', messageRoutes);

// Handle SPA routing: return index.html for any unknown route not starting with /api
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api')) {
    return next(new ApiError(404, 'Ruta solicitată nu există.'));
  }
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'A apărut o eroare neașteptată.';

  logger.error(`${statusCode} - ${message} - ${err.stack}`);

  res.status(statusCode).json({
    error: {
      message,
    },
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  logger.info(`Serverul rulează pe portul ${PORT}`);
});
