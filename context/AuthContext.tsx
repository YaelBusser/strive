import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';

type User = {
    id: string;
    name: string;
    email: string;
    profilePhoto?: string;
};

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    signIn: (email: string, name: string) => Promise<void>;
    signOut: () => Promise<void>;
    updateProfilePhoto: (uri: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    signIn: async () => { },
    signOut: async () => { },
    updateProfilePhoto: async () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        const loadUser = async () => {
            try {
                const storedUser = await AsyncStorage.getItem('user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (e) {
                console.error('Failed to load user', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!user && !inAuthGroup) {
            // Redirect to the login page if not signed in
            router.replace('/(auth)/login');
        } else if (user && inAuthGroup) {
            // Redirect to the home page if already signed in
            router.replace('/(app)/');
        }
    }, [user, segments, isLoading]);

    const signIn = async (email: string, name: string) => {
        const newUser = { id: Date.now().toString(), email, name };
        setUser(newUser);
        await AsyncStorage.setItem('user', JSON.stringify(newUser));
    };

    const signOut = async () => {
        setUser(null);
        await AsyncStorage.removeItem('user');
    };

    const updateProfilePhoto = async (uri: string) => {
        if (user) {
            const updatedUser = { ...user, profilePhoto: uri };
            setUser(updatedUser);
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signOut, updateProfilePhoto }}>
            {children}
        </AuthContext.Provider>
    );
}
