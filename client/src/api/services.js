import { apiClient } from './client.js';

export const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (payload) => apiClient.post('/auth/register', payload),
  getProfile: () => apiClient.get('/auth/me'),
};

export function createResourceApi(endpoint) {
  return {
    getAll: (params) => apiClient.get(`/${endpoint}`, { params }),
    getById: (id) => apiClient.get(`/${endpoint}/${id}`),
    create: (payload) => apiClient.post(`/${endpoint}`, payload),
    update: (id, payload) => apiClient.patch(`/${endpoint}/${id}`, payload),
    remove: (id) => apiClient.delete(`/${endpoint}/${id}`),
  };
}

export const resourceApis = {
  users: createResourceApi('users'),
  'license-packages': createResourceApi('license-packages'),
  licenses: createResourceApi('licenses'),
  'license-histories': createResourceApi('license-histories'),
  vehicles: createResourceApi('vehicles'),
  'vehicle-groups': createResourceApi('vehicle-groups'),
  'vehicle-group-members': createResourceApi('vehicle-group-members'),
  'user-access': createResourceApi('user-access'),
  'resource-access': createResourceApi('resource-access'),
  devices: createResourceApi('devices'),
  'device-assignments': createResourceApi('device-assignments'),
};

export const healthApi = {
  check: () => apiClient.get('/health'),
};
