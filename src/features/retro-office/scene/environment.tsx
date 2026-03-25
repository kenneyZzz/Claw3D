"use client";

import { useGLTF } from "@react-three/drei";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  CANVAS_H,
  CANVAS_W,
  SCALE,
} from "@/features/retro-office/core/constants";
import { fromWorld } from "@/features/retro-office/core/geometry";

export type CollisionBox = { x: number; y: number; w: number; h: number };

export type ModelBounds = {
  minCx: number;
  minCy: number;
  maxCx: number;
  maxCy: number;
  floorY: number;
};

function FramedPicture({
  position,
  rotY = 0,
  w = 0.52,
  h = 0.38,
  frameColor = "#1c1008",
  bgColor = "#f0ece0",
  art,
}: {
  position: [number, number, number];
  rotY?: number;
  w?: number;
  h?: number;
  frameColor?: string;
  bgColor?: string;
  art: ReactNode;
}) {
  const frameDepth = 0.028;
  const inset = 0.038;
  const artZ = frameDepth / 2 + 0.007;

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh>
        <boxGeometry args={[w, h, frameDepth]} />
        <meshStandardMaterial
          color={frameColor}
          roughness={0.75}
          metalness={0.18}
        />
      </mesh>
      <mesh position={[0, 0, frameDepth / 2 + 0.003]}>
        <boxGeometry args={[w - inset * 2, h - inset * 2, 0.005]} />
        <meshStandardMaterial color={bgColor} roughness={0.95} metalness={0} />
      </mesh>
      <group position={[0, 0, artZ]}>{art}</group>
    </group>
  );
}

/**
 * Invisible floor plane kept for FloorRaycaster (pointer interaction at y=0).
 * The visual floor is now provided by OfficeModel.
 */
export function FloorAndWalls() {
  const width = CANVAS_W * SCALE;
  const height = CANVAS_H * SCALE;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshLambertMaterial color="#c8a97e" transparent opacity={0} />
      </mesh>
    </group>
  );
}

const OFFICE_GLB_PATH = "/office-assets/models/furniture/office.glb";

const WALL_MIN_HEIGHT = 0.3;

function extractCollisionAndFloor(scene: THREE.Object3D): {
  boxes: CollisionBox[];
  floorSurfaceY: number;
} {
  const tempBox = new THREE.Box3();
  const size = new THREE.Vector3();

  type MeshInfo = { area: number; minY: number; maxY: number; sizeY: number; box: THREE.Box3 };
  const meshInfos: MeshInfo[] = [];

  scene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const b = new THREE.Box3();
    b.setFromObject(mesh);
    if (b.isEmpty()) return;
    b.getSize(size);
    const xzArea = size.x * size.z;
    meshInfos.push({ area: xzArea, minY: b.min.y, maxY: b.max.y, sizeY: size.y, box: b });
  });

  if (meshInfos.length === 0) return { boxes: [], floorSurfaceY: 0 };

  let candidateFloors: MeshInfo[] = [];

  for (let i = 0; i < meshInfos.length; i++) {
    const info = meshInfos[i];
    const heightToAreaRatio = info.area > 0 ? info.sizeY / Math.sqrt(info.area) : Infinity;
    if (heightToAreaRatio < 0.15) {
      candidateFloors.push(info);
    }
  }

  let floorSurfaceY = 0;
  const floorMeshIndices = new Set<number>();

  if (candidateFloors.length > 0) {
    // Group by maxY (tolerance 0.1)
    const groups: { maxY: number; totalArea: number; meshes: MeshInfo[] }[] = [];
    for (const floor of candidateFloors) {
      let found = false;
      for (const group of groups) {
        if (Math.abs(group.maxY - floor.maxY) < 0.1) {
          group.totalArea += floor.area;
          group.meshes.push(floor);
          group.maxY = (group.maxY * (group.totalArea - floor.area) + floor.maxY * floor.area) / group.totalArea;
          found = true;
          break;
        }
      }
      if (!found) {
        groups.push({ maxY: floor.maxY, totalArea: floor.area, meshes: [floor] });
      }
    }

    groups.sort((a, b) => b.totalArea - a.totalArea);
    const maxGroupArea = groups[0].totalArea;
    
    // Filter groups that have at least 30% of the max area, and pick the lowest one
    const largeGroups = groups.filter(g => g.totalArea > maxGroupArea * 0.3);
    largeGroups.sort((a, b) => a.maxY - b.maxY);
    
    const floorGroup = largeGroups[0];
    floorSurfaceY = floorGroup.maxY;

    for (let i = 0; i < meshInfos.length; i++) {
      if (floorGroup.meshes.includes(meshInfos[i])) {
        floorMeshIndices.add(i);
      }
    }
  }

  const boxes: CollisionBox[] = [];
  for (let i = 0; i < meshInfos.length; i++) {
    if (floorMeshIndices.has(i)) continue;
    const info = meshInfos[i];

    if (info.sizeY < WALL_MIN_HEIGHT) continue;
    if (info.maxY <= floorSurfaceY + 0.05) continue;

    const b = info.box;
    const topLeft = fromWorld(b.min.x, b.min.z);
    const bottomRight = fromWorld(b.max.x, b.max.z);
    const cx = Math.min(topLeft.cx, bottomRight.cx);
    const cy = Math.min(topLeft.cy, bottomRight.cy);
    const w = Math.abs(bottomRight.cx - topLeft.cx);
    const h = Math.abs(bottomRight.cy - topLeft.cy);

    if (w > 1 && h > 1) {
      boxes.push({ x: cx, y: cy, w, h });
    }
  }

  return { boxes, floorSurfaceY };
}

/**
 * Loads office.glb as the environment model, auto-scales to fit the world,
 * and extracts collision volumes for nav-grid blocking.
 */
export function OfficeModel({
  onCollisionReady,
  onBoundsReady,
}: {
  onCollisionReady?: (boxes: CollisionBox[]) => void;
  onBoundsReady?: (bounds: ModelBounds) => void;
}) {
  const { scene } = useGLTF(OFFICE_GLB_PATH);
  const groupRef = useRef<THREE.Group>(null);
  const collisionExtracted = useRef(false);

  const worldW = CANVAS_W * SCALE;
  const worldH = CANVAS_H * SCALE;

  const { cloned, scaleFactor, offset } = useMemo(() => {
    const clonedScene = scene.clone(true);
    clonedScene.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clonedScene);
    const modelSize = box.getSize(new THREE.Vector3());
    const modelCenter = box.getCenter(new THREE.Vector3());

    // 禁止自动缩放，保持原比例
    const s = 1;

    // Pre-scan for floor surface to align it to y=0 (not the model bottom).
    const preGroup = new THREE.Group();
    const preClone = clonedScene.clone(true);
    preGroup.scale.set(s, s, s);
    preGroup.position.set(-modelCenter.x * s, -box.min.y * s, -modelCenter.z * s);
    preGroup.add(preClone);
    preGroup.updateMatrixWorld(true);

    const { floorSurfaceY: rawFloor } = extractCollisionAndFloor(preGroup);
    const floorOffset = -rawFloor;

    const off: [number, number, number] = [
      -modelCenter.x * s,
      -box.min.y * s + floorOffset,
      -modelCenter.z * s,
    ];

    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    return { cloned: clonedScene, scaleFactor: s, offset: off };
  }, [scene, worldW, worldH]);

  useEffect(() => {
    if (collisionExtracted.current) return;
    collisionExtracted.current = true;

    const tempGroup = new THREE.Group();
    const tempClone = cloned.clone(true);
    tempGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
    tempGroup.position.set(offset[0], offset[1], offset[2]);
    tempGroup.add(tempClone);
    tempGroup.updateMatrixWorld(true);

    const { boxes, floorSurfaceY } = extractCollisionAndFloor(tempGroup);

    const overallBox = new THREE.Box3().setFromObject(tempGroup);
    const topLeft = fromWorld(overallBox.min.x, overallBox.min.z);
    const bottomRight = fromWorld(overallBox.max.x, overallBox.max.z);
    const padding = 30;
    const bounds: ModelBounds = {
      minCx: Math.max(0, Math.min(topLeft.cx, bottomRight.cx) + padding),
      minCy: Math.max(0, Math.min(topLeft.cy, bottomRight.cy) + padding),
      maxCx: Math.min(CANVAS_W, Math.max(topLeft.cx, bottomRight.cx) - padding),
      maxCy: Math.min(CANVAS_H, Math.max(topLeft.cy, bottomRight.cy) - padding),
      floorY: floorSurfaceY,
    };
    onBoundsReady?.(bounds);
    onCollisionReady?.(boxes);
  }, [cloned, scaleFactor, offset, onCollisionReady, onBoundsReady]);

  return (
    <group
      ref={groupRef}
      scale={[scaleFactor, scaleFactor, scaleFactor]}
      position={offset}
    >
      <primitive object={cloned} />
    </group>
  );
}

useGLTF.preload(OFFICE_GLB_PATH);

export function WallPictures() {
  const width = CANVAS_W * SCALE;
  const height = CANVAS_H * SCALE;
  const northZ = -height / 2 + 0.07;
  const southZ = height / 2 - 0.07;
  const westX = -width / 2 + 0.07;
  const eastX = width / 2 - 0.07;
  const pictureY = 0.64;

  return (
    <group>
      <FramedPicture
        position={[-7.5, pictureY, northZ]}
        rotY={0}
        w={0.58}
        h={0.42}
        frameColor="#1a0e06"
        bgColor="#f8f4ec"
        art={
          <>
            <mesh position={[-0.12, 0.07, 0]}>
              <planeGeometry args={[0.22, 0.14]} />
              <meshBasicMaterial color="#c0392b" />
            </mesh>
            <mesh position={[0.09, 0.07, 0]}>
              <planeGeometry args={[0.18, 0.14]} />
              <meshBasicMaterial color="#2980b9" />
            </mesh>
            <mesh position={[0.04, -0.07, 0]}>
              <planeGeometry args={[0.26, 0.12]} />
              <meshBasicMaterial color="#f39c12" />
            </mesh>
            <mesh position={[0, 0, 0.001]}>
              <planeGeometry args={[0.006, 0.3]} />
              <meshBasicMaterial color="#1c1008" />
            </mesh>
            <mesh position={[0, 0.01, 0.001]}>
              <planeGeometry args={[0.4, 0.006]} />
              <meshBasicMaterial color="#1c1008" />
            </mesh>
          </>
        }
      />

      <FramedPicture
        position={[-1.5, pictureY, northZ]}
        rotY={0}
        w={0.64}
        h={0.4}
        frameColor="#2a1a0a"
        bgColor="#a8d8f0"
        art={
          <>
            <mesh position={[0, 0.08, 0]}>
              <planeGeometry args={[0.56, 0.1]} />
              <meshBasicMaterial color="#6ab8e8" />
            </mesh>
            <mesh position={[0.18, 0.09, 0.001]}>
              <circleGeometry args={[0.038, 12]} />
              <meshBasicMaterial color="#f8d060" />
            </mesh>
            <mesh position={[0, 0, 0.001]}>
              <planeGeometry args={[0.56, 0.1]} />
              <meshBasicMaterial color="#7ab870" />
            </mesh>
            <mesh position={[-0.12, -0.04, 0.002]}>
              <planeGeometry args={[0.28, 0.1]} />
              <meshBasicMaterial color="#5a9a58" />
            </mesh>
            <mesh position={[0, -0.1, 0.001]}>
              <planeGeometry args={[0.56, 0.08]} />
              <meshBasicMaterial color="#8b6348" />
            </mesh>
          </>
        }
      />

      <FramedPicture
        position={[4, pictureY, northZ]}
        rotY={0}
        w={0.5}
        h={0.42}
        frameColor="#1a0e06"
        bgColor="#f0d090"
        art={
          <>
            <mesh position={[0, 0.07, 0]}>
              <planeGeometry args={[0.4, 0.12]} />
              <meshBasicMaterial color="#e07820" />
            </mesh>
            <mesh position={[0, -0.02, 0]}>
              <planeGeometry args={[0.4, 0.09]} />
              <meshBasicMaterial color="#c0403a" />
            </mesh>
            <mesh position={[0, -0.1, 0]}>
              <planeGeometry args={[0.4, 0.08]} />
              <meshBasicMaterial color="#4a2870" />
            </mesh>
          </>
        }
      />

      <FramedPicture
        position={[8.5, pictureY, northZ]}
        rotY={0}
        w={0.55}
        h={0.38}
        frameColor="#262626"
        bgColor="#101820"
        art={
          <>
            {([-0.11, -0.05, 0.01, 0.07, 0.12] as const).map((y, index) => (
              <mesh
                key={index}
                position={[index % 2 === 0 ? -0.04 : 0.02, y, 0]}
              >
                <planeGeometry args={[0.22 + (index % 3) * 0.07, 0.012]} />
                <meshBasicMaterial
                  color={
                    ["#22d3ee", "#a78bfa", "#4ade80", "#f472b6", "#fb923c"][
                      index
                    ]
                  }
                />
              </mesh>
            ))}
            <mesh position={[0.17, 0.12, 0]}>
              <circleGeometry args={[0.018, 10]} />
              <meshBasicMaterial color="#22d3ee" />
            </mesh>
          </>
        }
      />

      <FramedPicture
        position={[-5.5, pictureY, southZ]}
        rotY={Math.PI}
        w={0.6}
        h={0.4}
        frameColor="#1c1008"
        bgColor="#e8e0f0"
        art={
          <>
            <mesh position={[-0.14, 0.06, 0]}>
              <planeGeometry args={[0.2, 0.22]} />
              <meshBasicMaterial color="#7b68ee" />
            </mesh>
            <mesh position={[0.06, 0.04, 0]}>
              <planeGeometry args={[0.26, 0.18]} />
              <meshBasicMaterial color="#20b2aa" />
            </mesh>
            <mesh position={[-0.05, -0.1, 0]}>
              <planeGeometry args={[0.32, 0.1]} />
              <meshBasicMaterial color="#ff7f50" />
            </mesh>
          </>
        }
      />

      <FramedPicture
        position={[0, pictureY, southZ]}
        rotY={Math.PI}
        w={0.5}
        h={0.36}
        frameColor="#0a0a12"
        bgColor="#0a0a12"
        art={
          <>
            {([0, 1, 2, 3, 4, 5] as const).map((index) => (
              <mesh key={index} position={[-0.17 + index * 0.068, 0, 0]}>
                <planeGeometry args={[0.052, 0.26]} />
                <meshBasicMaterial
                  color={
                    [
                      "#ef4444",
                      "#f97316",
                      "#eab308",
                      "#22c55e",
                      "#3b82f6",
                      "#a855f7",
                    ][index]
                  }
                />
              </mesh>
            ))}
          </>
        }
      />

      <FramedPicture
        position={[5.5, pictureY, southZ]}
        rotY={Math.PI}
        w={0.46}
        h={0.42}
        frameColor="#2a2008"
        bgColor="#d4c8a8"
        art={
          <>
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[0.1, 0.14, 0.001]} />
              <meshBasicMaterial color="#2a1a0a" />
            </mesh>
            <mesh position={[0, 0.13, 0]}>
              <circleGeometry args={[0.04, 14]} />
              <meshBasicMaterial color="#2a1a0a" />
            </mesh>
            <mesh position={[-0.03, -0.09, 0]}>
              <boxGeometry args={[0.035, 0.1, 0.001]} />
              <meshBasicMaterial color="#2a1a0a" />
            </mesh>
            <mesh position={[0.03, -0.09, 0]}>
              <boxGeometry args={[0.035, 0.1, 0.001]} />
              <meshBasicMaterial color="#2a1a0a" />
            </mesh>
          </>
        }
      />

      <FramedPicture
        position={[westX, pictureY, -3.5]}
        rotY={-Math.PI / 2}
        w={0.52}
        h={0.4}
        frameColor="#1c1008"
        bgColor="#f0c840"
        art={
          <>
            {([0, Math.PI / 3, -Math.PI / 3] as const).map(
              (rotation, index) => (
                <mesh
                  key={index}
                  position={[0, 0, 0]}
                  rotation={[0, 0, rotation]}
                >
                  <boxGeometry args={[0.08, 0.28, 0.001]} />
                  <meshBasicMaterial color="#c84020" />
                </mesh>
              ),
            )}
          </>
        }
      />

      <FramedPicture
        position={[westX, pictureY, 2.5]}
        rotY={-Math.PI / 2}
        w={0.58}
        h={0.44}
        frameColor="#102040"
        bgColor="#1a3a6a"
        art={
          <>
            {([-0.14, -0.07, 0, 0.07, 0.14] as const).map((x, index) => (
              <mesh key={`bv${index}`} position={[x, 0, 0]}>
                <planeGeometry args={[0.004, 0.34]} />
                <meshBasicMaterial color="#4080c0" transparent opacity={0.5} />
              </mesh>
            ))}
            {([-0.12, -0.06, 0, 0.06, 0.12] as const).map((y, index) => (
              <mesh key={`bh${index}`} position={[0, y, 0]}>
                <planeGeometry args={[0.42, 0.004]} />
                <meshBasicMaterial color="#4080c0" transparent opacity={0.5} />
              </mesh>
            ))}
            <mesh position={[-0.05, 0.04, 0.001]}>
              <planeGeometry args={[0.16, 0.12]} />
              <meshBasicMaterial color="#4080c0" transparent opacity={0.3} />
            </mesh>
            <mesh position={[0.1, -0.05, 0.001]}>
              <planeGeometry args={[0.12, 0.1]} />
              <meshBasicMaterial color="#4080c0" transparent opacity={0.3} />
            </mesh>
          </>
        }
      />

      <FramedPicture
        position={[eastX, pictureY, -2.5]}
        rotY={Math.PI / 2}
        w={0.56}
        h={0.42}
        frameColor="#1c1008"
        bgColor="#1a2840"
        art={
          <>
            {([0.12, 0.04, -0.04, -0.12] as const).map((y, index) => (
              <mesh key={index} position={[0, y, 0]}>
                <planeGeometry args={[0.44, 0.03 + index * 0.008]} />
                <meshBasicMaterial
                  color={["#60a0f8", "#4080d8", "#3060b8", "#205090"][index]}
                />
              </mesh>
            ))}
          </>
        }
      />

      <FramedPicture
        position={[eastX, pictureY, 3.5]}
        rotY={Math.PI / 2}
        w={0.48}
        h={0.44}
        frameColor="#2a1a0a"
        bgColor="#f8f4e8"
        art={
          <>
            <mesh position={[0, -0.06, 0]}>
              <boxGeometry args={[0.018, 0.18, 0.001]} />
              <meshBasicMaterial color="#3a6a2a" />
            </mesh>
            <mesh position={[-0.07, 0.04, 0.001]} rotation={[0, 0, 0.4]}>
              <boxGeometry args={[0.12, 0.06, 0.001]} />
              <meshBasicMaterial color="#4a8a38" />
            </mesh>
            <mesh position={[0.07, 0.02, 0.001]} rotation={[0, 0, -0.4]}>
              <boxGeometry args={[0.12, 0.06, 0.001]} />
              <meshBasicMaterial color="#5aa042" />
            </mesh>
            <mesh position={[0, 0.1, 0.001]}>
              <boxGeometry args={[0.08, 0.1, 0.001]} />
              <meshBasicMaterial color="#48904a" />
            </mesh>
            <mesh position={[0, -0.14, 0.001]}>
              <boxGeometry args={[0.1, 0.05, 0.001]} />
              <meshBasicMaterial color="#b86040" />
            </mesh>
          </>
        }
      />

      {null}
    </group>
  );
}
