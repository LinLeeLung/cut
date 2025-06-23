// src/firebase/syncUser.js
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

export async function syncUser(user) {
  if (!user || !user.uid) return

  const userRef = doc(db, 'users', user.uid)
  const snapshot = await getDoc(userRef)

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      isPro: false,
      subscribedAt: null,
      expiresAt: null,
    })
  }
}
