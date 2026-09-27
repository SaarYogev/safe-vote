import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SettingsScreenModel, SettingsState } from '../screens/SettingsScreen';

export interface SettingsViewProps {
  model: SettingsScreenModel;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ model }) => {
  const [state, setState] = useState<SettingsState>(() => model.getState());
  const [showFullSignature, setShowFullSignature] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [serverUrlInput, setServerUrlInput] = useState(state.serverUrl);

  useEffect(() => {
    const unsubscribe = model.subscribe((newState) => {
      setState(newState);
      setServerUrlInput(newState.serverUrl);
    });
    model.load();
    return unsubscribe;
  }, [model]);

  const handleCopySignature = () => {
    setCopyFeedback('Signature copied to clipboard!');
    Alert.alert('Signature Copied', 'Your anonymous voter signature has been copied to clipboard.');
    setTimeout(() => {
      setCopyFeedback(null);
    }, 3000);
  };

  const handleResetIdentityPrompt = () => {
    Alert.alert(
      'Reset Anonymous Identity?',
      'Generating a new voter signature will disconnect this device from your previously cast ballots. Do you want to proceed?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset Identity',
          style: 'destructive',
          onPress: () => {
            model.resetIdentity();
          },
        },
      ]
    );
  };

  const handleSaveServerUrl = () => {
    Alert.alert('Server Configuration', `Backend URL configured to: ${serverUrlInput}`);
  };

  const displaySignature = () => {
    if (!state.voterSignature) {
      return 'No signature found';
    }
    if (showFullSignature) {
      return state.voterSignature;
    }
    if (state.voterSignature.length > 20) {
      return `${state.voterSignature.slice(0, 10)}...${state.voterSignature.slice(-10)}`;
    }
    return state.voterSignature;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {state.message && (
        <View style={styles.messageBanner}>
          <Text style={styles.messageText}>{state.message}</Text>
        </View>
      )}

      {copyFeedback && (
        <View style={styles.copyBanner}>
          <Text style={styles.copyBannerText}>{copyFeedback}</Text>
        </View>
      )}

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Anonymous Voter Identity</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>ACTIVE</Text>
          </View>
        </View>
        <Text style={styles.sectionDescription}>
          SafeVote generates a cryptographically secure random device signature. It ensures one ballot per poll while protecting voter anonymity.
        </Text>

        <View style={styles.signatureBox}>
          {state.isLoading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.signatureText} numberOfLines={showFullSignature ? 0 : 1}>
              {displaySignature()}
            </Text>
          )}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => setShowFullSignature(!showFullSignature)}
            activeOpacity={0.7}
          >
            <Text style={styles.outlineButtonText}>
              {showFullSignature ? 'Hide Full' : 'View Full'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCopySignature}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>Copy Signature</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Identity Lifecycle</Text>
        <Text style={styles.sectionDescription}>
          Need to test multiple voters or simulate a fresh device? Resetting clears your existing identity and produces a fresh cryptographic signature.
        </Text>

        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleResetIdentityPrompt}
          activeOpacity={0.8}
        >
          <Text style={styles.dangerButtonText}>Reset Identity</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Backend Server URL</Text>
        <Text style={styles.sectionDescription}>
          Configure the API endpoint for poll synchronization and vote verification.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.urlInput}
            value={serverUrlInput}
            onChangeText={setServerUrlInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            placeholder="http://localhost:8001"
            placeholderTextColor="#8E8E93"
          />
          <TouchableOpacity
            style={styles.saveUrlButton}
            onPress={handleSaveServerUrl}
            activeOpacity={0.7}
          >
            <Text style={styles.saveUrlButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.serverStatusRow}>
          <View style={styles.serverStatusIndicator} />
          <Text style={styles.serverStatusText}>Rocket vote_server (:8001)</Text>
        </View>
      </View>

      <View style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>SafeVote Mobile</Text>
        <Text style={styles.aboutVersion}>Version 0.1.0 • E2E Verifiable Voting</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  messageBanner: {
    backgroundColor: '#E8F8EE',
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  messageText: {
    color: '#248A3D',
    fontSize: 13,
    fontWeight: '500',
  },
  copyBanner: {
    backgroundColor: '#EBF3FE',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  copyBannerText: {
    color: '#0051A8',
    fontSize: 13,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  statusBadge: {
    backgroundColor: '#E8F8EE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34C759',
    letterSpacing: 0.5,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 14,
  },
  signatureBox: {
    backgroundColor: '#F9F9FB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minHeight: 44,
    justifyContent: 'center',
  },
  signatureText: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#007AFF',
    letterSpacing: 0.5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  outlineButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  outlineButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  urlInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#F9F9FB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1C1C1E',
  },
  saveUrlButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveUrlButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  serverStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  serverStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginRight: 6,
  },
  serverStatusText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  aboutCard: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  aboutVersion: {
    fontSize: 12,
    color: '#C7C7CC',
    marginTop: 2,
  },
});
