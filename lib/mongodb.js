import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/textbook_notes_matcher';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, status: 'disconnected', lastError: null };
}

export async function connectToDatabase() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return { isConnected: true, conn: cached.conn, uri: MONGODB_URI.replace(/\/\/.*@/, '//***@') };
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 2500, // Quick timeout for seamless local fallback
      connectTimeoutMS: 3000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      cached.status = 'connected';
      cached.lastError = null;
      return mongooseInstance;
    }).catch(err => {
      cached.promise = null;
      cached.status = 'error';
      cached.lastError = err.message;
      return null;
    });
  }

  try {
    cached.conn = await cached.promise;
    if (cached.conn && mongoose.connection.readyState === 1) {
      return { 
        isConnected: true, 
        conn: cached.conn, 
        uri: MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//$USER:***@') 
      };
    }
    return { 
      isConnected: false, 
      reason: cached.lastError || 'Could not establish MongoDB connection',
      uri: MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//$USER:***@')
    };
  } catch (err) {
    cached.promise = null;
    return { 
      isConnected: false, 
      reason: err.message,
      uri: MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//$USER:***@')
    };
  }
}

export async function getDbStatus() {
  try {
    const res = await connectToDatabase();
    return {
      connected: res.isConnected,
      uri: res.uri,
      reason: res.reason || null
    };
  } catch (err) {
    return {
      connected: false,
      reason: err.message
    };
  }
}
