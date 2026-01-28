import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;

// Open the database securely
export const getDb = async () => {
    if (!db) {
        db = await SQLite.openDatabaseAsync('strive.db');
    }
    return db;
};

export const initDatabase = async () => {
    const database = await getDb();

    await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration INTEGER DEFAULT 0,
      distance REAL DEFAULT 0,
      avg_speed REAL DEFAULT 0,
      polyline_json TEXT
    );
    CREATE TABLE IF NOT EXISTS location_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      speed REAL,
      FOREIGN KEY (activity_id) REFERENCES activities (id)
    );
  `);
    console.log('Database initialized');
};

export const createActivity = async () => {
    const database = await getDb();
    const startTime = Date.now();
    const result = await database.runAsync(
        'INSERT INTO activities (start_time) VALUES (?)',
        startTime
    );
    return result.lastInsertRowId; // Return activity ID
};

export const addLocationPoint = async (activityId: number, lat: number, lon: number, speed: number | null) => {
    const database = await getDb();
    await database.runAsync(
        'INSERT INTO location_points (activity_id, latitude, longitude, timestamp, speed) VALUES (?, ?, ?, ?, ?)',
        activityId, lat, lon, Date.now(), speed || 0
    );
};

export const finishActivity = async (activityId: number, distance: number, duration: number, polyline: any[]) => {
    const database = await getDb();
    const endTime = Date.now();
    // Calc average speed (m/s -> km/h) if needed, or derived from distance/duration
    const avgSpeed = duration > 0 ? (distance / duration) * 3600 : 0; // km/h

    await database.runAsync(
        'UPDATE activities SET end_time = ?, duration = ?, distance = ?, avg_speed = ?, polyline_json = ? WHERE id = ?',
        endTime, duration, distance, avgSpeed, JSON.stringify(polyline), activityId
    );
};

export const getActivities = async () => {
    const database = await getDb();
    return await database.getAllAsync('SELECT * FROM activities WHERE end_time IS NOT NULL ORDER BY start_time DESC');
};

export const getActivityById = async (id: number) => {
    const database = await getDb();
    return await database.getFirstAsync('SELECT * FROM activities WHERE id = ?', id);
};

export const deleteActivity = async (id: number) => {
    const database = await getDb();
    await database.runAsync('DELETE FROM location_points WHERE activity_id = ?', id);
    await database.runAsync('DELETE FROM activities WHERE id = ?', id);
};
