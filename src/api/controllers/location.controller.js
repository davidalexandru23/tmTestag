import { getWorkspaceMemberLocations as getWorkspaceMemberLocationsService } from '../services/location.service.js';

export const getWorkspaceMemberLocations = async (req, res) => {
    const locations = await getWorkspaceMemberLocationsService(req.user.id, req.params.workspaceId);
    res.status(200).json(locations);
};
