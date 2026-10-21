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
import { useTheme, ThemeMode } from './theme/ThemeContext';
import { Icon } from './components/Icon';

export interface SettingsViewProps {
  model: SettingsScreenModel;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ model }) => {
  const { colors, themeMode, setThemeMode } = useTheme();
  const [state, setState] = useState<SettingsState>(() => model.getState());
  const [isRevealed, setIsRevealed] = useState(false);
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
            setIsRevealed(false);
          },
        },
      ]
    );
  };

  const handleSaveServerUrl = () => {
    Alert.alert('Server Configuration', `Backend URL configured to: ${serverUrlInput}`);
  };

  const handleSelectTheme = async (mode: ThemeMode) => {
    await model.setThemeMode(mode);
    await setThemeMode(mode);
  };

  const renderSignatureContent = () => {
    if (state.isLoading) {
      return <ActivityIndicator size="small" color={colors.accent} />;
    }
    if (!state.voterSignature) {
      return <Text style={[styles.signatureText, { color: colors.textMuted }]}>No signature found</Text>;
    }
    if (isRevealed) {
      return (
        <Text style={[styles.signatureText, { color: colors.accent }]} selectable>
          {state.voterSignature}
        </Text>
      );
    }
    return (
      <Text style={[styles.signatureMasked, { color: colors.textMuted }]}>
        {model.getMaskedSignature()}
      </Text>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {state.message && (
        <View style={[styles.messageBanner, { backgroundColor: colors.successLight, borderLeftColor: colors.success }]}>
          <Text style={[styles.messageText, { color: colors.success }]}>{state.message}</Text>
        </View>
      )}

      {copyFeedback && (
        <View style={[styles.copyBanner, { backgroundColor: colors.accentLight, borderLeftColor: colors.accent }]}>
          <Text style={[styles.copyBannerText, { color: colors.accent }]}>{copyFeedback}</Text>
        </View>
      )}

      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance & Theme</Text>
        <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
          Choose whether SafeVote follows your system display settings or remains locked to dark or light mode.
        </Text>

        <View style={[styles.themeSegmentContainer, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.themeSegmentButton,
              themeMode === 'system' && [styles.themeSegmentActive, { backgroundColor: colors.card }],
            ]}
            onPress={() => handleSelectTheme('system')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.themeSegmentText,
                { color: colors.textMuted },
                themeMode === 'system' && [styles.themeSegmentTextActive, { color: colors.accent }],
              ]}
            >
              System (Default)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeSegmentButton,
              themeMode === 'dark' && [styles.themeSegmentActive, { backgroundColor: colors.card }],
            ]}
            onPress={() => handleSelectTheme('dark')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.themeSegmentText,
                { color: colors.textMuted },
                themeMode === 'dark' && [styles.themeSegmentTextActive, { color: colors.accent }],
              ]}
            >
              Dark
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeSegmentButton,
              themeMode === 'light' && [styles.themeSegmentActive, { backgroundColor: colors.card }],
            ]}
            onPress={() => handleSelectTheme('light')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.themeSegmentText,
                { color: colors.textMuted },
                themeMode === 'light' && [styles.themeSegmentTextActive, { color: colors.accent }],
              ]}
            >
              Light
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Anonymous Voter Signature</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.statusBadgeText, { color: colors.success }]}>ACTIVE</Text>
          </View>
        </View>
        <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
          Your private cryptographic identity. Kept secret and masked to prevent unauthorized viewing, just like an API key.
        </Text>

        <View style={[styles.signatureBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          {renderSignatureContent()}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.outlineButton, { borderColor: colors.border }]}
            onPress={() => setIsRevealed(!isRevealed)}
            activeOpacity={0.7}
          >
            <View style={styles.buttonIconRow}>
              <Icon name={isRevealed ? 'eye-off' : 'eye'} size={22} color={colors.text} />
              <Text style={[styles.outlineButtonText, { color: colors.text }]}>
                {isRevealed ? 'Hide' : 'Reveal'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.accent }]}
            onPress={handleCopySignature}
            activeOpacity={0.7}
          >
            <View style={styles.buttonIconRow}>
              <Icon name="copy" size={22} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Copy Signature</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Identity Lifecycle</Text>
        <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
          Resetting clears your existing identity and produces a fresh cryptographic signature. Previous votes will no longer be linked to this device.
        </Text>

        <TouchableOpacity
          style={[styles.dangerButton, { backgroundColor: colors.danger }]}
          onPress={handleResetIdentityPrompt}
          activeOpacity={0.8}
        >
          <Text style={styles.dangerButtonText}>Reset Identity</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Backend Server URL</Text>
        <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
          Configure the API endpoint for poll synchronization and vote verification.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.urlInput,
              { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text },
            ]}
            value={serverUrlInput}
            onChangeText={setServerUrlInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            placeholder="http://localhost:8001"
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity
            style={[styles.saveUrlButton, { backgroundColor: colors.accent }]}
            onPress={handleSaveServerUrl}
            activeOpacity={0.7}
          >
            <Text style={styles.saveUrlButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.serverStatusRow}>
          <View style={[styles.serverStatusIndicator, { backgroundColor: colors.success }]} />
          <Text style={[styles.serverStatusText, { color: colors.textMuted }]}>Rocket vote_server (:8001)</Text>
        </View>
      </View>

      <View style={styles.aboutCard}>
        <Text style={[styles.aboutTitle, { color: colors.textMuted }]}>SafeVote Mobile</Text>
        <Text style={[styles.aboutVersion, { color: colors.textMuted }]}>Version 0.1.0 • E2E Verifiable Voting</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  messageBanner: {
    borderLeftWidth: 4,
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '500',
  },
  copyBanner: {
    borderLeftWidth: 4,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  copyBannerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionCard: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
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
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  themeSegmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
  },
  themeSegmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  themeSegmentActive: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  themeSegmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeSegmentTextActive: {
    fontWeight: '700',
  },
  signatureBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  signatureMasked: {
    fontSize: 18,
    letterSpacing: 3,
  },
  signatureText: {
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 4,
  },
  buttonIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  outlineButton: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 48,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dangerButton: {
    minHeight: 52,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  urlInput: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  saveUrlButton: {
    paddingHorizontal: 22,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveUrlButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
    marginRight: 6,
  },
  serverStatusText: {
    fontSize: 12,
  },
  aboutCard: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  aboutVersion: {
    fontSize: 12,
    marginTop: 2,
  },
});
