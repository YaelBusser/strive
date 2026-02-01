import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { EventEmitter } from 'expo-modules-core';
import { createActivity, addLocationPoint, finishActivity } from './DatabaseService';
import { getDistanceFromLatLonInKm } from '../utils/geometry';

const LOCATION_TASK_NAME = 'background-location-task';

// Event emitter to send updates to the UI
export const locationEvents = new EventEmitter<{ newLocations: (locations: Location.LocationObject[]) => void }>();

// State
let isTracking = false;
let isPaused = false;
let currentActivityId: number | null = null;
let currentDistance = 0;
let startTime = 0;
let pauseStartTime = 0;
let totalPausedTime = 0;
let routePoints: { latitude: number, longitude: number }[] = [];

// Define the task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Location task error:', error);
        return;
    }
    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };

        // Emit event with new locations to UI
        locationEvents.emit('newLocations', locations);

        // Persist to DB
        if (currentActivityId) {
            for (const loc of locations) {
                const { latitude, longitude, speed, accuracy } = loc.coords;

                // Filter: Minimum distance 5m (approx) to avoid noise, unless it's the first point
                let shouldRecord = true;
                if (routePoints.length > 0) {
                    const lastPoint = routePoints[routePoints.length - 1];
                    const distKm = getDistanceFromLatLonInKm(lastPoint.latitude, lastPoint.longitude, latitude, longitude);
                    if (distKm * 1000 < 5) { // Less than 5 meters
                        shouldRecord = false;
                    }
                }

                if (shouldRecord) {
                    try {
                        await addLocationPoint(currentActivityId, latitude, longitude, speed, accuracy);

                        // Update distance calculation
                        if (routePoints.length > 0) {
                            const lastPoint = routePoints[routePoints.length - 1];
                            const dist = getDistanceFromLatLonInKm(lastPoint.latitude, lastPoint.longitude, latitude, longitude);
                            currentDistance += dist;
                        }
                        routePoints.push({ latitude, longitude });
                    } catch (dbError) {
                        console.error('DB Insert Error', dbError);
                    }
                }
            }
        }
    }
});

export const LocationService = {
    requestPermissions: async () => {
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
            return false;
        }
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        return backgroundStatus === 'granted';
    },

    startTracking: async (activityType: string = 'run') => {
        if (isTracking) return;

        const hasPermissions = await LocationService.requestPermissions();
        if (!hasPermissions) {
            throw new Error('Permissions not granted');
        }

        try {
            // Initialize Activity in DB
            const resultId = await createActivity(activityType);
            currentActivityId = Number(resultId);
            currentDistance = 0;
            startTime = Date.now();
            routePoints = [];
            isPaused = false;
            totalPausedTime = 0;
            pauseStartTime = 0;

            // Start background updates
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                accuracy: Location.Accuracy.BestForNavigation,
                activityType: Location.ActivityType.Fitness,
                timeInterval: 2000, // 2 seconds (Target: 1-3s)
                distanceInterval: 5, // 5 meters (Target: 5-10m)
                foregroundService: {
                    notificationTitle: "Strive is tracking your run",
                    notificationBody: "Recording your activity...",
                    notificationColor: "#FC5200",
                },
                showsBackgroundLocationIndicator: true,
                pausesUpdatesAutomatically: false,
            });

            isTracking = true;
            console.log('Tracking started, Activity ID:', currentActivityId);
        } catch (e) {
            console.error('Start tracking failed', e);
            throw e;
        }
    },

    stopTracking: async () => {
        if (!isTracking || !currentActivityId) return;

        try {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

            // Finish Activity in DB
            const duration = (Date.now() - startTime - totalPausedTime) / 1000; // seconds
            await finishActivity(currentActivityId, currentDistance, duration, routePoints);

            isTracking = false;
            isPaused = false;
            currentActivityId = null;
            totalPausedTime = 0;
            console.log('Tracking stopped');
        } catch (e) {
            console.error('Stop tracking failed', e);
        }
    },

    pauseTracking: () => {
        if (!isTracking || isPaused) return;
        isPaused = true;
        pauseStartTime = Date.now();
        console.log('Tracking paused');
    },

    resumeTracking: () => {
        if (!isTracking || !isPaused) return;
        isPaused = false;
        totalPausedTime += Date.now() - pauseStartTime;
        console.log('Tracking resumed');
    },

    isTracking: () => isTracking,
    isPaused: () => isPaused,
    getCurrentDistance: () => currentDistance,
    getElapsedTime: () => {
        if (!isTracking) return 0;
        const now = Date.now();
        const elapsed = now - startTime - totalPausedTime;
        if (isPaused) {
            return elapsed - (now - pauseStartTime);
        }
        return elapsed;
    },
};
