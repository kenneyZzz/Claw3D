import { createElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

const mockCamera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
let frameCallback: (() => void) | null = null;

vi.mock('@react-three/fiber', () => ({
  useFrame: (callback: () => void) => {
    frameCallback = callback;
  },
  useThree: () => ({
    camera: mockCamera,
  }),
}));

import {
  buildFocusedCameraPreset,
  CameraAnimator,
} from '@/features/retro-office/systems/cameraLighting';

describe('CameraAnimator', () => {
  beforeEach(() => {
    frameCallback = null;
    mockCamera.position.set(12, 12, 12);
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps the preset active until the orbit target settles', () => {
    const presetRef = {
      current: {
        pos: [12, 12, 12] as [number, number, number],
        target: [0, 0, 10] as [number, number, number],
      },
    };
    const orbitTarget = new THREE.Vector3(0, 0, 0);
    const orbitRef = {
      current: {
        target: orbitTarget,
        update: vi.fn(),
      },
    };

    render(createElement(CameraAnimator, { presetRef, orbitRef }));

    expect(frameCallback).not.toBeNull();

    frameCallback?.();

    expect(orbitTarget.z).toBeGreaterThan(0);
    expect(orbitTarget.z).toBeLessThan(10);
    expect(presetRef.current).not.toBeNull();
  });

  it('builds a focused preset that preserves the current camera offset', () => {
    expect(
      buildFocusedCameraPreset({
        cameraPosition: [12, 12, 12],
        currentTarget: [0, 0, 0],
        nextTarget: [4, 0, -2],
      }),
    ).toEqual({
      pos: [16, 12, 10],
      target: [4, 0, -2],
      transition: {
        durationMs: 550,
        easing: 'easeOutCubic',
      },
    });
  });

  it('keeps timed presets active until their transition duration completes', () => {
    let nowMs = 100;
    vi.spyOn(performance, 'now').mockImplementation(() => nowMs);

    const presetRef = {
      current: {
        pos: [20, 12, 12] as [number, number, number],
        target: [8, 0, 0] as [number, number, number],
        transition: {
          durationMs: 550,
          easing: 'easeOutCubic' as const,
        },
      },
    };
    const orbitTarget = new THREE.Vector3(0, 0, 0);
    const orbitRef = {
      current: {
        target: orbitTarget,
        update: vi.fn(),
      },
    };

    render(createElement(CameraAnimator, { presetRef, orbitRef }));

    expect(frameCallback).not.toBeNull();

    frameCallback?.();
    nowMs = 250;
    frameCallback?.();
    expect(mockCamera.position.x).toBeGreaterThan(12);
    expect(mockCamera.position.x).toBeLessThan(20);
    expect(orbitTarget.x).toBeGreaterThan(0);
    expect(orbitTarget.x).toBeLessThan(8);
    expect(presetRef.current).not.toBeNull();

    nowMs = 700;
    frameCallback?.();
    expect(mockCamera.position.x).toBe(20);
    expect(orbitTarget.x).toBe(8);
    expect(presetRef.current).toBeNull();
  });
});
