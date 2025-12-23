import { UserSchema } from '../models/User.js';
import { InvoiceSchema } from '../models/Invoice.js';
import { CustomerSchema } from '../models/Customer.js';
import { ProductSchema } from '../models/Product.js';
import { InventorySchema } from '../models/Inventory.js';
import { StaffLogSchema } from '../models/StaffLog.js';
import { SettingsSchema } from '../models/Settings.js';
import { SupportTicketSchema } from '../models/SupportTicket.js';
import { activityLogSchema } from '../models/ActivityLog.js';

/**
 * Compiles all models on the given connection
 * @param {import('mongoose').Connection} connection 
 * @returns {Object} Object containing compiled models
 */
export const getTenantModels = (connection) => {
  return {
    User: connection.model('User', UserSchema),
    Invoice: connection.model('Invoice', InvoiceSchema),
    Customer: connection.model('Customer', CustomerSchema),
    Product: connection.model('Product', ProductSchema),
    Inventory: connection.model('Inventory', InventorySchema),
    StaffLog: connection.model('StaffLog', StaffLogSchema),
    Settings: connection.model('Settings', SettingsSchema),
    SupportTicket: connection.model('SupportTicket', SupportTicketSchema),
    ActivityLog: connection.model('ActivityLog', activityLogSchema)
  };
};
