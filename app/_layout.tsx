import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { AuthProvider } from '../context/AuthContext';
import { SettingsProvider } from '../context/SettingsContext';
import '../services/LocationService'; // Register background task

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [loaded] = useFonts({
        // Load custom fonts here if needed later
    });

    useEffect(() => {
        if (loaded) {
            // Init DB
            const initInfo = async () => {
                try {
                    const { initDatabase } = await import('../services/DatabaseService');
                    await initDatabase();
                } catch (e) {
                    console.error("DB Init failed", e);
                } finally {
                    SplashScreen.hideAsync();
                }
            };
            initInfo();
        }
    }, [loaded]);

    if (!loaded) {
        return null;
    }

    return (
        <AuthProvider>
            <SettingsProvider>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(app)" />
                </Stack>
            </SettingsProvider>
        </AuthProvider>
    );
}
