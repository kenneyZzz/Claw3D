import {
  buildFocusedCameraPreset,
  type CameraPreset,
} from '@/features/retro-office/systems/cameraLighting';

type CameraVector3 = [number, number, number];

export function activateSceneAgent({
  agentId,
  cameraPosition,
  currentTarget,
  nextTarget,
  onSelectAgent,
}: {
  agentId: string;
  cameraPosition: CameraVector3;
  currentTarget: CameraVector3;
  nextTarget: CameraVector3;
  onSelectAgent?: (agentId: string) => void;
}): CameraPreset {
  onSelectAgent?.(agentId);
  return buildFocusedCameraPreset({
    cameraPosition,
    currentTarget,
    nextTarget,
  });
}
