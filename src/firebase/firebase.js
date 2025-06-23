// src/firebase/firebase.js

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyChoqmOivZ8D5-50O3O6qP0OycosbQLP7Y',
  authDomain: 'cutalign.firebaseapp.com',
  projectId: 'cutalign',
  storageBucket: 'cutalign.firebasestorage.app',
  messagingSenderId: '550632214757',
  appId: '1:550632214757:web:f80fde40a87d98c79ec40c',
  measurementId: 'G-2Q3SKN5TVY',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db = getFirestore(app)
export const storage = getStorage(app)
