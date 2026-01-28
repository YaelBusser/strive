import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SettingsContextType = {
    notifications: boolean;
    darkMode: boolean;
    toggleNotifications: () => void;
    toggleDarkMode: () => void;
};

const SettingsContext = createContext<SettingsContextType>({} as SettingsContextType);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(true);

    useEffect(() => {
        // Load settings
        (async () => {
            try {
                const stored = await AsyncStorage.getItem('user_settings');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setNotifications(parsed.notifications ?? true);
                    setDarkMode(parsed.darkMode ?? true);
                }
            } catch (e) {
                console.error("Failed to load settings", e);
            }
        })();
    }, []);

    const saveSettings = async (newSettings: any) => {
        try {
            await AsyncStorage.setItem('user_settings', JSON.stringify(newSettings));
        } catch (e) {
            console.error("Failed to save settings", e);
        }
    };

    const toggleNotifications = () => {
        setNotifications(prev => {
            const val = !prev;
            saveSettings({ notifications: val, darkMode });
            return val;
        });
    };

    const toggleDarkMode = () => {
        setDarkMode(prev => {
            const val = !prev;
            saveSettings({ notifications, darkMode: val });
            return val;
        });
    };

    return (
        <SettingsContext.Provider value={{
            notifications,
            darkMode,
            toggleNotifications,
            toggleDarkMode
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => useContext(SettingsContext);
