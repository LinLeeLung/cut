import { storage, db, auth } from './firebase'
import { uploadBytes, getDownloadURL, ref as storageRef } from 'firebase/storage'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { getDoc, doc } from 'firebase/firestore'

// 上傳檔案並儲存 metadata 到 Firestore
export async function uploadWithMetadata(file) {
  const user = auth.currentUser
  if (!user) throw new Error('尚未登入，無法上傳檔案')

  // 檢查是否為進階會員
  const userDoc = await getDoc(doc(db, 'users', user.uid))
  if (!userDoc.exists()) throw new Error('找不到使用者資料')
  const data = userDoc.data()
  if (!data.isPro) throw new Error('只有進階會員才能上傳圖片')

  // 準備 Storage 上傳參考
  const filePath = `uploads/${Date.now()}_${file.name}`
  const fileRef = storageRef(storage, filePath)

  // 上傳檔案
  await uploadBytes(fileRef, file)
  const downloadURL = await getDownloadURL(fileRef)

  // 寫入 Firestore metadata
  await addDoc(collection(db, 'uploads'), {
    fileName: file.name,
    url: downloadURL,
    path: filePath,
    uploadedBy: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
    },
    uploadedAt: serverTimestamp(),
  })

  return downloadURL
}
