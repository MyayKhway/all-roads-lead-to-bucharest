/**
 * NavigationCamera — smoothly flies the camera along the route.
 *
 * During animation:  camera tracks the current navigation head city.
 * After animation:   camera zooms out to show the full route.
 * When idle:         OrbitControls are restored.
 */

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const LERP_SPEED     = 0.04;  // camera move speed (0..1 per frame)
const FOLLOW_HEIGHT  = 5.5;
const FOLLOW_DIST    = 4.5;
const OVERVIEW_HEIGHT = 14;
const OVERVIEW_DIST   = 2;

export default function NavigationCamera({ path, cities, animProgress, isAnimating }) {
  const { camera } = useThree();
  const targetPos    = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const controlsRef  = useRef();

  // Decide camera target based on animation state
  useEffect(() => {
    if (!path || path.length === 0) return;

    if (!isAnimating) {
      // Overview — center of all path cities
      const pts = path.map(id => new THREE.Vector3(...cities[id].position));
      const center = pts.reduce((acc, p) => acc.add(p), new THREE.Vector3()).divideScalar(pts.length);
      targetPos.current.set(center.x + OVERVIEW_DIST, OVERVIEW_HEIGHT, center.z + OVERVIEW_DIST * 2);
      targetLookAt.current.copy(center);
    }
  }, [isAnimating, path, cities]);

  useFrame(() => {
    if (!path || path.length === 0) return;
    if (!isAnimating) {
      // Smoothly move to overview
      camera.position.lerp(targetPos.current, LERP_SPEED);
      const currentLook = new THREE.Vector3();
      camera.getWorldDirection(currentLook);
      // soft-look
      const desired = targetLookAt.current.clone().sub(camera.position).normalize();
      const blended = currentLook.lerp(desired, LERP_SPEED * 2);
      camera.lookAt(camera.position.clone().add(blended));
      return;
    }

    // Follow current city along the path
    const clampedProgress = Math.max(0, Math.min(path.length - 1, animProgress));
    const cityIdx = Math.min(Math.floor(clampedProgress), path.length - 1);
    const cityPos = new THREE.Vector3(...cities[path[cityIdx]].position);

    // Camera sits behind and above the current city, looking toward the next
    let lookTarget;
    if (cityIdx < path.length - 1) {
      lookTarget = new THREE.Vector3(...cities[path[cityIdx + 1]].position);
    } else {
      lookTarget = cityPos.clone().add(new THREE.Vector3(1, 0, 1));
    }

    const camX = cityPos.x + FOLLOW_DIST * 0.7;
    const camZ = cityPos.z + FOLLOW_DIST;

    targetPos.current.set(camX, FOLLOW_HEIGHT, camZ);
    targetLookAt.current.copy(lookTarget);

    camera.position.lerp(targetPos.current, LERP_SPEED * 1.5);
    const currentLook = new THREE.Vector3();
    camera.getWorldDirection(currentLook);
    const desired = targetLookAt.current.clone().sub(camera.position).normalize();
    const blended = currentLook.lerp(desired, LERP_SPEED * 3);
    camera.lookAt(camera.position.clone().add(blended));
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={!isAnimating}
      enablePan
      enableZoom
      enableRotate
      minDistance={3}
      maxDistance={30}
      maxPolarAngle={Math.PI / 2.2}
    />
  );
}
