import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ActivityLog from './models/ActivityLog.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/billing_app';

async function testLogs() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Create a test log
    const testLog = new ActivityLog({
      action: 'LOGIN',
      module: 'AUTH',
      description: 'Test log entry from standalone script',
      performedBy: {
        name: 'Test Script',
        role: 'system'
      }
    });

    const savedLog = await testLog.save();
    console.log('✅ Log saved successfully:', savedLog._id);

    // 2. Fetch logs
    const logs = await ActivityLog.find({}).sort({ timestamp: -1 }).limit(1);
    console.log('✅ Fetched latest log:', logs[0]);
    
    if (logs.length > 0 && logs[0].description === 'Test log entry from standalone script') {
        console.log('🎉 SUCCESS: Activity Logging is working at DB level.');
    } else {
        console.log('❌ FAILURE: Could not retrieve the saved log.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

testLogs();
