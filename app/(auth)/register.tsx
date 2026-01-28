import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { PrimaryButton } from '../../components/StyledComponents';

export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { signIn } = useAuth();
    const [isSigningUp, setIsSigningUp] = useState(false);

    const handleRegister = async () => {
        if (!email || !password || !name) return;
        setIsSigningUp(true);
        await signIn(email, name);
        setIsSigningUp(false);
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[Colors.background, '#1a1a1a']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.content}>
                <Text style={styles.title}>Rejoindre</Text>
                <Text style={styles.subtitle}>Commencez votre aventure.</Text>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Nom complet"
                            placeholderTextColor={Colors.textSecondary}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

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
                        title="Créer un compte"
                        onPress={handleRegister}
                        isLoading={isSigningUp}
                    />

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Déjà un compte ? </Text>
                        <Link href="/(auth)/login" asChild>
                            <TouchableOpacity>
                                <Text style={styles.link}>Se connecter</Text>
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
        fontSize: 42,
        fontWeight: '800',
        color: Colors.primary,
        textAlign: 'center',
        marginBottom: 8,
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
