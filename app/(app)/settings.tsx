import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Image } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../context/SettingsContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';

export default function SettingsScreen() {
    const { notifications, toggleNotifications, darkMode, toggleDarkMode } = useSettings();
    const { user, updateProfilePhoto } = useAuth();

    const handleChangePhoto = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert("Permission requise", "Vous devez autoriser l'accès à la galerie pour changer votre photo de profil.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            await updateProfilePhoto(result.assets[0].uri);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                title: 'Paramètres',
                headerStyle: { backgroundColor: Colors.surface },
                headerTintColor: Colors.text,
                headerShadowVisible: false,
            }} />

            <ScrollView contentContainerStyle={styles.content}>

                {/* Profile Photo Section */}
                <View style={styles.photoSection}>
                    <View style={styles.avatarContainer}>
                        {user?.profilePhoto ? (
                            <Image
                                source={{ uri: user.profilePhoto }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <LinearGradient
                                colors={['#FC5200', '#FF8A00']}
                                style={styles.avatarGradient}
                            >
                                <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
                            </LinearGradient>
                        )}
                        <TouchableOpacity style={styles.editBadge} onPress={handleChangePhoto}>
                            <Ionicons name="pencil" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>{user?.name || 'Utilisateur'}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'email@exemple.com'}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Préférences</Text>

                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
                            <Text style={styles.rowText}>Notifications</Text>
                        </View>
                        <Switch
                            value={notifications}
                            onValueChange={toggleNotifications}
                            trackColor={{ false: '#3e3e3e', true: Colors.primary }}
                            thumbColor={'#fff'}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="moon-outline" size={24} color={Colors.text} />
                            <Text style={styles.rowText}>Mode Sombre</Text>
                        </View>
                        <Switch
                            value={darkMode}
                            onValueChange={toggleDarkMode}
                            trackColor={{ false: '#3e3e3e', true: Colors.primary }}
                            thumbColor={'#fff'}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>À propos</Text>
                    <View style={styles.row}>
                        <Text style={styles.rowText}>Version</Text>
                        <Text style={styles.valueText}>1.1.0</Text>
                    </View>
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
    content: {
        padding: 20,
    },
    photoSection: {
        alignItems: 'center',
        paddingVertical: 32,
        marginBottom: 16,
    },
    avatarContainer: {
        marginBottom: 16,
        shadowColor: '#FC5200',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        position: 'relative',
    },
    avatarGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#fff',
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#fff',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FC5200',
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
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    section: {
        marginBottom: 24,
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        overflow: 'hidden',
    },
    sectionTitle: {
        color: Colors.textSecondary,
        fontSize: 12,
        textTransform: 'uppercase',
        marginBottom: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    rowText: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '500',
    },
    valueText: {
        color: Colors.textSecondary,
        fontSize: 16,
    },
});
