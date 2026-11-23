import { httpsCallable } from 'firebase/functions';

import { functions } from '@/services/firebase';

type PromotionResponse = { success: boolean; message?: string; error?: string };

const promoteToAdmin = httpsCallable<{ adminCode: string }, PromotionResponse>(
  functions,
  'promoteToAdmin'
);

export async function promoteToAdminSecure(adminCode: string): Promise<PromotionResponse> {
  try {
    const response = await promoteToAdmin({ adminCode: adminCode.trim() });
    return response.data;
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
    const serverMessage = error instanceof Error ? error.message : '';
    const cleanServerMessage = serverMessage.replace(/^functions\/[a-z-]+:\s*/i, '');
    let message = cleanServerMessage || 'Admin promotion failed. Please try again.';

    if (code.endsWith('/unauthenticated')) {
      message = 'Your session has expired. Sign in again, then retry.';
    } else if (code.endsWith('/permission-denied')) {
      message = 'That admin code is incorrect. Check it and try again.';
    } else if (code.endsWith('/resource-exhausted')) {
      message = 'Too many attempts. Wait an hour before trying again.';
    } else if (code.endsWith('/failed-precondition') && !cleanServerMessage) {
      message = 'Admin promotion is not configured on the server. Ask the app owner to set the Firebase admin secret and deploy Functions.';
    } else if (code.endsWith('/unavailable') || code.endsWith('/deadline-exceeded')) {
      message = 'Could not reach the server. Check your connection and try again.';
    }

    return {
      success: false,
      error: message,
    };
  }
}
