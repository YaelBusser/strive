import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Colors } from '../../constants/Colors';
import { LocationService, locationEvents } from '../../services/LocationService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function MapScreen() {
    const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
    const [isTracking, setIsTracking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [distance, setDistance] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const mapRef = useRef<MapView>(null);

    useEffect(() => {
        // Initial current location & auto-center
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            let location = await Location.getCurrentPositionAsync({});
            setCurrentLocation(location);

            // Auto-center immediately
            if (mapRef.current && location) {
                mapRef.current.animateCamera({
                    center: {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    },
                    zoom: 17,
                });
            }
        })();

        // Check initial state
        setIsTracking(LocationService.isTracking());
        setDistance(LocationService.getCurrentDistance());
    }, []);

    useEffect(() => {
        const sub = locationEvents.addListener('newLocations', (locations: Location.LocationObject[]) => {
            const newCoords = locations.map(loc => ({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            }));

            setRouteCoordinates(prev => [...prev, ...newCoords]);

            if (locations.length > 0) {
                const lastLoc = locations[locations.length - 1];
                setCurrentLocation(lastLoc);

                if (LocationService.isTracking()) {
                    setDistance(LocationService.getCurrentDistance());
                }
            }
        });

        return () => {
            sub.remove();
        };
    }, []);

    useEffect(() => {
        // Follow user if tracking, or if just starting
        if (currentLocation && mapRef.current && isTracking) {
            mapRef.current.animateCamera({
                center: {
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                },
                zoom: 17,
                heading: currentLocation.coords.heading || 0,
                pitch: 0,
            });
        }
    }, [currentLocation, isTracking]);

    // Timer for elapsed time
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTracking) {
            interval = setInterval(() => {
                setElapsedTime(LocationService.getElapsedTime());
                setIsPaused(LocationService.isPaused());
            }, 100); // Update every 100ms for smooth display
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTracking]);

    const toggleTracking = async () => {
        if (isTracking) {
            try {
                await LocationService.stopTracking();
                setIsTracking(false);
                setIsPaused(false);
                setElapsedTime(0);
            } catch (e) {
                console.error(e);
            }
        } else {
            try {
                setRouteCoordinates([]);
                await LocationService.startTracking();
                setIsTracking(true);
                setDistance(0);
                setElapsedTime(0);
            } catch (e) {
                alert('Permission requise ou erreur de démarrage');
            }
        }
    };

    const togglePause = () => {
        if (isPaused) {
            LocationService.resumeTracking();
            setIsPaused(false);
        } else {
            LocationService.pauseTracking();
            setIsPaused(true);
        }
    };

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                showsUserLocation={true}
                followsUserLocation={isTracking} // Only follow strictly when tracking to avoid annoyance when browsing map
                initialRegion={{
                    latitude: 48.8566,
                    longitude: 2.3522,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                userInterfaceStyle="dark"
            >
                <Polyline
                    coordinates={routeCoordinates}
                    strokeColor={Colors.primary}
                    strokeWidth={6}
                    lineDashPattern={[0]}
                />
            </MapView>

            {/* Floating Controls */}
            <View style={styles.controlsContainer}>
                <LinearGradient
                    colors={[Colors.surface, '#111']}
                    style={styles.controls}
                >
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>TEMPS</Text>
                            <Text style={styles.statValue}>{formatTime(elapsedTime)}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>DISTANCE</Text>
                            <Text style={styles.statValue}>{distance.toFixed(2)} <Text style={styles.unit}>km</Text></Text>
                        </View>
                    </View>

                    <View style={[styles.statusIndicator, {
                        backgroundColor: !isTracking ? Colors.border : isPaused ? Colors.warning : Colors.success
                    }]}>
                        <Text style={styles.statusText}>
                            {!isTracking ? "PRÊT" : isPaused ? "EN PAUSE" : "EN COURS"}
                        </Text>
                    </View>

                    <View style={styles.buttonsRow}>
                        {!isTracking ? (
                            <TouchableOpacity
                                style={[styles.button, styles.startButton]}
                                onPress={toggleTracking}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="play" size={32} color="#fff" />
                            </TouchableOpacity>
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={[styles.button, styles.pauseButton]}
                                    onPress={togglePause}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name={isPaused ? "play" : "pause"} size={28} color="#fff" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, styles.stopButton]}
                                    onPress={toggleTracking}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="stop" size={28} color="#fff" />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </LinearGradient>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    map: {
        flex: 1,
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
    },
    controls: {
        padding: 24,
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
        width: '100%',
    },
    statBox: {
        flex: 1,
    },
    statsContainer: {
        flex: 1,
    },
    statLabel: {
        color: Colors.textSecondary,
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 4,
        letterSpacing: 1,
    },
    statValue: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
    },
    unit: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    statusIndicator: {
        position: 'absolute',
        top: -12,
        left: 24,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    buttonsRow: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'center',
    },
    button: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    startButton: {
        backgroundColor: Colors.primary,
    },
    pauseButton: {
        backgroundColor: Colors.warning,
    },
    stopButton: {
        backgroundColor: Colors.error,
    },
});
