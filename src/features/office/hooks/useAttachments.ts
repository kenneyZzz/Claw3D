'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ChatFile } from '@/features/office/types/chat';
import { uploadFile } from '@/features/office/hooks/uploadZhinaoFile';

export interface PendingAttachmentFile {
  uid: string;
  name: string;
  size: number;
  type: string;
  status: 'done' | 'error' | 'uploading';
  percent: number;
  attachment?: ChatFile;
  errorMessage?: string;
  originFile?: File;
}

function createUploadUid(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
}

function createPendingFile(file: File): PendingAttachmentFile {
  return {
    uid: createUploadUid(file),
    name: file.name,
    size: file.size,
    type: file.type,
    status: 'uploading',
    percent: 0,
    originFile: file,
  };
}

function buildChatFile(file: File, result: Awaited<ReturnType<typeof uploadFile>>): ChatFile {
  const name = result.fileName || file.name;
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return {
    fileType: ext,
    fileName: name,
    filePath: result.downloadUrl || '',
    desc: '',
  };
}

export function useAttachments() {
  const [fileList, setFileList] = useState<PendingAttachmentFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isUploadingAttachments = useMemo(
    () => fileList.some((f) => f.status === 'uploading'),
    [fileList],
  );

  const hasFailedAttachments = useMemo(
    () => fileList.some((f) => f.status === 'error'),
    [fileList],
  );

  const updatePendingFile = useCallback(
    (uid: string, updater: (f: PendingAttachmentFile) => PendingAttachmentFile) => {
      setFileList((prev) => prev.map((f) => (f.uid === uid ? updater(f) : f)));
    },
    [],
  );

  const uploadPendingFile = useCallback(
    async (pending: PendingAttachmentFile) => {
      const originFile = pending.originFile;
      if (!originFile) return;

      try {
        const result = await uploadFile({
          file: originFile,
          onUploadProgress: (percent) => {
            updatePendingFile(pending.uid, (f) => ({
              ...f,
              percent,
              status: 'uploading',
            }));
          },
        });

        const attachment = buildChatFile(originFile, result);
        if (!attachment.filePath) {
          throw new Error('附件上传后未返回可访问地址');
        }

        updatePendingFile(pending.uid, (f) => ({
          ...f,
          attachment,
          percent: 100,
          status: 'done',
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '上传失败';
        updatePendingFile(pending.uid, (f) => ({
          ...f,
          errorMessage,
          status: 'error',
        }));
      }
    },
    [updatePendingFile],
  );

  const enqueueFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const pendingFiles = files.map(createPendingFile);
      setFileList((prev) => [...prev, ...pendingFiles]);
      await Promise.allSettled(pendingFiles.map((f) => uploadPendingFile(f)));
    },
    [uploadPendingFile],
  );

  const handleRemoveFile = useCallback((uid: string) => {
    setFileList((prev) => prev.filter((f) => f.uid !== uid));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (dragLeaveTimer.current) {
      clearTimeout(dragLeaveTimer.current);
      dragLeaveTimer.current = null;
    }
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    dragLeaveTimer.current = setTimeout(() => setIsDragging(false), 100);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = e.dataTransfer?.files;
      if (!droppedFiles || droppedFiles.length === 0) return;
      void enqueueFiles([...droppedFiles]);
    },
    [enqueueFiles],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of items) {
        if (item.kind !== 'file') continue;
        const file = item.getAsFile();
        if (file) files.push(file);
      }
      if (files.length === 0) return;
      e.preventDefault();
      void enqueueFiles(files);
    },
    [enqueueFiles],
  );

  const handleFileSelect = useCallback(
    (files: FileList) => {
      void enqueueFiles([...files]);
    },
    [enqueueFiles],
  );

  const getCompletedAttachments = useCallback((): ChatFile[] => {
    return fileList
      .map((f) => f.attachment)
      .filter((a): a is ChatFile => !!a);
  }, [fileList]);

  const clearAttachments = useCallback(() => {
    setFileList([]);
    setIsDragging(false);
  }, []);

  const ensureReadyForSend = useCallback((): boolean => {
    if (isUploadingAttachments) return false;
    if (hasFailedAttachments) return false;
    return true;
  }, [isUploadingAttachments, hasFailedAttachments]);

  return {
    fileList,
    isDragging,
    isUploadingAttachments,
    hasFailedAttachments,
    handleRemoveFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
    handleFileSelect,
    getCompletedAttachments,
    clearAttachments,
    ensureReadyForSend,
  };
}
