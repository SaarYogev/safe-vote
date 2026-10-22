import { IdentityService, StorageProvider } from '../src/services/IdentityService';

class MockStorageProvider implements StorageProvider {
  private store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe('IdentityService Seam', () => {
  let storage: MockStorageProvider;
  let identityService: IdentityService;

  beforeEach(() => {
    storage = new MockStorageProvider();
    identityService = new IdentityService(storage);
  });

  it('generates a new unique voter signature if none exists in storage', async () => {
    const signature = await identityService.getOrCreateVoterSignature();

    expect(signature).toBeDefined();
    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(8);

    const stored = await storage.getItem('safe_vote_voter_signature');
    expect(stored).toBe(signature);
  });

  it('restores existing voter signature from storage on subsequent calls', async () => {
    await storage.setItem('safe_vote_voter_signature', 'existing_test_signature_xyz');

    const signature = await identityService.getOrCreateVoterSignature();
    expect(signature).toBe('existing_test_signature_xyz');
  });

  it('creates deterministic vote signature payload for ballot submission', async () => {
    await storage.setItem('safe_vote_voter_signature', 'voter_alice_sig');

    const signedPayload = await identityService.createBallotPayload({
      choiceUuid: 'choice-1234-uuid',
      pollUuid: 'poll-5678-uuid',
    });

    expect(signedPayload).toEqual({
      signature: 'voter_alice_sig',
      choice_uuid: 'choice-1234-uuid',
    });
  });

  it('allows resetting identity to simulate a new voter device', async () => {
    const firstSig = await identityService.getOrCreateVoterSignature();
    await identityService.resetIdentity();

    const secondSig = await identityService.getOrCreateVoterSignature();
    expect(secondSig).not.toBe(firstSig);
  });

  describe('Secure Enclave & Strict Biometric Enforcement', () => {
    it('generates hardware-backed cryptographic keypair on biometric capable device', async () => {
      const hardwareProvider = {
        isBiometricsSupported: jest.fn().mockResolvedValue(true),
        hasHardwareSecurity: jest.fn().mockResolvedValue(true),
        generateHardwareKeyPair: jest.fn().mockResolvedValue({
          publicKey: 'a'.repeat(64),
          keyTag: 'safe_vote_enclave_key',
        }),
        signWithBiometrics: jest.fn().mockResolvedValue('b'.repeat(128)),
      };

      const enclaveService = new IdentityService(storage, hardwareProvider);
      const publicKey = await enclaveService.getOrCreateHardwarePublicKey();

      expect(publicKey).toBe('a'.repeat(64));
      expect(hardwareProvider.generateHardwareKeyPair).toHaveBeenCalledWith(
        expect.objectContaining({
          keyTag: 'safe_vote_enclave_key',
          accessControl: expect.objectContaining({
            biometryCurrentSetOnly: true,
            disableDeviceFallback: true,
          }),
        })
      );
    });

    it('blocks device passcode/PIN fallback and fails if biometrics are cancelled or not matched', async () => {
      const hardwareProvider = {
        isBiometricsSupported: jest.fn().mockResolvedValue(true),
        hasHardwareSecurity: jest.fn().mockResolvedValue(true),
        generateHardwareKeyPair: jest.fn().mockResolvedValue({
          publicKey: 'a'.repeat(64),
          keyTag: 'safe_vote_enclave_key',
        }),
        signWithBiometrics: jest.fn().mockRejectedValue(new Error('Biometric authentication failed: Device passcode fallback blocked')),
      };

      const enclaveService = new IdentityService(storage, hardwareProvider);
      await expect(
        enclaveService.signVoteBallot({
          pollUuid: 'poll-1',
          choiceUuid: 'choice-1',
          timestamp: 1700000000,
          nonce: 'test_nonce',
        })
      ).rejects.toThrow('Device passcode fallback blocked');
    });

    it('rejects signing when biometric enrollment template is modified after key generation', async () => {
      const hardwareProvider = {
        isBiometricsSupported: jest.fn().mockResolvedValue(true),
        hasHardwareSecurity: jest.fn().mockResolvedValue(true),
        generateHardwareKeyPair: jest.fn().mockResolvedValue({
          publicKey: 'a'.repeat(64),
          keyTag: 'safe_vote_enclave_key',
        }),
        signWithBiometrics: jest.fn().mockRejectedValue(new Error('Key permanently invalidated: Biometric database modified (kSecAccessControlBiometryCurrentSet)')),
      };

      const enclaveService = new IdentityService(storage, hardwareProvider);
      await expect(
        enclaveService.signVoteBallot({
          pollUuid: 'poll-1',
          choiceUuid: 'choice-1',
          timestamp: 1700000000,
          nonce: 'test_nonce',
        })
      ).rejects.toThrow('Key permanently invalidated');
    });
  });
});

