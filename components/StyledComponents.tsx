import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';

interface PrimaryButtonProps {
    title: string;
    onPress: () => void;
    isLoading?: boolean;
    style?: ViewStyle;
}

export const PrimaryButton = ({ title, onPress, isLoading, style }: PrimaryButtonProps) => (
    <TouchableOpacity onPress={onPress} disabled={isLoading} style={[styles.container, style]}>
        <LinearGradient
            colors={Colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
        >
            {isLoading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.text}>{title}</Text>
            )}
        </LinearGradient>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 10,
    },
    gradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    }
});
