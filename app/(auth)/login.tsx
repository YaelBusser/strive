import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { PrimaryButton } from '../../components/StyledComponents';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { signIn } = useAuth();
    const [isSigningIn, setIsSigningIn] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) return;
        setIsSigningIn(true);
        // Extract name from email (before @) or use full email
        const userName = email.split('@')[0] || email;
        await signIn(email, userName);
        setIsSigningIn(false);
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[Colors.background, '#1a1a1a']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.content}>
                <Text style={styles.title}>Strive</Text>
                <Text style={styles.subtitle}>Repoussez vos limites.</Text>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor={Colors.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Mot de passe"
                            placeholderTextColor={Colors.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <PrimaryButton
                        title="Se connecter"
                        onPress={handleLogin}
                        isLoading={isSigningIn}
                    />

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Pas encore de compte ? </Text>
                        <Link href="/(auth)/register" asChild>
                            <TouchableOpacity>
                                <Text style={styles.link}>S'inscrire</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    title: {
        fontSize: 48,
        fontWeight: '800',
        color: Colors.primary,
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 18,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 48,
    },
    form: {
        gap: 16,
    },
    inputContainer: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    input: {
        padding: 16,
        color: Colors.text,
        fontSize: 16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    footerText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    link: {
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
});
