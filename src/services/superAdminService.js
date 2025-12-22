import { API_BASE_URL } from '../config';

const getHeaders = (adminKey) => ({
  'Content-Type': 'application/json',
  'x-admin-key': adminKey
});

export const superAdminService = {
  // Organizations
  getOrganizations: async (adminKey, isDeleted = false) => {
    const url = `${API_BASE_URL}/super-admin/organizations${isDeleted ? '?isDeleted=true' : ''}`;
    const response = await fetch(url, {
      headers: getHeaders(adminKey)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch organizations');
    }
    return response.json();
  },

  verify: async (adminKey) => {
    const response = await fetch(`${API_BASE_URL}/super-admin/verify`, {
        method: 'POST',
        headers: getHeaders(adminKey)
    });
    if (!response.ok) {
        throw new Error('Invalid Password');
    }
    return true;
  },

  createOrganization: async (adminKey, data) => {
    const response = await fetch(`${API_BASE_URL}/super-admin/organizations`, {
      method: 'POST',
      headers: getHeaders(adminKey),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create organization');
    }
    return response.json();
  },

  updateOrganization: async (adminKey, id, data) => {
    const response = await fetch(`${API_BASE_URL}/super-admin/organizations/${id}`, {
      method: 'PUT',
      headers: getHeaders(adminKey),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update organization');
    }
    return response.json();
  },

  toggleOrganizationStatus: async (adminKey, id, status) => {
    const response = await fetch(`${API_BASE_URL}/super-admin/organizations/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(adminKey),
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update status');
    }
    return response.json();
  },

  deleteOrganization: async (adminKey, id) => {
    const response = await fetch(`${API_BASE_URL}/super-admin/organizations/${id}`, {
      method: 'DELETE',
      headers: getHeaders(adminKey)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete organization');
    }
    return response.json();
  },

  restoreOrganization: async (adminKey, id) => {
    const response = await fetch(`${API_BASE_URL}/super-admin/organizations/${id}/restore`, {
        method: 'PATCH',
        headers: getHeaders(adminKey)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to restore organization');
    }
    return response.json();
  },

  // Tenants
  getTenants: async (adminKey, orgId = null, isDeleted = false) => {
    let url = `${API_BASE_URL}/super-admin/tenants?`;
    if (orgId) url += `organizationId=${orgId}&`;
    if (isDeleted) url += `isDeleted=true&`;
    
    const response = await fetch(url, {
      headers: getHeaders(adminKey)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch tenants');
    }
    return response.json();
  },

  createTenant: async (adminKey, data) => {
    const response = await fetch(`${API_BASE_URL}/super-admin/tenants`, {
      method: 'POST',
      headers: getHeaders(adminKey),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create tenant');
    }
    return response.json();
  },

  updateTenant: async (adminKey, id, data) => {
    const response = await fetch(`${API_BASE_URL}/super-admin/tenants/${id}`, {
      method: 'PUT',
      headers: getHeaders(adminKey),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update branch');
    }
    return response.json();
  },

  toggleTenantStatus: async (adminKey, id, status) => {
    const response = await fetch(`${API_BASE_URL}/super-admin/tenants/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(adminKey),
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update branch status');
    }
    return response.json();
  },

  deleteTenant: async (adminKey, id) => {
    const response = await fetch(`${API_BASE_URL}/super-admin/tenants/${id}`, {
      method: 'DELETE',
      headers: getHeaders(adminKey)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete branch');
    }
    return response.json();
  },

  restoreTenant: async (adminKey, id) => {
    const response = await fetch(`${API_BASE_URL}/super-admin/tenants/${id}/restore`, {
        method: 'PATCH',
        headers: getHeaders(adminKey)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to restore branch');
    }
    return response.json();
  },

  // Reports
  getAggregatedStats: async (adminKey, orgId) => {
    const response = await fetch(`${API_BASE_URL}/super-admin/organizations/${orgId}/aggregated-stats`, {
      headers: getHeaders(adminKey)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch stats');
    }
    return response.json();
  },

  getBranchDetails: async (adminKey, orgId, branchSlug) => {
    const response = await fetch(`${API_BASE_URL}/super-admin/organizations/${orgId}/branches/${branchSlug}/dashboard`, {
      headers: getHeaders(adminKey)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch branch details');
    }
    return response.json();
  }
};
