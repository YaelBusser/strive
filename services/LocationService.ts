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
let currentActivityId: number | null = null;
let currentDistance = 0;
let startTime = 0;
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
                const { latitude, longitude, speed } = loc.coords;
                try {
                    await addLocationPoint(currentActivityId, latitude, longitude, speed);

                    // Update distance calculation (simplistic background accumulation)
                    if (routePoints.length > 0) {
                        const lastPoint = routePoints[routePoints.length - 1];
                        const dist = getDistanceFromLatLonInKm(lastPoint.latitude, lastPoint.longitude, latitude, longitude);
                        // dist is in km
                        currentDistance += dist;
                    }
                    routePoints.push({ latitude, longitude });
                } catch (dbError) {
                    console.error('DB Insert Error', dbError);
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

    startTracking: async () => {
        if (isTracking) return;

        const hasPermissions = await LocationService.requestPermissions();
        if (!hasPermissions) {
            throw new Error('Permissions not granted');
        }

        try {
            // Initialize Activity in DB
            const resultId = await createActivity();
            currentActivityId = Number(resultId);
            currentDistance = 0;
            startTime = Date.now();
            routePoints = [];

            // Start background updates
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 1000,
                distanceInterval: 5,
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
            const duration = (Date.now() - startTime) / 1000; // seconds
            await finishActivity(currentActivityId, currentDistance, duration, routePoints);

            isTracking = false;
            currentActivityId = null;
            console.log('Tracking stopped');
        } catch (e) {
            console.error('Stop tracking failed', e);
        }
    },

    isTracking: () => isTracking,
    getCurrentDistance: () => currentDistance,
};
