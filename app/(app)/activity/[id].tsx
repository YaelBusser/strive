import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { Tabs, useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../../constants/Colors';
import { deleteActivity, getActivityById } from '../../../services/DatabaseService';
import MapView, { Polyline, PROVIDER_DEFAULT, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ActivityDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [activity, setActivity] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [statsVisible, setStatsVisible] = useState(false);
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);
    const polyline = activity?.polyline_json ? JSON.parse(activity.polyline_json) : [];

    useEffect(() => {
        loadActivity();
    }, [id]);

    useEffect(() => {
        if (polyline.length > 0 && mapRef.current) {
            mapRef.current.fitToCoordinates(polyline, {
                edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        }
    }, [polyline]);

    const loadActivity = async () => {
        if (!id) return;
        try {
            const data = await getActivityById(Number(id));
            setActivity(data);
        } catch (e) {
            console.error("Failed to load activity", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Supprimer",
            "Voulez-vous vraiment supprimer cette activité ?",
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteActivity(Number(id));
                            router.back();
                        } catch (e) {
                            console.error("Delete failed", e);
                        }
                    }
                }
            ]
        );
    };

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
    };

    const getActivityLabel = (type?: string) => {
        switch (type) {
            case 'walk': return 'Marche';
            case 'bike': return 'Sortie Vélo';
            case 'hike': return 'Randonnée';
            case 'run':
            default: return 'Course à pied';
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!activity) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Activité introuvable.</Text>
            </View>
        );
    }


    const date = new Date(activity.start_time);

    let region = {
        latitude: 48.8566,
        longitude: 2.3522,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    };

    if (polyline.length > 0) {
        const lats = polyline.map((p: any) => p.latitude);
        const lons = polyline.map((p: any) => p.longitude);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);

        region = {
            latitude: (minLat + maxLat) / 2,
            longitude: (minLon + maxLon) / 2,
            latitudeDelta: (maxLat - minLat) * 1.5,
            longitudeDelta: (maxLon - minLon) * 1.5,
        };
    }

    return (
        <View style={styles.container}>
            <Tabs.Screen options={{
                tabBarStyle: { display: 'none' },
                headerShown: false
            }} />

            <MapView
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_DEFAULT}
                initialRegion={region}
                pitchEnabled={true}
                rotateEnabled={true}
                scrollEnabled={true}
                zoomEnabled={true}
                showsUserLocation={false}
                userInterfaceStyle="dark"
                ref={mapRef}
                onMapReady={() => {
                    if (polyline.length > 0) {
                        mapRef.current?.fitToCoordinates(polyline, {
                            edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
                            animated: true,
                        });
                    }
                }}
            >
                <Polyline
                    coordinates={polyline}
                    strokeColor={Colors.primary}
                    strokeWidth={4}
                />
                {polyline.length > 0 && (
                    <>
                        <Marker
                            coordinate={polyline[0]}
                            title="Départ"
                            pinColor="green"
                        />
                        <Marker
                            coordinate={polyline[polyline.length - 1]}
                            title="Arrivée"
                            pinColor="red"
                        />
                    </>
                )}
            </MapView>

            <TouchableOpacity
                style={[styles.backButton, { top: insets.top + 10 }]}
                onPress={() => router.back()}
            >
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.deleteButton, { top: insets.top + 10 }]}
                onPress={handleDelete}
            >
                <Ionicons name="trash" size={24} color={Colors.error} />
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.infoButton, { bottom: insets.bottom + 20 }]}
                onPress={() => setStatsVisible(true)}
            >
                <Ionicons name="stats-chart" size={24} color="#fff" />
                <Text style={styles.infoButtonText}>Infos</Text>
            </TouchableOpacity>

            <Modal
                visible={statsVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setStatsVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setStatsVisible(false)}
                >
                    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                            <View style={styles.modalHandle} />

                            <Text style={styles.modalDate}>
                                {date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </Text>
                            <Text style={styles.modalTime}>
                                {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </Text>

                            <Text style={styles.modalTitle}>{getActivityLabel(activity.type)}</Text>

                            <View style={styles.statsGrid}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Distance</Text>
                                    <Text style={styles.statValue}>{activity.distance.toFixed(2)}</Text>
                                    <Text style={styles.statUnit}>km</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Durée</Text>
                                    <Text style={styles.statValue}>{formatDuration(activity.duration)}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Vitesse Moy.</Text>
                                    <Text style={styles.statValue}>{activity.avg_speed.toFixed(1)}</Text>
                                    <Text style={styles.statUnit}>km/h</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setStatsVisible(false)}
                            >
                                <Text style={styles.closeButtonText}>Fermer</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: Colors.error,
        fontSize: 16,
        textAlign: 'center',
        marginTop: 100,
    },
    backButton: {
        position: 'absolute',
        left: 16,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        position: 'absolute',
        right: 16,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoButton: {
        position: 'absolute',
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        backgroundColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    infoButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: Colors.textSecondary,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
        opacity: 0.3,
    },
    modalDate: {
        color: Colors.textSecondary,
        fontSize: 12,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    modalTime: {
        color: Colors.textSecondary,
        fontSize: 12,
        marginBottom: 16,
    },
    modalTitle: {
        color: Colors.text,
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 24,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    statBox: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        borderRadius: 16,
        alignItems: 'flex-start',
    },
    statLabel: {
        color: Colors.textSecondary,
        fontSize: 11,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    statValue: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
    },
    statUnit: {
        color: Colors.textSecondary,
        fontSize: 13,
        fontWeight: 'bold',
    },
    closeButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
