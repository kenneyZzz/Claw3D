import { ZHINAO_API_BASE, getZhinaoAuthCode } from "@/lib/zhinao-api";

export interface UploadFileOptions {
  file: File;
  fileId?: string;
  path?: string;
  onUploadProgress?: (percent: number) => void;
}

export interface UploadFileResult {
  fileId: string;
  path: string;
  fileName: string;
  size: number;
  contentType: string;
  fileHash: string;
  downloadUrl?: string;
}

export async function uploadFile({
  file,
  fileId,
  path,
  onUploadProgress,
}: UploadFileOptions): Promise<UploadFileResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (fileId) formData.append('fileId', fileId);
  if (path) formData.append('path', path);
  formData.append('publicRead', 'true');
  formData.append('overwrite', 'true');
  formData.append('from', 'digital-office');

  onUploadProgress?.(0);

  const res = await fetch(`${ZHINAO_API_BASE}/admin/storage/upload/public`, {
    method: 'POST',
    headers: {
      // Authorization: AUTHORIZATION,
      'X-Auth-Code': getZhinaoAuthCode(),
    },
    body: formData,
  });

  onUploadProgress?.(90);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`上传失败 (${res.status}): ${text}`);
  }

  const json = await res.json();

  if (json.code !== 0) {
    throw new Error(json.message || '上传失败');
  }

  onUploadProgress?.(100);

  const data = json.data;
  return {
    fileId: data.fileId || '',
    path: data.path || '',
    fileName: data.fileName || file.name,
    size: data.size || file.size,
    contentType: data.contentType || file.type,
    fileHash: data.fileHash || '',
    downloadUrl: data.downloadUrl || '',
  };
}
