'use client';

import { useMemo } from 'react';
import type { ArtifactInfo } from '@/features/office/types/chat';
import { CodeBlock } from './artifacts/CodeBlock';
import { TextBlock } from './artifacts/TextBlock';
import { JsonViewer } from './artifacts/JsonViewer';
import { DataTable } from './artifacts/DataTable';
import { CsvTable } from './artifacts/CsvTable';
import { ImageViewer } from './artifacts/ImageViewer';
import { HtmlPreview } from './artifacts/HtmlPreview';
import { SvgRenderer } from './artifacts/SvgRenderer';
import { SearchResults } from './artifacts/SearchResults';
import { FileTree } from './artifacts/FileTree';
import { ToolCard } from './artifacts/ToolCard';
import { BrowserSnapshot } from './artifacts/BrowserSnapshot';
import { CustomRenderer } from './artifacts/CustomRenderer';
import { DiagramRenderer } from './artifacts/DiagramRenderer';
import { ChartRenderer } from './artifacts/ChartRenderer';
import { KnowledgeFiles } from './artifacts/KnowledgeFiles';
import { ChatMarkdown } from './ChatMarkdown';

interface ArtifactRendererProps {
  artifact: ArtifactInfo;
  streaming?: boolean;
}

export function ArtifactRenderer({
  artifact,
  streaming,
}: ArtifactRendererProps) {
  const parsedContent = useMemo(() => {
    let content = artifact.content;
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch {
        /* keep as string */
      }
    }
    return content;
  }, [artifact.content]);

  const stringContent = useMemo(() => {
    const c = artifact.content;
    return typeof c === 'string' ? c : JSON.stringify(c, null, 2);
  }, [artifact.content]);

  const { artifactType, metadata } = artifact;

  switch (artifactType) {
    case 'TEXT':
      return <TextBlock content={stringContent} metadata={metadata} />;

    case 'CODE':
      return <CodeBlock content={stringContent} metadata={metadata} />;

    case 'MARKDOWN':
    case 'LLM_OUTPUT':
      return (
        <div>
          <ChatMarkdown streaming={!!streaming}>{stringContent}</ChatMarkdown>
          {artifactType === 'LLM_OUTPUT' && metadata?.model && (
            <div className="pt-2 mt-2 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
              {metadata.model}
              {metadata.tokensUsed && (
                <span> · {metadata.tokensUsed} tokens</span>
              )}
            </div>
          )}
        </div>
      );

    case 'HTML':
      return <HtmlPreview content={stringContent} metadata={metadata} />;

    case 'SVG':
      return <SvgRenderer content={stringContent} metadata={metadata} />;

    case 'IMAGE':
      return <ImageViewer content={stringContent} metadata={metadata} />;

    case 'JSON':
      return <JsonViewer content={parsedContent} metadata={metadata} />;

    case 'CSV':
      return <CsvTable content={stringContent} metadata={metadata} />;

    case 'TABLE':
      return <DataTable content={parsedContent} metadata={metadata} />;

    case 'CHART':
      return <ChartRenderer content={parsedContent} metadata={metadata} />;

    case 'DIAGRAM':
      return <DiagramRenderer content={stringContent} metadata={metadata} />;

    case 'MCP_CALL':
      return (
        <ToolCard
          content={parsedContent}
          metadata={metadata}
          artifactType="MCP_CALL"
        />
      );

    case 'TOOL_CALL':
      return (
        <ToolCard
          content={parsedContent}
          metadata={metadata}
          artifactType="TOOL_CALL"
        />
      );

    case 'WEB_PAGES':
      return <SearchResults content={parsedContent} metadata={metadata} />;

    case 'DIR':
      return <FileTree content={parsedContent} metadata={metadata} />;

    case 'CUSTOM':
      return <CustomRenderer content={parsedContent} metadata={metadata} />;

    case 'KNOWLEDGE':
      return (
        <div className="min-w-0 overflow-hidden">
          {parsedContent?.files?.length > 0 && (
            <KnowledgeFiles files={parsedContent.files} metadata={metadata} />
          )}
          {parsedContent?.answer && (
            <div className="mt-2">
              <ChatMarkdown streaming={!!streaming}>
                {String(parsedContent.answer)}
              </ChatMarkdown>
            </div>
          )}
        </div>
      );

    case 'PLAYWRIGHT':
      return <BrowserSnapshot content={parsedContent} metadata={metadata} />;

    default:
      return (
        <JsonViewer
          content={parsedContent}
          metadata={{ title: artifactType, ...metadata }}
        />
      );
  }
}
