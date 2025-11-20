import { listLogs as listLogsService } from '../services/log.service.js';

export const listLogs = async (req, res) => {
  const logs = await listLogsService(req.user.id);
  res.status(200).json(logs);
};
