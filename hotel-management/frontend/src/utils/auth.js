// Auth utility functions

export const getToken = () => localStorage.getItem('token');

export const getUser = () => {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
};

export const setAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const isAuthenticated = () => !!getToken();

export const hasRole = (requiredRoles) => {
  const user = getUser();
  if (!user) return false;
  return Array.isArray(requiredRoles) 
    ? requiredRoles.includes(user.role) 
    : user.role === requiredRoles;
};

// Get redirect path based on role
export const getRedirectPath = (role) => {
  const paths = {
    superadmin: '/superadmin/dashboard',
    admin: '/admin/dashboard',
    guest: '/guest/dashboard'
  };
  return paths[role] || '/guest/dashboard';
};
