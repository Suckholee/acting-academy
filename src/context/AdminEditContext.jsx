import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_SITE_CONTENT } from '../data/defaultSiteContent';
import {
  isFirebaseConfigured,
  fetchSiteContentFromFirebase,
  saveSiteContentToFirebase,
  createInquiryInFirebase,
  updateInquiryInFirebase
} from '../services/firebase';

const AdminEditContext = createContext(null);
const STORAGE_KEY_CONTENT = 'kjt_academy_site_content_v1';
const STORAGE_KEY_AUTH = 'kjt_academy_admin_auth';
const STORAGE_KEY_GUIDES = 'kjt_academy_show_guides';
const STORAGE_KEY_INQUIRIES = 'kjt_academy_inquiries';

function setDeepValue(obj, path, value) {
  if (!obj || typeof obj !== 'object') return obj;
  const parts = path.split('.');
  const next = Array.isArray(obj) ? [...obj] : { ...obj };
  let current = next;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const rawChild = current[key];
    const isArrayNext = !isNaN(Number(parts[i + 1]));
    current[key] = rawChild && typeof rawChild === 'object'
      ? (Array.isArray(rawChild) ? [...rawChild] : { ...rawChild })
      : (isArrayNext ? [] : {});
    current = current[key];
  }

  current[parts[parts.length - 1]] = value;
  return next;
}

export function AdminEditProvider({ children }) {
  // Load saved content from localStorage first as instant cache
  const [siteContent, setSiteContent] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONTENT);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load saved site content', e);
    }
    return DEFAULT_SITE_CONTENT;
  });

  const [siteDraft, setSiteDraft] = useState(siteContent);
  const [pendingChanges, setPendingChanges] = useState({ count: 0, hasChanges: false });

  // Legacy React editor is retired; production authentication lives in /admin/members.
  const [isAdmin, setIsAdmin] = useState(false);

  const [isEditMode, setIsEditMode] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('inquiries');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [firebaseConnected, setFirebaseConnected] = useState(isFirebaseConfigured);

  const [inquiries, setInquiries] = useState([]);
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
      localStorage.removeItem(STORAGE_KEY_INQUIRIES);
    } catch {}
  }, []);

  // On mount, sync site content and real-time inquiries from Firebase if configured
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    let unsubscribe = () => {};

    async function initFirebaseSync() {
      try {
        // 1. Fetch site content from Firestore
        const remoteContent = await fetchSiteContentFromFirebase();
        if (remoteContent) {
          setSiteContent(remoteContent);
          setSiteDraft(remoteContent);
          localStorage.setItem(STORAGE_KEY_CONTENT, JSON.stringify(remoteContent));
        }

        setFirebaseConnected(true);
      } catch (err) {
        console.warn('Initial Firebase sync failed, using local cache:', err);
      }
    }

    initFirebaseSync();
    return () => unsubscribe();
  }, []);

  const saveInquiries = (updated) => {
    setInquiries(updated);
  };

  const addInquiry = async (newInq) => {
    const record = {
      id: 'inq-' + Date.now(),
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: '신규',
      memo: '',
      ...newInq
    };
    const nextList = [record, ...inquiries];
    saveInquiries(nextList);

    // Sync to Firestore if connected
    if (isFirebaseConfigured) {
      try {
        const firestoreId = await createInquiryInFirebase(newInq);
        if (firestoreId) {
          record.id = firestoreId;
        }
      } catch (err) {
        console.warn('Failed to insert inquiry to Firebase:', err);
      }
    }

    return record;
  };

  const updateInquiryRecord = async (id, status, memo) => {
    const nextList = inquiries.map((item) =>
      item.id === id ? { ...item, ...(status !== undefined ? { status } : {}), ...(memo !== undefined ? { memo } : {}) } : item
    );
    saveInquiries(nextList);

    if (isFirebaseConfigured) {
      try {
        await updateInquiryInFirebase(id, status, memo);
      } catch (err) {
        console.warn('Failed to update inquiry in Firebase:', err);
      }
    }
  };

  // Edit Guides state
  const [showEditGuides, setShowEditGuides] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GUIDES);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleEditGuides = useCallback(() => {
    setShowEditGuides(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_GUIDES, String(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const login = () => {
    // No browser-side password or localStorage flag can grant administrator access.
    return false;
  };

  const logout = () => {
    setIsAdmin(false);
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    } catch (e) {}
  };

  // Update a single nested field
  const updateSiteField = useCallback((path, value) => {
    setSiteDraft(prev => {
      const next = setDeepValue(prev, path, value);
      return next;
    });
    setPendingChanges(prev => ({
      count: prev.count + 1,
      hasChanges: true
    }));
  }, []);

  // Save all changes to Firebase and LocalStorage
  const saveAllChanges = useCallback(async () => {
    setIsSaving(true);
    try {
      // 1. Save to LocalStorage
      localStorage.setItem(STORAGE_KEY_CONTENT, JSON.stringify(siteDraft));
      setSiteContent(siteDraft);
      setPendingChanges({ count: 0, hasChanges: false });

      // 2. Save to Firestore if configured
      if (isFirebaseConfigured) {
        await saveSiteContentToFirebase(siteDraft);
      }

      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 3000);
    } catch (error) {
      alert('저장 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  }, [siteDraft]);

  // Revert all unsaved changes
  const revertAllChanges = useCallback(() => {
    if (window.confirm('저장하지 않은 모든 수정사항을 취소하시겠습니까?')) {
      setSiteDraft(siteContent);
      setPendingChanges({ count: 0, hasChanges: false });
    }
  }, [siteContent]);

  // Reset to default factory content
  const resetToFactoryDefaults = useCallback(async () => {
    if (window.confirm('사이트 전체 내용을 초기 공장 기본값으로 리셋하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      setSiteContent(DEFAULT_SITE_CONTENT);
      setSiteDraft(DEFAULT_SITE_CONTENT);
      localStorage.removeItem(STORAGE_KEY_CONTENT);
      setPendingChanges({ count: 0, hasChanges: false });

      if (isFirebaseConfigured) {
        try {
          await saveSiteContentToFirebase(DEFAULT_SITE_CONTENT);
        } catch (e) {
          console.warn('Firebase reset failed:', e);
        }
      }

      alert('초기값으로 재설정되었습니다.');
    }
  }, []);

  const exportBackupJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(siteDraft, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `kjt_academy_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importBackupJSON = async (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      setSiteDraft(parsed);
      setSiteContent(parsed);
      localStorage.setItem(STORAGE_KEY_CONTENT, JSON.stringify(parsed));
      setPendingChanges({ count: 0, hasChanges: false });

      if (isFirebaseConfigured) {
        await saveSiteContentToFirebase(parsed);
      }

      alert('성공적으로 백업 데이터를 불러왔습니다.');
    } catch (e) {
      alert('JSON 파일 형식이 올바르지 않거나 저장에 실패했습니다.');
    }
  };

  return (
    <AdminEditContext.Provider
      value={{
        isAdmin,
        login,
        logout,
        isEditMode,
        rawEditMode: isEditMode,
        setIsEditMode,
        isPreviewMode,
        setIsPreviewMode,
        showEditGuides,
        toggleEditGuides,
        siteDraft,
        updateSiteField,
        pendingChanges,
        isSaving,
        saveSuccessNotice,
        saveAllChanges,
        revertAllChanges,
        resetToFactoryDefaults,
        isLoginModalOpen,
        setIsLoginModalOpen,
        isDrawerOpen,
        setIsDrawerOpen,
        drawerTab,
        setDrawerTab,
        inquiries,
        saveInquiries,
        addInquiry,
        updateInquiryRecord,
        exportBackupJSON,
        importBackupJSON,
        isFirebaseConfigured,
        firebaseConnected
      }}
    >
      {children}
    </AdminEditContext.Provider>
  );
}

export function useAdminEdit() {
  const context = useContext(AdminEditContext);
  if (!context) throw new Error('useAdminEdit requires AdminEditProvider');
  return context;
}
