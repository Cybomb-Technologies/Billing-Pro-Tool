import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Maxwell: Use tenant-specific User model if available, otherwise fallback to imported User (for master DB ops if any)
    const { User: TenantUser } = req.tenantModels || { User }; 
    
    req.user = await TenantUser.findById(decoded.userId || decoded.id).select('-password');
    
    if (!req.user) {
        return res.status(401).json({ message: 'User not found in this tenant context' });
    }
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};