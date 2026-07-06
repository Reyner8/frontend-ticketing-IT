import { getCachedUsers } from "./api/services";

export const getUserName = (userId: string) => {
  const user = getCachedUsers().find(u => u.id === userId);
  return user?.name || 'Unknown User';
};

export const getUserByRole = (role: string) => {
  return getCachedUsers().filter(u => u.role === role);
};

export const getUsersByTeam = (team: string) => {
  return getCachedUsers().filter(u => u.team === team);
};

export const isUserActive = (userId: string) => {
  const user = getCachedUsers().find(u => u.id === userId);
  return user?.isActive || false;
};
