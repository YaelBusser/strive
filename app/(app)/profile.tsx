import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { getGlobalStats } from '../../services/DatabaseService';
import { useCallback, useState } from 'react';

export default function ProfileScreen() {
    const { user, signOut } = useAuth();
    const [stats, setStats] = useState({ totalActivities: 0, totalDistance: 0 });

    useFocusEffect(
        useCallback(() => {
            loadStats();
        }, [])
    );

    const loadStats = async () => {
        const data = await getGlobalStats();
        setStats({
            totalActivities: data.totalActivities,
            totalDistance: data.totalDistance
        });
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <LinearGradient
                    colors={[Colors.surface, Colors.background]}
                    style={styles.header}
                >
                    <View style={styles.avatarContainer}>
                        {user?.profilePhoto ? (
                            <Image
                                source={{ uri: user.profilePhoto }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <LinearGradient
                                colors={Colors.gradientPrimary}
                                style={styles.avatarGradient}
                            >
                                <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
                            </LinearGradient>
                        )}
                    </View>
                    <Text style={styles.name}>{user?.name || 'Utilisateur'}</Text>
                    <Text style={styles.email}>{user?.email || 'email@exemple.com'}</Text>

                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statVal}>{stats.totalActivities}</Text>
                            <Text style={styles.statLabel}>Activités</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.stat}>
                            <Text style={styles.statVal}>{stats.totalDistance.toFixed(1)}</Text>
                            <Text style={styles.statLabel}>km</Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.content}>

                    {/* DATA & PRIVACY SECTION */}
                    <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Compte</Text>

                    <Link href="/(app)/settings" asChild>
                        <TouchableOpacity style={styles.settingRow}>
                            <View style={styles.settingLabelContainer}>
                                <View style={styles.iconBox}>
                                    <Ionicons name="settings-outline" size={20} color={Colors.text} />
                                </View>
                                <Text style={styles.settingLabel}>Paramètres</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </Link>

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Confidentialité</Text>

                    <View style={styles.privacyBox}>
                        <Ionicons name="shield-checkmark" size={24} color={Colors.success} style={{ marginBottom: 8 }} />
                        <Text style={styles.privacyTitle}>Vos données sont sécurisées</Text>
                        <Text style={styles.privacyText}>
                            Toutes vos activités et données GPS sont stockées localement sur votre appareil.
                            Aucune information n'est partagée avec des tiers sans votre consentement.
                        </Text>
                    </View>

                    {/* LOGOUT */}
                    <TouchableOpacity style={[styles.logoutButton]} onPress={signOut}>
                        <Ionicons name="log-out-outline" size={24} color={Colors.error} />
                        <Text style={[styles.menuText, { color: Colors.error }]}>Se déconnecter</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        paddingTop: 80,
        paddingBottom: 40,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    avatarContainer: {
        marginBottom: 16,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        position: 'relative',
    },
    avatarGradient: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#fff',
    },
    avatarImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#fff',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: Colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.surface,
    },
    avatarText: {
        fontSize: 40,
        color: '#fff',
        fontWeight: 'bold',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 4,
    },
    email: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginBottom: 24,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 32,
    },
    stat: {
        alignItems: 'center',
    },
    statVal: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    statLabel: {
        color: Colors.textSecondary,
        fontSize: 12,
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 24,
    },
    content: {
        padding: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.textSecondary,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    settingLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingLabel: {
        fontSize: 16,
        color: Colors.text,
        fontWeight: '500',
    },
    privacyBox: {
        backgroundColor: 'rgba(52, 199, 89, 0.1)',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(52, 199, 89, 0.2)',
    },
    privacyTitle: {
        color: Colors.success,
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 8,
    },
    privacyText: {
        color: Colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: Colors.text,
        fontWeight: '500',
        marginLeft: 16,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        padding: 16,
        borderRadius: 16,
        marginTop: 40,
        borderWidth: 1,
        borderColor: 'rgba(244, 67, 54, 0.3)',
    },
    version: {
        textAlign: 'center',
        color: Colors.textSecondary,
        marginTop: 20,
        fontSize: 12,
        opacity: 0.5,
    }
});
