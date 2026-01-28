import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { Colors } from '../../constants/Colors';
import { getActivities } from '../../services/DatabaseService';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Activity = {
    id: number;
    start_time: number;
    distance: number;
    duration: number;
    avg_speed: number;
};

export default function ActivityScreen() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter(); // Initialize router

    const loadActivities = async () => {
        try {
            const data = await getActivities();
            setActivities(data as Activity[]);
        } catch (e) {
            console.error(e);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadActivities();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadActivities();
        setRefreshing(false);
    };

    const renderItem = ({ item }: { item: Activity }) => (
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
                        <Ionicons name="fitness" size={20} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.title}>Course à pied</Text>
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
    }
});
