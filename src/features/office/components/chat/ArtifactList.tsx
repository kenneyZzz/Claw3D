'use client';

import type { ArtifactInfo } from '@/features/office/types/chat';
import { ArtifactRenderer } from '@/features/office/components/chat/ArtifactRenderer';

interface ArtifactListProps {
  artifacts: ArtifactInfo[];
  streaming?: boolean;
}

export function ArtifactList({ artifacts, streaming }: ArtifactListProps) {
  return (
    <div className="space-y-2">
      {artifacts.map((artifact) => (
        <div
          key={artifact.artifactId}
          className="min-w-0 max-w-full overflow-hidden"
        >
          <ArtifactRenderer artifact={artifact} streaming={streaming} />
        </div>
      ))}
    </div>
  );
}
