import { supabase } from '@/supabase/client';

const BUCKET = 'LMS-files';

export async function uploadFile(file, folder = 'misc', onProgress) {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${timestamp}_${safeName}`;
  if (onProgress) onProgress(10);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  if (onProgress) onProgress(100);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, fileName: file.name, storagePath: path };
}

export async function deleteFile(storagePath) {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw error;
}
