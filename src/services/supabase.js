import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('YOUR_PROJECT')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

/**
 * Supabase에서 사이트 CMS 콘텐츠를 조회합니다.
 */
export async function fetchSiteContentFromSupabase() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('academy_cms')
      .select('value')
      .eq('key', 'pages')
      .maybeSingle();

    if (error) throw error;
    if (data && data.value && Object.keys(data.value).length > 0) {
      return data.value;
    }
    return null;
  } catch (err) {
    console.warn('[Supabase] Failed to fetch site content:', err.message);
    return null;
  }
}

/**
 * Supabase에 사이트 CMS 콘텐츠를 저장합니다.
 */
export async function saveSiteContentToSupabase(content) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('academy_cms')
      .upsert(
        {
          key: 'pages',
          value: content,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'key' }
      );

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[Supabase] Failed to save site content:', err.message);
    throw err;
  }
}

/**
 * Supabase에서 상담 신청 목록을 조회합니다.
 */
export async function fetchInquiriesFromSupabase() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('academy_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      purposes: Array.isArray(row.purposes) ? row.purposes : [],
      courses: Array.isArray(row.courses) ? row.courses : [],
      status: row.status || '신규',
      memo: row.memo || '',
      createdAt: row.created_at ? new Date(row.created_at).toISOString().replace('T', ' ').substring(0, 16) : ''
    }));
  } catch (err) {
    console.warn('[Supabase] Failed to fetch inquiries:', err.message);
    return null;
  }
}

/**
 * 방문자 상담 신청을 Supabase에 등록합니다.
 */
export async function createInquiryInSupabase(inquiry) {
  if (!supabase) return null;
  try {
    const payload = {
      name: inquiry.name,
      phone: inquiry.phone,
      purposes: inquiry.purposes || [],
      courses: inquiry.courses || [],
      consent: true,
      status: inquiry.status || '신규',
      memo: inquiry.memo || ''
    };

    const { data, error } = await supabase
      .from('academy_inquiries')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[Supabase] Failed to create inquiry:', err.message);
    throw err;
  }
}

/**
 * 상담 신청 상태 및 메모를 업데이트합니다.
 */
export async function updateInquiryInSupabase(id, status, memo) {
  if (!supabase) return false;
  try {
    const updatePayload = {};
    if (status !== undefined) updatePayload.status = status;
    if (memo !== undefined) updatePayload.memo = memo;

    const { error } = await supabase
      .from('academy_inquiries')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[Supabase] Failed to update inquiry:', err.message);
    throw err;
  }
}

/**
 * 이미지를 Supabase Storage 버킷에 업로드하고 공개 URL을 반환합니다.
 */
export async function uploadImageToSupabase(file) {
  if (!supabase) throw new Error('Supabase가 연결되지 않았습니다.');
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('academy-site-media')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('academy-site-media')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('[Supabase] Image upload failed:', err.message);
    throw err;
  }
}
