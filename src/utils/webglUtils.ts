import * as THREE from 'three';

/**
 * Checks if WebGL / WebGL2 is available in the current browser environment.
 */
export function checkWebGLSupport(): { supported: boolean; version?: string; reason?: string } {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Window object not available (SSR)' };
  }

  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    if (gl2) {
      return { supported: true, version: 'webgl2' };
    }

    const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl1) {
      return { supported: true, version: 'webgl' };
    }

    return {
      supported: false,
      reason: 'WebGL context not supported or disabled in browser settings.',
    };
  } catch (err: any) {
    return {
      supported: false,
      reason: err?.message || 'Error detecting WebGL support.',
    };
  }
}

/**
 * Safely creates a Three.js WebGLRenderer without throwing uncaught errors.
 * Attempts high-quality parameters first, and falls back to low-power / unaccelerated modes
 * before returning a clean null and error message.
 */
export function createSafeWebGLRenderer(
  customOptions?: THREE.WebGLRendererParameters
): {
  renderer: THREE.WebGLRenderer | null;
  error?: string;
  isFallbackMode?: boolean;
} {
  // First verify basic support
  const support = checkWebGLSupport();
  if (!support.supported) {
    return {
      renderer: null,
      error: support.reason || 'WebGL is not supported on this device/browser.',
    };
  }

  // Attempt 1: Standard quality
  try {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false,
      ...customOptions,
    });
    return { renderer, isFallbackMode: false };
  } catch (primaryErr: any) {
    console.warn(
      'Primary WebGLRenderer creation failed, attempting low-power fallback:',
      primaryErr?.message || primaryErr
    );

    // Attempt 2: Minimal fallback (no antialiasing, medium precision, low power)
    try {
      const fallbackRenderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        precision: 'mediump',
        powerPreference: 'low-power',
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false,
        ...customOptions,
      });
      return { renderer: fallbackRenderer, isFallbackMode: true };
    } catch (fallbackErr: any) {
      const errMsg =
        fallbackErr?.message ||
        primaryErr?.message ||
        'WebGL context creation was blocked or lost by the browser graphics pipeline.';
      console.error('All WebGLRenderer creation attempts failed:', errMsg);
      return {
        renderer: null,
        error: errMsg,
      };
    }
  }
}

/**
 * Safely disposes a WebGLRenderer, releases all GPU buffers, and forces context loss
 * to prevent browser WebGL context exhaustion (which triggers "Web page caused context loss and was blocked").
 */
export function disposeSafeWebGLRenderer(
  renderer: THREE.WebGLRenderer | null,
  container?: HTMLElement | null
): void {
  if (!renderer) return;

  try {
    // 1. Force WebGL context loss to immediately free GPU context slots in browser
    if (typeof renderer.forceContextLoss === 'function') {
      renderer.forceContextLoss();
    }

    // 2. Dispose renderer resources
    if (typeof renderer.dispose === 'function') {
      renderer.dispose();
    }

    // 3. Remove canvas from DOM container if requested
    if (container && renderer.domElement && renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  } catch (err) {
    console.warn('Error during WebGLRenderer disposal:', err);
  }
}
