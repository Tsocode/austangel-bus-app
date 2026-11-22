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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Admin promotion failed. Please try again.',
    };
  }
}
