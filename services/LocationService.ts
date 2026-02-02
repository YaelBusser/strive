import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { EventEmitter } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';
import { createActivity, addLocationPoint, finishActivity } from './DatabaseService';
import { getDistanceFromLatLonInKm } from '../utils/geometry';

const LOCATION_TASK_NAME = 'background-location-task';
const NOTIFICATION_CHANNEL = 'strive-activity-channel';
const NOTIFICATION_ID = 'strive-ongoing-activity';

// Notification Actions
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false, // Added for type compliance
        shouldShowList: false, // Added for type compliance
    }),
});

// Configure actions
Notifications.setNotificationCategoryAsync('TRACKING_ACTIONS', [
    { identifier: 'pause', buttonTitle: 'Pause', options: { opensAppToForeground: false } },
    { identifier: 'resume', buttonTitle: 'Reprendre', options: { opensAppToForeground: false } }, // Will not show 'Resume' initially
    { identifier: 'stop', buttonTitle: 'Stop', options: { opensAppToForeground: true } }, // Stop opens app to confirm/finish
]);

// Initialize channel (Android)
Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL, {
    name: 'Suivi d\'activité',
    importance: Notifications.AndroidImportance.LOW, // Low importance to avoid sound/popup on update
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FD9500',
});

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

                        // Update Notification
                        await LocationService.updateNotification();

                    } catch (dbError) {
                        console.error('DB Insert Error', dbError);
                    }
                }
            }
        }
    }

});

// Calculate duration helper
const getDuration = () => {
    if (!startTime) return 0;
    const now = Date.now();
    const elapsed = now - startTime - totalPausedTime;
    return isPaused ? elapsed - (now - pauseStartTime) : elapsed;
};

// Format time
const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${m}m ${s}s`;
};

export const LocationService = {
    requestPermissions: async () => {
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
            throw new Error('FOREGROUND_PERMISSION_DENIED');
        }
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
            throw new Error('BACKGROUND_PERMISSION_DENIED');
        }
        return true;
    },

    startTracking: async (activityType: string = 'run') => {
        if (isTracking) return;

        try {
            const hasPermissions = await LocationService.requestPermissions();
            if (!hasPermissions) {
                throw new Error('PERMISSIONS_NOT_GRANTED');
            }
        } catch (permError: any) {
            if (permError.message === 'FOREGROUND_PERMISSION_DENIED') {
                throw new Error('Permission de localisation refusée. Veuillez autoriser l\'accès à votre position.');
            } else if (permError.message === 'BACKGROUND_PERMISSION_DENIED') {
                throw new Error('Permission de localisation en arrière-plan refusée. Pour suivre vos activités, autorisez "Toujours" dans les paramètres de localisation.');
            }
            throw permError;
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
        LocationService.updateNotification();
    },

    updateNotification: async () => {
        if (!isTracking) return;

        const duration = getDuration();
        const dist = currentDistance.toFixed(2);

        // Dynamic actions: Show "Resume" if paused, "Pause" otherwise
        await Notifications.setNotificationCategoryAsync('TRACKING_ACTIONS', [
            isPaused
                ? { identifier: 'resume', buttonTitle: 'Reprendre', options: { opensAppToForeground: false } }
                : { identifier: 'pause', buttonTitle: 'Pause', options: { opensAppToForeground: false } },
            { identifier: 'stop', buttonTitle: 'Terminer', options: { opensAppToForeground: true } },
        ]);

        await Notifications.scheduleNotificationAsync({
            content: {
                title: isPaused ? 'Strive (En Pause)' : 'Strive (En cours...)',
                body: `${dist} km • ${formatDuration(duration)}`,
                data: { secret: 'strive' },
                categoryIdentifier: 'TRACKING_ACTIONS',
                sticky: true, // Keep it persistent
                autoDismiss: false,
            },
            trigger: null, // Immediate
            identifier: NOTIFICATION_ID
        });
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

// Handle Notification Actions (Background)
Notifications.addNotificationResponseReceivedListener(response => {
    const actionId = response.actionIdentifier;

    if (actionId === 'pause') {
        LocationService.pauseTracking();
        LocationService.updateNotification();
    } else if (actionId === 'resume') {
        LocationService.resumeTracking();
    } else if (actionId === 'stop') {
        // App opens automatically due to opensAppToForeground: true
        // UI should handle checking state and stopping
        // Or we can stop here if we want background stop (but safer to let user confirm in UI)
    }
});
