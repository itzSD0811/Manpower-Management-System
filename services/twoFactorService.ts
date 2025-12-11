import { API_URL } from '../utils/apiConfig';

export interface TwoFactorStatus {
  enabled: boolean;
}

export interface TwoFactorSecret {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
}

export const get2FAStatus = async (): Promise<TwoFactorStatus> => {
  const response = await fetch(`${API_URL}/2fa/status`);
  if (!response.ok) {
    throw new Error('Failed to get 2FA status');
  }
  return response.json();
};

export const generate2FASecret = async (): Promise<TwoFactorSecret> => {
  const response = await fetch(`${API_URL}/2fa/generate-secret`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate 2FA secret');
  }
  return response.json();
};

export const enable2FA = async (secret: string, token: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_URL}/2fa/enable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ secret, token }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to enable 2FA');
  }
  return result;
};

export const verify2FA = async (token: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_URL}/2fa/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Invalid verification code');
  }
  return result;
};

export const disable2FA = async (token: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_URL}/2fa/disable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to disable 2FA');
  }
  return result;
};


