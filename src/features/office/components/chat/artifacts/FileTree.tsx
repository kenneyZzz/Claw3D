'use client';

import { useMemo } from 'react';

interface FileTreeProps {
  content: any;
  metadata?: Record<string, any>;
}

interface TreeNodeData {
  name: string;
  type?: string;
  size?: string;
  children?: TreeNodeData[];
}

function TreeNode({ node, depth }: { node: TreeNodeData; depth: number }) {
  const isDir = node.type === 'directory';
  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-0.5 hover:bg-[var(--bg)] transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span style={{ color: isDir ? '#f0a732' : 'var(--text-muted)' }}>
          {isDir ? '📁' : '📄'}
        </span>
        <span className="text-[var(--text)] text-[13px]">
          {node.name}
          {node.size && <span className="text-[var(--text-muted)] text-[11px] ml-1">({node.size})</span>}
        </span>
      </div>
      {isDir && node.children?.map((child, i) => (
        <TreeNode key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function FileTree({ content, metadata }: FileTreeProps) {
  const parsed = useMemo(() => {
    let data = content;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return null; }
    }
    return data as TreeNodeData | null;
  }, [content]);

  if (!parsed) return null;

  return (
    <div className="overflow-hidden">
      {metadata?.title && (
        <div className="font-semibold text-[13px] text-[var(--text)] py-2">{metadata.title}</div>
      )}
      <div className="py-2 text-[13px]">
        <TreeNode node={parsed} depth={0} />
      </div>
    </div>
  );
}
