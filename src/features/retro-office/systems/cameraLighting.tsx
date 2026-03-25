"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import * as THREE from "three";
import { WORLD_H, WORLD_W } from "@/features/retro-office/core/constants";
import { toWorld } from "@/features/retro-office/core/geometry";
import type { RenderAgent } from "@/features/retro-office/core/types";

type CameraVector3 = [number, number, number];
type CameraTransitionEasing = "linear" | "easeOutCubic";

export type CameraTransition = {
  durationMs: number;
  easing?: CameraTransitionEasing;
};

export type CameraPreset = {
  pos: CameraVector3;
  target: CameraVector3;
  zoom?: number;
  transition?: CameraTransition;
};

export const CAMERA_FOCUS_TRANSITION_DURATION_MS = 550;

const ISO_D = 20;
const ISO_H = Math.PI / 4;
const ISO_V = Math.atan(1 / Math.SQRT2);
const isoOffset = (
  tx: number,
  tz: number,
  d = ISO_D,
): [number, number, number] => [
  tx + d * Math.cos(ISO_V) * Math.sin(ISO_H),
  d * Math.sin(ISO_V),
  tz + d * Math.cos(ISO_V) * Math.cos(ISO_H),
];

export const CAMERA_PRESETS = {
  overview: {
    pos: isoOffset(0, 0),
    target: [0, 0, 0],
    zoom: 55,
  },
  frontDesk: {
    pos: isoOffset(-3, -2, 14),
    target: [-3, 0, -2],
    zoom: 70,
  },
  lounge: {
    pos: isoOffset(5, -3, 14),
    target: [5, 0, -3],
    zoom: 62,
  },
} satisfies Record<string, CameraPreset>;

type OrbitControllerLike = {
  target: THREE.Vector3;
  update: () => void;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const easeProgress = (progress: number, easing: CameraTransitionEasing) => {
  const clamped = clamp01(progress);
  if (easing === "linear") return clamped;
  return 1 - (1 - clamped) ** 3;
};

export function buildFocusedCameraPreset({
  cameraPosition,
  currentTarget,
  nextTarget,
  zoom,
  durationMs = CAMERA_FOCUS_TRANSITION_DURATION_MS,
  easing = "easeOutCubic",
}: {
  cameraPosition: CameraVector3;
  currentTarget: CameraVector3;
  nextTarget: CameraVector3;
  zoom?: number;
  durationMs?: number;
  easing?: CameraTransitionEasing;
}): CameraPreset {
  const offsetX = cameraPosition[0] - currentTarget[0];
  const offsetY = cameraPosition[1] - currentTarget[1];
  const offsetZ = cameraPosition[2] - currentTarget[2];

  return {
    pos: [
      nextTarget[0] + offsetX,
      nextTarget[1] + offsetY,
      nextTarget[2] + offsetZ,
    ],
    target: [...nextTarget],
    ...(typeof zoom === "number" ? { zoom } : {}),
    transition: {
      durationMs,
      easing,
    },
  };
}

export function CameraAnimator({
  presetRef,
  orbitRef,
}: {
  presetRef: MutableRefObject<CameraPreset | null>;
  orbitRef: RefObject<OrbitControllerLike | null>;
}) {
  const { camera } = useThree();
  const activePerspectiveCameraRef = useRef<THREE.PerspectiveCamera | null>(
    camera instanceof THREE.PerspectiveCamera ? camera : null,
  );
  const targetPositionRef = useRef(new THREE.Vector3());
  const targetLookAtRef = useRef(new THREE.Vector3());
  const activeTransitionPresetRef = useRef<CameraPreset | null>(null);
  const transitionStartTimeRef = useRef(0);
  const transitionStartPositionRef = useRef(new THREE.Vector3());
  const transitionStartTargetRef = useRef(new THREE.Vector3());
  const transitionStartZoomRef = useRef<number | null>(null);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      activePerspectiveCameraRef.current = camera;
    }
  }, [camera]);

  useFrame(() => {
    const preset = presetRef.current;
    const orbit = orbitRef.current;
    if (!preset || !orbit) return;
    const activeCamera = activePerspectiveCameraRef.current;

    targetPositionRef.current.set(...preset.pos);
    targetLookAtRef.current.set(...preset.target);

    if (preset.transition && preset.transition.durationMs > 0) {
      if (activeTransitionPresetRef.current !== preset) {
        activeTransitionPresetRef.current = preset;
        transitionStartTimeRef.current = performance.now();
        transitionStartPositionRef.current.copy(camera.position);
        transitionStartTargetRef.current.copy(orbit.target);
        transitionStartZoomRef.current = activeCamera ? activeCamera.zoom : null;
      }

      const elapsedMs = performance.now() - transitionStartTimeRef.current;
      const progress = clamp01(elapsedMs / preset.transition.durationMs);
      const easedProgress = easeProgress(
        progress,
        preset.transition.easing ?? "easeOutCubic",
      );

      camera.position.lerpVectors(
        transitionStartPositionRef.current,
        targetPositionRef.current,
        easedProgress,
      );
      orbit.target.lerpVectors(
        transitionStartTargetRef.current,
        targetLookAtRef.current,
        easedProgress,
      );

      if (
        activeCamera &&
        typeof preset.zoom === "number" &&
        typeof transitionStartZoomRef.current === "number"
      ) {
        activeCamera.zoom = lerp(
          transitionStartZoomRef.current,
          preset.zoom,
          easedProgress,
        );
        activeCamera.updateProjectionMatrix();
      }

      orbit.update();

      if (progress >= 1) {
        camera.position.copy(targetPositionRef.current);
        orbit.target.copy(targetLookAtRef.current);
        if (activeCamera && typeof preset.zoom === "number") {
          activeCamera.zoom = preset.zoom;
          activeCamera.updateProjectionMatrix();
        }
        activeTransitionPresetRef.current = null;
        transitionStartZoomRef.current = null;
        presetRef.current = null;
      }
      return;
    }

    activeTransitionPresetRef.current = null;
    transitionStartZoomRef.current = null;
    camera.position.lerp(targetPositionRef.current, 0.06);
    orbit.target.lerp(targetLookAtRef.current, 0.06);

    if (activeCamera && typeof preset.zoom === "number") {
      activeCamera.zoom += (preset.zoom - activeCamera.zoom) * 0.08;
      activeCamera.updateProjectionMatrix();
    }

    orbit.update();
    const targetSettled =
      orbit.target.distanceTo(targetLookAtRef.current) < 0.05;
    const zoomSettled =
      !activeCamera ||
      typeof preset.zoom !== "number" ||
      Math.abs(activeCamera.zoom - preset.zoom) < 0.5;

    if (
      camera.position.distanceTo(targetPositionRef.current) < 0.05 &&
      targetSettled &&
      zoomSettled
    ) {
      presetRef.current = null;
    }
  });

  return null;
}

export function FollowCamController({
  followRef,
  agentsRef,
  agentLookupRef,
}: {
  followRef: MutableRefObject<string | null>;
  agentsRef: RefObject<RenderAgent[]>;
  agentLookupRef?: RefObject<Map<string, RenderAgent>>;
}) {
  const { camera, set, size, gl } = useThree();
  const perspectiveCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const originalCameraRef = useRef<THREE.PerspectiveCamera | null>(
    camera instanceof THREE.PerspectiveCamera ? camera : null,
  );
  const wasFollowingRef = useRef(false);
  const lastAgentIdRef = useRef<string | null>(null);
  const thetaRef = useRef(0);
  const phiRef = useRef(Math.PI / 6);
  const radiusRef = useRef(2.0);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const cameraPositionRef = useRef(new THREE.Vector3());
  const lookAtRef = useRef(new THREE.Vector3());

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      originalCameraRef.current = camera;
    }
  }, [camera]);

  useEffect(() => {
    const element = gl.domElement;

    const handleMouseDown = (event: MouseEvent) => {
      if (!followRef.current || event.button !== 0) return;
      isDraggingRef.current = true;
      lastMouseRef.current = { x: event.clientX, y: event.clientY };
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = event.clientX - lastMouseRef.current.x;
      const dy = event.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: event.clientX, y: event.clientY };
      thetaRef.current -= dx * 0.006;
      phiRef.current = Math.max(
        0.05,
        Math.min(Math.PI / 2.2, phiRef.current + dy * 0.006),
      );
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (event: WheelEvent) => {
      if (!followRef.current) return;
      radiusRef.current = Math.max(
        0.8,
        Math.min(10, radiusRef.current + event.deltaY * 0.005),
      );
    };

    element.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    element.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      element.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      element.removeEventListener("wheel", handleWheel);
    };
  }, [gl, followRef]);

  useFrame(() => {
    const agentId = followRef.current;
    const isFollowing = agentId !== null;

    if (isFollowing && !wasFollowingRef.current) {
      const agent =
        (agentId ? agentLookupRef?.current?.get(agentId) : undefined) ??
        agentsRef.current?.find((candidate) => candidate.id === agentId);
      if (!agent) return;

      if (!perspectiveCameraRef.current) {
        perspectiveCameraRef.current = new THREE.PerspectiveCamera(
          65,
          size.width / size.height,
          0.1,
          100,
        );
      }

      thetaRef.current = agent.facing + Math.PI;
      lastAgentIdRef.current = agentId;
      set({ camera: perspectiveCameraRef.current });
      wasFollowingRef.current = true;
    }

    if (!isFollowing && wasFollowingRef.current) {
      if (originalCameraRef.current) {
        set({ camera: originalCameraRef.current });
      }
      wasFollowingRef.current = false;
      return;
    }

    if (!isFollowing || !perspectiveCameraRef.current) return;

    const agent =
      (agentId ? agentLookupRef?.current?.get(agentId) : undefined) ??
      agentsRef.current?.find((candidate) => candidate.id === agentId);
    if (!agent) return;

    if (agentId !== lastAgentIdRef.current) {
      thetaRef.current = agent.facing + Math.PI;
      lastAgentIdRef.current = agentId;
    }

    const [wx, , wz] = toWorld(agent.x, agent.y);
    const radius = radiusRef.current;
    const theta = thetaRef.current;
    const phi = phiRef.current;

    cameraPositionRef.current.set(
      wx + radius * Math.sin(phi) * Math.sin(theta),
      0.4 + radius * Math.cos(phi),
      wz + radius * Math.sin(phi) * Math.cos(theta),
    );
    perspectiveCameraRef.current.position.copy(cameraPositionRef.current);

    lookAtRef.current.set(wx, 0.5, wz);
    perspectiveCameraRef.current.lookAt(lookAtRef.current);
    perspectiveCameraRef.current.aspect = size.width / size.height;
    perspectiveCameraRef.current.updateProjectionMatrix();
  });

  return null;
}

const DAY_NIGHT_PERIOD = 300;

const DAY_NIGHT_POSITIONS = [0, 0.2, 0.45, 0.65, 0.8, 0.95];

const DAY_NIGHT_KEYFRAMES = [
  {
    ambient: "#c8a870",
    sun: "#ffe8b0",
    sunIntensity: 0.8,
    ambientIntensity: 0.55,
  },
  {
    ambient: "#c8d0e0",
    sun: "#f0f4ff",
    sunIntensity: 1.3,
    ambientIntensity: 0.75,
  },
  {
    ambient: "#c8d0e0",
    sun: "#f0f4ff",
    sunIntensity: 1.3,
    ambientIntensity: 0.75,
  },
  {
    ambient: "#c87840",
    sun: "#ff9050",
    sunIntensity: 0.9,
    ambientIntensity: 0.5,
  },
  {
    ambient: "#1a2040",
    sun: "#2040a0",
    sunIntensity: 0.3,
    ambientIntensity: 0.25,
  },
  {
    ambient: "#101828",
    sun: "#182038",
    sunIntensity: 0.2,
    ambientIntensity: 0.2,
  },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const lerpColor = (fromColor: string, toColor: string, t: number) => {
  const parse = (color: string) => {
    const value = parseInt(color.slice(1), 16);
    return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
  };

  const [fromR, fromG, fromB] = parse(fromColor);
  const [toR, toG, toB] = parse(toColor);
  const red = Math.round(lerp(fromR, toR, t));
  const green = Math.round(lerp(fromG, toG, t));
  const blue = Math.round(lerp(fromB, toB, t));

  return `rgb(${red},${green},${blue})`;
};

export function DayNightCycle({
  externalTimeRef,
}: {
  externalTimeRef?: MutableRefObject<number>;
}) {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const timeRef = useRef(0.25);

  useFrame((_, delta) => {
    timeRef.current = (timeRef.current + delta / DAY_NIGHT_PERIOD) % 1;
    if (externalTimeRef) externalTimeRef.current = timeRef.current;
    const time = timeRef.current;

    let indexA = 0;
    for (let index = 0; index < DAY_NIGHT_POSITIONS.length - 1; index += 1) {
      if (time >= DAY_NIGHT_POSITIONS[index] && time < DAY_NIGHT_POSITIONS[index + 1]) {
        indexA = index;
        break;
      }
      if (time >= DAY_NIGHT_POSITIONS[DAY_NIGHT_POSITIONS.length - 1]) {
        indexA = DAY_NIGHT_POSITIONS.length - 1;
      }
    }

    const indexB = (indexA + 1) % DAY_NIGHT_KEYFRAMES.length;
    const positionA = DAY_NIGHT_POSITIONS[indexA];
    const positionB = indexB === 0 ? 1 : DAY_NIGHT_POSITIONS[indexB];
    const span = positionB - positionA;
    const localT = span > 0 ? (time - positionA) / span : 0;
    const keyframeA = DAY_NIGHT_KEYFRAMES[indexA];
    const keyframeB = DAY_NIGHT_KEYFRAMES[indexB];

    if (ambientRef.current) {
      ambientRef.current.color.set(
        lerpColor(keyframeA.ambient, keyframeB.ambient, localT),
      );
      ambientRef.current.intensity = lerp(
        keyframeA.ambientIntensity,
        keyframeB.ambientIntensity,
        localT,
      );
    }

    if (sunRef.current) {
      sunRef.current.color.set(lerpColor(keyframeA.sun, keyframeB.sun, localT));
      sunRef.current.intensity = lerp(
        keyframeA.sunIntensity,
        keyframeB.sunIntensity,
        localT,
      );
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.75} color="#c8d0e0" />
      <directionalLight
        ref={sunRef}
        position={[8, 14, 6]}
        intensity={1.3}
        color="#f0f4ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
        shadow-camera-left={-WORLD_W * 0.7}
        shadow-camera-right={WORLD_W * 0.7}
        shadow-camera-top={WORLD_H * 0.7}
        shadow-camera-bottom={-WORLD_H * 0.7}
      />
    </>
  );
}
