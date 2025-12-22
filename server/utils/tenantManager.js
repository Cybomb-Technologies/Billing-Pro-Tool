import mongoose from 'mongoose';
import Tenant from '../models/master/Tenant.js';
import { getTenantModels } from './modelFactory.js';

// Cache connections to avoid memory leaks
const connectionMap = new Map();

/**
 * Gets or creates a database connection for a specific tenant
 * @param {String} tenantId - The unique slug or ID of the tenant
 * @returns {Promise<Object>} Object containing { connection, models }
 */
export const getTenantDB = async (tenantId) => {
  // 1. Check if connection already exists in cache
  if (connectionMap.has(tenantId)) {
    return connectionMap.get(tenantId);
  }

  // 2. Determine connection URI
  // In a real scenario, we fetch the tenant doc from Master DB to get the dbURI.
  // We assume the caller might have passed the tenantId which is the slug.
  
  const tenant = await Tenant.findOne({ slug: tenantId });
  if (!tenant) {
    throw new Error(`Tenant '${tenantId}' not found.`);
  }

  if (tenant.status !== 'active') {
      throw new Error(`Tenant '${tenantId}' is ${tenant.status}.`);
  }

  // 3. Create new connection
  const conn = mongoose.createConnection(tenant.dbURI, {
    // Options if needed
  });

  // 4. Handle connection events
  conn.on('connected', () => console.log(`Tenant DB connected: ${tenant.slug}`));
  conn.on('error', (err) => console.error(`Tenant DB error (${tenant.slug}):`, err));

  // 5. Compile models on this connection
  const models = getTenantModels(conn);

  // 6. Store in cache
  const payload = { connection: conn, models };
  connectionMap.set(tenantId, payload);

  return payload;
};

/**
 * Closes all tenant connections (useful for graceful shutdown)
 */
export const closeAllTenantConnections = async () => {
    for (const [key, payload] of connectionMap.entries()) {
        await payload.connection.close();
        console.log(`Closed connection for tenant: ${key}`);
    }
    connectionMap.clear();
};
