import React, { useState } from 'react';
import { useAdminEdit } from '../../../context/AdminEditContext';
import { isFirebaseConfigured, uploadImageToFirebase } from '../../../services/firebase';
import { Image, Upload, Check, X, Loader2 } from 'lucide-react';

export default function EditableImage({
  src,
  alt = '',
  path,
  onChange,
  className = '',
  imgClassName = '',
  aspectRatio = 'auto',
  style = {}
}) {
  const { isEditMode, isPreviewMode, showEditGuides, updateSiteField } = useAdminEdit();
  const [isOpen, setIsOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState(src || '');
  const [uploading, setUploading] = useState(false);

  const activeEditable = isEditMode && !isPreviewMode;

  const handleSave = () => {
    if (tempUrl.trim()) {
      if (onChange) {
        onChange(tempUrl.trim());
      } else if (path) {
        updateSiteField(path, tempUrl.trim());
      }
    }
    setIsOpen(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isFirebaseConfigured) {
      setUploading(true);
      try {
        const downloadUrl = await uploadImageToFirebase(file);
        setTempUrl(downloadUrl);
      } catch (err) {
        console.warn('Firebase Storage upload failed, falling back to data URL:', err);
        const reader = new FileReader();
        reader.onload = (event) => setTempUrl(event.target.result);
        reader.readAsDataURL(file);
      } finally {
        setUploading(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => setTempUrl(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`relative group ${className}`} style={{ ...style, aspectRatio }}>
      <img
        src={src}
        alt={alt}
        className={`${imgClassName} ${
          activeEditable && showEditGuides ? 'ring-2 ring-amber-500/40' : ''
        }`}
      />

      {/* Admin Edit Overlay Button */}
      {activeEditable && (
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-200 z-20 ${
            showEditGuides ? 'opacity-80 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setTempUrl(src || '');
              setIsOpen(true);
            }}
            className="px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg transform active:scale-95 transition cursor-pointer"
          >
            <Image className="w-3.5 h-3.5" />
            <span>이미지 교체</span>
          </button>
        </div>
      )}

      {/* Image Change Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 text-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <Image className="w-4 h-4" />
                이미지 변경하기
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  이미지 URL 또는 경로
                </label>
                <input
                  type="text"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  placeholder="/assets/image.png 또는 https://..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  내 컴퓨터에서 사진 업로드 {isFirebaseConfigured && '(Firebase Storage)'}
                </label>
                <label className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-dashed border-amber-500/40 rounded-lg cursor-pointer text-xs text-amber-300">
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <span>업로드 중...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>파일 찾아보기</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploading}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </>
                  )}
                </label>
              </div>

              {tempUrl && (
                <div className="pt-2">
                  <span className="block text-xs text-slate-400 mb-1">미리보기</span>
                  <div className="h-32 w-full rounded-lg overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <img src={tempUrl} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={uploading}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                적용하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
