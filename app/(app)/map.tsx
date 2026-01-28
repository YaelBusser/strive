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
    const [distance, setDistance] = useState(0);
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

    const toggleTracking = async () => {
        if (isTracking) {
            try {
                await LocationService.stopTracking();
                setIsTracking(false);
            } catch (e) {
                console.error(e);
            }
        } else {
            try {
                setRouteCoordinates([]);
                await LocationService.startTracking();
                setIsTracking(true);
                setDistance(0);
            } catch (e) {
                alert('Permission requise ou erreur de démarrage');
            }
        }
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
                    <View style={styles.statsContainer}>
                        <Text style={styles.statLabel}>DISTANCE</Text>
                        <Text style={styles.statValue}>{distance.toFixed(2)} <Text style={styles.unit}>km</Text></Text>
                    </View>

                    <View style={[styles.statusIndicator, { backgroundColor: isTracking ? Colors.success : Colors.border }]}>
                        <Text style={styles.statusText}>{isTracking ? "EN COURS" : "PRÊT"}</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, isTracking ? styles.stopButton : styles.startButton]}
                        onPress={toggleTracking}
                        activeOpacity={0.8}
                    >
                        <Ionicons name={isTracking ? "stop" : "play"} size={32} color="#fff" />
                    </TouchableOpacity>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    statsContainer: {
        flex: 1,
    },
    statLabel: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
        letterSpacing: 1,
    },
    statValue: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '800', // Extra bold
        fontVariant: ['tabular-nums'],
    },
    unit: {
        fontSize: 16,
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
    button: {
        width: 64,
        height: 64,
        borderRadius: 32,
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
    stopButton: {
        backgroundColor: Colors.error, // Red for stop
    },
});
