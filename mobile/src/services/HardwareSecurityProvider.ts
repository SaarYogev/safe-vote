export interface HardwareAccessControl {
  biometryCurrentSetOnly: boolean;
  disableDeviceFallback: boolean;
  requireUserPresence?: boolean;
}

export interface HardwareKeyPairConfig {
  keyTag: string;
  accessControl: HardwareAccessControl;
}

export interface HardwareKeyPairResult {
  publicKey: string;
  keyTag: string;
}

export interface HardwareSecurityProvider {
  isBiometricsSupported(): Promise<boolean>;
  hasHardwareSecurity(): Promise<boolean>;
  generateHardwareKeyPair(config: HardwareKeyPairConfig): Promise<HardwareKeyPairResult>;
  signWithBiometrics(keyTag: string, payload: string): Promise<string>;
}
