import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { Colors } from '../../constants/Colors';
import { getActivities, getGlobalStats } from '../../services/DatabaseService';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Linking } from 'react-native';

type Activity = {
    id: number;
    start_time: number;
    distance: number;
    duration: number;
    avg_speed: number;
    type?: string;
};

type GlobalStats = {
    totalActivities: number;
    totalDistance: number;
    totalDuration: number;
    avgSpeed: number;
};

export default function ActivityScreen() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
    const router = useRouter();

    const loadActivities = async () => {
        try {
            const data = await getActivities();
            setActivities(data as Activity[]);

            const stats = await getGlobalStats();
            setGlobalStats(stats);
        } catch (e) {
            console.error(e);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadActivities();
            checkPermissions();
        }, [])
    );

    const checkPermissions = async () => {
        const { status } = await Location.getForegroundPermissionsAsync();
        setPermissionStatus(status);
    };

    const requestPermissions = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setPermissionStatus(status);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadActivities();
        setRefreshing(false);
    };

    const getActivityConfig = (type?: string) => {
        switch (type) {
            case 'walk': return { label: 'Marche', icon: 'footsteps' };
            case 'bike': return { label: 'Vélo', icon: 'bicycle' };
            case 'hike': return { label: 'Randonnée', icon: 'compass' };
            case 'run':
            default: return { label: 'Course à pied', icon: 'walk' }; // Default icon
        }
    };

    const renderItem = ({ item }: { item: Activity }) => {
        const config = getActivityConfig(item.type);

        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push(`/(app)/activity/${item.id}`)}
            >
                <LinearGradient
                    colors={[Colors.surface, '#252525']}
                    style={styles.card}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.iconContainer}>
                            <Ionicons name={config.icon as any} size={20} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.title}>{config.label}</Text>
                            <Text style={styles.date}>
                                {new Date(item.start_time).toLocaleDateString()}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} style={{ marginLeft: 'auto' }} />
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Distance</Text>
                            <Text style={styles.statValue}>{item.distance.toFixed(2)} km</Text>
                        </View>
                        <View style={styles.statSeparator} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Durée</Text>
                            <Text style={styles.statValue}>{formatDuration(item.duration)}</Text>
                        </View>
                        <View style={styles.statSeparator} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Vitesse</Text>
                            <Text style={styles.statValue}>{item.avg_speed.toFixed(1)} km/h</Text>
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            {/* Custom Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Bonjour</Text>
                <Text style={styles.headerSubtitle}>Prêt à bouger ?</Text>
            </View>

            {permissionStatus !== 'granted' && (
                <View style={[styles.permissionBanner, permissionStatus === 'denied' && styles.permissionBannerError]}>
                    <Ionicons
                        name={permissionStatus === 'denied' ? "alert-circle" : "location"}
                        size={24}
                        color={permissionStatus === 'denied' ? Colors.error : "#FD9500"}
                    />
                    <View style={styles.permissionTextContainer}>
                        <Text style={[styles.permissionTitle, permissionStatus === 'denied' && { color: Colors.error }]}>
                            {permissionStatus === 'denied' ? "Localisation refusée" : "Autorisation requise"}
                        </Text>
                        <Text style={styles.permissionText}>
                            {permissionStatus === 'denied'
                                ? "L'accès à la localisation est bloqué. Veuillez l'activer dans les réglages."
                                : "Strive a besoin de votre position pour enregistrer vos parcours GPS."}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.permissionButton, permissionStatus === 'denied' && { backgroundColor: Colors.error }]}
                        onPress={permissionStatus === 'denied' ? Linking.openSettings : requestPermissions}
                    >
                        <Text style={styles.permissionButtonText}>
                            {permissionStatus === 'denied' ? "Réglages" : "Autoriser"}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Global Stats */}
            {globalStats && globalStats.totalActivities > 0 && (
                <View style={styles.statsContainer}>
                    <LinearGradient
                        colors={Colors.gradientPrimary}
                        style={styles.statsCard}
                    >
                        <View style={styles.statsGrid}>
                            <View style={styles.globalStatItem}>
                                <Text style={styles.globalStatValue}>{globalStats.totalActivities}</Text>
                                <Text style={styles.globalStatLabel}>Activités</Text>
                            </View>
                            <View style={styles.globalStatItem}>
                                <Text style={styles.globalStatValue}>{globalStats.totalDistance.toFixed(1)}</Text>
                                <Text style={styles.globalStatLabel}>km totaux</Text>
                            </View>
                            <View style={styles.globalStatItem}>
                                <Text style={styles.globalStatValue}>{formatDuration(globalStats.totalDuration)}</Text>
                                <Text style={styles.globalStatLabel}>Temps total</Text>
                            </View>
                            <View style={styles.globalStatItem}>
                                <Text style={styles.globalStatValue}>{globalStats.avgSpeed.toFixed(1)}</Text>
                                <Text style={styles.globalStatLabel}>km/h moy.</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>
            )}

            {activities.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconBg}>
                        <Ionicons name="trophy-outline" size={48} color={Colors.primary} />
                    </View>
                    <Text style={styles.emptyText}>Aucune activité</Text>
                    <Text style={styles.emptySubText}>Lancez votre première course depuis la carte !</Text>
                </View>
            ) : (
                <FlatList
                    data={activities}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 16,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    headerSubtitle: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.text,
    },
    statsContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    statsCard: {
        borderRadius: 20,
        padding: 20,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    globalStatItem: {
        flex: 1,
        minWidth: '40%',
        alignItems: 'center',
    },
    globalStatValue: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
    },
    globalStatLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
    },
    list: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    card: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    title: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    date: {
        color: Colors.textSecondary,
        fontSize: 12,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'flex-start',
    },
    statLabel: {
        color: Colors.textSecondary,
        fontSize: 12,
        marginBottom: 4,
    },
    statValue: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '700',
    },
    statSeparator: {
        width: 1,
        height: 30,
        backgroundColor: Colors.border,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 100,
    },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 0,
    },
    emptySubText: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    permissionBanner: {
        marginHorizontal: 20,
        marginBottom: 20,
        backgroundColor: 'rgba(253, 149, 0, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(253, 149, 0, 0.3)',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    permissionBannerError: {
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        borderColor: 'rgba(244, 67, 54, 0.3)',
    },

    permissionTextContainer: {
        flex: 1,
    },
    permissionTitle: {
        color: '#FD9500',
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 2,
    },
    permissionText: {
        color: Colors.textSecondary,
        fontSize: 12,
    },
    permissionButton: {
        backgroundColor: '#FD9500',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    permissionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    }
});
