import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.projectId.includes('YOUR_PROJECT')
);

// Firebase 싱글톤 초기화
export const app = isFirebaseConfigured
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
  : null;

export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;

/**
 * Firestore에서 사이트 CMS 콘텐츠를 조회합니다.
 * 컬렉션: academy_cms, 문서: pages
 */
export async function fetchSiteContentFromFirebase() {
  if (!db) return null;
  try {
    const docRef = doc(db, 'academy_cms', 'pages');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn('[Firebase] Failed to fetch site content:', err.message);
    return null;
  }
}

/**
 * Firestore에 사이트 CMS 콘텐츠를 저장합니다.
 */
export async function saveSiteContentToFirebase(content) {
  if (!db) return false;
  try {
    const docRef = doc(db, 'academy_cms', 'pages');
    await setDoc(docRef, {
      ...content,
      _updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('[Firebase] Failed to save site content:', err.message);
    throw err;
  }
}

/**
 * Firestore에서 상담 신청 목록을 실시간 구독(onSnapshot)합니다.
 * 새로운 상담 신청이 등록되거나 수정되면 콜백이 즉시 호출됩니다.
 */
export function subscribeInquiriesFromFirebase(onUpdate) {
  if (!db) return () => {};
  try {
    const colRef = collection(db, 'academy_inquiries');
    const q = query(colRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        let createdStr = '';
        if (data.createdAt?.toDate) {
          createdStr = data.createdAt.toDate().toISOString().replace('T', ' ').substring(0, 16);
        } else if (typeof data.createdAt === 'string') {
          createdStr = data.createdAt;
        }

        return {
          id: d.id,
          name: data.name || '',
          phone: data.phone || '',
          purposes: Array.isArray(data.purposes) ? data.purposes : [],
          courses: Array.isArray(data.courses) ? data.courses : [],
          status: data.status || '신규',
          memo: data.memo || '',
          createdAt: createdStr
        };
      });
      onUpdate(items);
    }, (err) => {
      console.warn('[Firebase] Inquiry snapshot error:', err.message);
    });
  } catch (err) {
    console.warn('[Firebase] Failed to subscribe inquiries:', err.message);
    return () => {};
  }
}

/**
 * 방문자 상담 신청을 Firestore에 등록합니다.
 */
export async function createInquiryInFirebase(inquiry) {
  if (!db) return null;
  try {
    const colRef = collection(db, 'academy_inquiries');
    const docRef = await addDoc(colRef, {
      name: inquiry.name,
      phone: inquiry.phone,
      purposes: inquiry.purposes || [],
      courses: inquiry.courses || [],
      consent: true,
      status: inquiry.status || '신규',
      memo: inquiry.memo || '',
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    console.error('[Firebase] Failed to create inquiry:', err.message);
    throw err;
  }
}

/**
 * 상담 신청 상태 및 메모를 업데이트합니다.
 */
export async function updateInquiryInFirebase(id, status, memo) {
  if (!db) return false;
  try {
    const docRef = doc(db, 'academy_inquiries', id);
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (memo !== undefined) updateData.memo = memo;
    updateData._updatedAt = serverTimestamp();

    await updateDoc(docRef, updateData);
    return true;
  } catch (err) {
    console.error('[Firebase] Failed to update inquiry:', err.message);
    throw err;
  }
}

/**
 * 이미지를 Firebase Storage에 업로드하고 다운로드 URL을 반환합니다.
 */
export async function uploadImageToFirebase(file) {
  if (!storage) throw new Error('Firebase Storage가 연결되지 않았습니다.');
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `academy_media/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const storageRef = ref(storage, fileName);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (err) {
    console.error('[Firebase] Image upload failed:', err.message);
    throw err;
  }
}
