import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Open the database securely
export const getDb = async () => {
    if (!db) {
        db = await SQLite.openDatabaseAsync('strive.db');
    }
    return db;
};

export const initDatabase = async () => {
    // Prevent multiple simultaneous initializations
    if (isInitialized) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
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
      type TEXT DEFAULT 'run',
      polyline_json TEXT
    );
    CREATE TABLE IF NOT EXISTS location_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      speed REAL,
      accuracy REAL,
      FOREIGN KEY (activity_id) REFERENCES activities (id)
    );
  `);
        console.log('Database initialized');
        isInitialized = true;

        // Safe migration: check if column exists
        const tableInfo = await database.getAllAsync('PRAGMA table_info(location_points)') as any[];
        const hasAccuracy = tableInfo.some(col => col.name === 'accuracy');

        if (!hasAccuracy) {
            try {
                await database.execAsync('ALTER TABLE location_points ADD COLUMN accuracy REAL');
            } catch (e) {
                console.log('Migration error (ignored if benign):', e);
            }
        }

        // Migration for 'type' in activities
        const activityTableInfo = await database.getAllAsync('PRAGMA table_info(activities)') as any[];
        const hasType = activityTableInfo.some(col => col.name === 'type');

        if (!hasType) {
            try {
                await database.execAsync("ALTER TABLE activities ADD COLUMN type TEXT DEFAULT 'run'");
            } catch (e) {
                console.log('Migration error (type):', e);
            }
        }
    })();

    await initPromise;
    initPromise = null;
};

export const createActivity = async (type: string = 'run') => {
    const database = await getDb();
    const startTime = Date.now();
    const result = await database.runAsync(
        'INSERT INTO activities (start_time, type) VALUES (?, ?)',
        startTime, type
    );
    return result.lastInsertRowId; // Return activity ID
};

export const addLocationPoint = async (activityId: number, lat: number, lon: number, speed: number | null, accuracy: number | null) => {
    const database = await getDb();
    await database.runAsync(
        'INSERT INTO location_points (activity_id, latitude, longitude, timestamp, speed, accuracy) VALUES (?, ?, ?, ?, ?, ?)',
        activityId, lat, lon, Date.now(), speed || 0, accuracy || 0
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

export const getGlobalStats = async () => {
    const database = await getDb();
    const result = await database.getFirstAsync(`
        SELECT 
            COUNT(*) as totalActivities,
            COALESCE(SUM(distance), 0) as totalDistance,
            COALESCE(SUM(duration), 0) as totalDuration,
            COALESCE(AVG(avg_speed), 0) as avgSpeed
        FROM activities 
        WHERE end_time IS NOT NULL
    `) as any;

    return {
        totalActivities: result?.totalActivities || 0,
        totalDistance: result?.totalDistance || 0,
        totalDuration: result?.totalDuration || 0,
        avgSpeed: result?.avgSpeed || 0,
    };
};
