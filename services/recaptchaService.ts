import { API_URL } from '../utils/apiConfig';

export interface RecaptchaVerifyResponse {
  success: boolean;
  message: string;
  score?: number;
  errors?: string[];
}

/**
 * Verify reCAPTCHA token on the backend
 * @param token - The reCAPTCHA token from the frontend
 * @returns Promise with verification result
 */
export const verifyRecaptcha = async (token: string): Promise<RecaptchaVerifyResponse> => {
  const response = await fetch(`${API_URL}/recaptcha/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'reCAPTCHA verification failed');
  }
  
  return result;
};

