import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const tenantId = localStorage.getItem('tenantId');
    
    if (token && userData) {
      const parsedUser = JSON.parse(userData);
      // Normalize user object to ensure it has _id
      const normalizedUser = normalizeUser(parsedUser);
      setUser(normalizedUser);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      if (tenantId) {
        axios.defaults.headers.common['x-tenant-id'] = tenantId;
      }
    }
    setLoading(false);
  }, []);

  // Helper function to normalize user object
  const normalizeUser = (userData) => {
    if (!userData) return null;
    
    // If user has id but no _id, copy id to _id
    if (userData.id && !userData._id) {
      return {
        ...userData,
        _id: userData.id
      };
    }
    
    return userData;
  };

  const login = async (email, password, tenantId = null) => {
    try {
      // Set header temporarily for the login request if tenantId is provided
      const config = {};
      if (tenantId) {
          config.headers = { 'x-tenant-id': tenantId };
      }

      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      }, config);

      const { token, user } = response.data;
      
      // Normalize user object before storing
      const normalizedUser = normalizeUser(user);
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      if (tenantId) {
          localStorage.setItem('tenantId', tenantId);
          axios.defaults.headers.common['x-tenant-id'] = tenantId;
      } else {
          // Ensure no stale tenant header if logging into master/default
          localStorage.removeItem('tenantId');
          delete axios.defaults.headers.common['x-tenant-id'];
      }

      setUser(normalizedUser);
      
      console.log('✅ Login successful - User:', normalizedUser);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const loginClientAdmin = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/client-admin/login`, {
        email,
        password
      });

      const { token, user } = response.data;
      
      const normalizedUser = normalizeUser(user);
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      // Client Admin doesn't use tenantId headers in the same way, or it uses the Org ID which is in the token.
      // We clear tenantId to be safe.
      localStorage.removeItem('tenantId');
      delete axios.defaults.headers.common['x-tenant-id'];
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(normalizedUser);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Client Login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantId');
    delete axios.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['x-tenant-id'];
    setUser(null);
  };

  const value = {
    user,
    login,
    loginClientAdmin,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};