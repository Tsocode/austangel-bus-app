import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

import { AustangelUser } from '@/models/user';
import { db } from '@/services/firebase';

const USERS_COLLECTION = 'users';

export async function getUserProfile(uid: string): Promise<AustangelUser | null> {
  const ref = doc(db, USERS_COLLECTION, uid);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    id: snapshot.id,
    email: data.email ?? '',
    role: data.role,
    firstName: data.firstName,
    lastName: data.lastName,
    displayName: data.displayName,
    assignedBusId: data.assignedBusId,
    childIds: data.childIds,
    phoneNumber: data.phoneNumber,
    photoURL: data.photoURL,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  } as AustangelUser;
}

export async function upsertUserProfile(user: AustangelUser): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, user.id);
  await setDoc(
    ref,
    {
      email: user.email,
      role: user.role,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      displayName: user.displayName,
      assignedBusId: user.assignedBusId ?? null,
      childIds: user.childIds ?? [],
      phoneNumber: user.phoneNumber ?? null,
      photoURL: user.photoURL ?? null,
      createdAt: user.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

export async function updateUserDisplayName(uid: string, displayName: string): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, uid);
  await updateDoc(ref, {
    displayName,
    updatedAt: Date.now(),
  });
}
