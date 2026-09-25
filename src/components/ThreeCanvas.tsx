import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  Building,
  EnrichedProperty,
  Floor,
  TerrainElevationModel,
  UndergroundAsset,
  UndergroundClashReport,
} from '../types';
import { DEFAULT_UNDERGROUND_ASSETS } from '../services/clashDetector';
import { createSafeWebGLRenderer, disposeSafeWebGLRenderer } from '../utils/webglUtils';
import {
  RotateCcw,
  Box,
  Compass,
  Scan,
  Layers,
  Sparkles,
  Info,
  MapPin,
  PlusCircle,
  Maximize2,
  Sliders,
  Eye,
  AlertTriangle,
  Zap,
  Mountain,
  RefreshCw,
} from 'lucide-react';

interface ThreeCanvasProps {
  enrichedProperty: EnrichedProperty | null;
  activeBuilding?: Building | null;
  allProperties?: EnrichedProperty[];
  allFloors?: Floor[];
  isSelected?: boolean;
  onSelectProperty?: (propertyId: string) => void;
  explodedOffset?: number; // 0 to 1
  onExplodedOffsetChange?: (offset: number) => void;
  viewMode?: 'volumetric' | 'xray' | 'wireframe';
  showRuler?: boolean;
  onToggleRuler?: () => void;
  filterFloor?: number | 'ALL';
  isInitialBlank?: boolean;
  isEmptyParcel?: boolean;
  unmappedCoordinates?: { lat: number; lng: number } | null;
  onOpenIngestionModal?: () => void;
  showUnderground?: boolean;
  onToggleUnderground?: () => void;
  undergroundAssets?: UndergroundAsset[];
  clashReport?: UndergroundClashReport | null;
  showTerrainMesh?: boolean;
  onToggleTerrainMesh?: () => void;
  terrainModel?: TerrainElevationModel | null;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  enrichedProperty,
  activeBuilding,
  allProperties = [],
  allFloors = [],
  isSelected = true,
  onSelectProperty,
  explodedOffset = 0,
  onExplodedOffsetChange,
  viewMode = 'volumetric',
  showRuler = true,
  onToggleRuler,
  filterFloor = 'ALL',
  isInitialBlank = false,
  isEmptyParcel = false,
  unmappedCoordinates = null,
  onOpenIngestionModal,
  showUnderground = false,
  onToggleUnderground,
  undergroundAssets = DEFAULT_UNDERGROUND_ASSETS,
  clashReport = null,
  showTerrainMesh = false,
  onToggleTerrainMesh,
  terrainModel = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const unitMeshesRef = useRef<THREE.Mesh[]>([]);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  const [hoveredUnit, setHoveredUnit] = useState<{
    propertyId: string;
    flatNumber: string;
    floorNumber: number;
    bottomHeight: number;
    topHeight: number;
    identifier: string;
    propertyType: string;
  } | null>(null);

  const [cameraView, setCameraView] = useState<'iso' | 'front' | 'top' | 'side'>('iso');
  const [modelLoading, setModelLoading] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [webglContextLost, setWebglContextLost] = useState<boolean>(false);
  const [webglRetryCount, setWebglRetryCount] = useState<number>(0);

  // Active building reference
  const currentBuilding = activeBuilding || enrichedProperty?.building || null;
  const targetBuildingId = currentBuilding?.building_id || currentBuilding?.id;
  const activePropId = enrichedProperty?.property.property_id || '';
  const activeGeom = enrichedProperty?.verticalGeometry || {
    width: 6.8,
    length: 12.0,
    bottom_height: 6.0,
    top_height: 9.0,
    height: 3.0,
    x_offset: -3.6,
    y_offset: 0.0,
  };
  const activeFloorNo = enrichedProperty?.floor.floor_number ?? 1;

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const { renderer, error, isFallbackMode } = createSafeWebGLRenderer({
      antialias: true,
      alpha: false,
    });

    if (!renderer) {
      console.warn('ThreeCanvas: WebGL unavailable or blocked:', error);
      setWebglError(error || 'WebGL context could not be created or was blocked by browser.');
      return;
    }

    setWebglError(null);
    setWebglContextLost(false);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    // Fog for depth
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.012);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(24, 20, 24);
    cameraRef.current = camera;

    // Renderer
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isFallbackMode;
    if (!isFallbackMode) {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    rendererRef.current = renderer;

    // Clear previous canvases
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // Context loss prevention
    const canvas = renderer.domElement;
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('ThreeCanvas: WebGL context lost event caught.');
      setWebglContextLost(true);
    };
    const handleContextRestored = () => {
      console.info('ThreeCanvas: WebGL context restored.');
      setWebglContextLost(false);
      setWebglRetryCount((c) => c + 1);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    // Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.25);
    dirLight.position.set(25, 45, 25);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.5);
    fillLight.position.set(-25, 20, -25);
    scene.add(fillLight);

    const underLight = new THREE.DirectionalLight(0xe2e8f0, 0.4);
    underLight.position.set(0, -10, 0);
    scene.add(underLight);

    // Cadastral Ground Grid (Survey Plot Grid)
    const gridHelper = new THREE.GridHelper(36, 36, 0x0284c7, 0xcfd8dc);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Camera Orbit Controls (Spherical Orbit)
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const targetLookAt = new THREE.Vector3(0, 6.0, 0);

    const spherical = {
      radius: 36,
      theta: Math.PI / 4,
      phi: Math.PI / 3.2,
    };

    const updateCameraFromSpherical = () => {
      camera.position.x = targetLookAt.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = targetLookAt.y + spherical.radius * Math.cos(spherical.phi);
      camera.position.z = targetLookAt.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(targetLookAt);
    };
    updateCameraFromSpherical();

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycast check for hover across all interactive unit meshes
      if (cameraRef.current && unitMeshesRef.current.length > 0 && sceneRef.current) {
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const intersects = raycasterRef.current.intersectObjects(unitMeshesRef.current, false);
        if (intersects.length > 0) {
          const hitMesh = intersects[0].object as THREE.Mesh;
          if (hitMesh.userData && hitMesh.userData.propertyInfo) {
            setHoveredUnit(hitMesh.userData.propertyInfo);
            container.style.cursor = 'pointer';
          }
        } else {
          setHoveredUnit(null);
          container.style.cursor = isDragging ? 'grabbing' : 'grab';
        }
      }

      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      if (e.buttons === 1) {
        // Rotate (allow pitch down to see underground basements and utility pipelines)
        spherical.theta -= deltaX * 0.008;
        spherical.phi = Math.max(0.05, Math.min(Math.PI * 0.85, spherical.phi - deltaY * 0.008));
        updateCameraFromSpherical();
      } else if (e.buttons === 2) {
        // Pan vertical
        targetLookAt.y += deltaY * 0.04;
        updateCameraFromSpherical();
      }
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
      container.style.cursor = 'grab';
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius = Math.max(12, Math.min(80, spherical.radius + e.deltaY * 0.04));
      updateCameraFromSpherical();
    };

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const mouseVec = new THREE.Vector2(x, y);

      if (cameraRef.current && unitMeshesRef.current.length > 0) {
        raycasterRef.current.setFromCamera(mouseVec, cameraRef.current);
        const intersects = raycasterRef.current.intersectObjects(unitMeshesRef.current, false);
        if (intersects.length > 0) {
          const hitMesh = intersects[0].object as THREE.Mesh;
          if (hitMesh.userData && hitMesh.userData.propertyId && onSelectProperty) {
            onSelectProperty(hitMesh.userData.propertyId);
          }
        }
      }
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('click', onClick);
    container.addEventListener('contextmenu', (e) => e.preventDefault());

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && rendererRef.current && cameraRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('click', onClick);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      disposeSafeWebGLRenderer(renderer, container);
      rendererRef.current = null;
    };
  }, [webglRetryCount]);

  // Re-build 3D Meshes whenever geometry, property list, floor filter, selection, exploded view, or viewMode changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || webglError || webglContextLost) return;

    // Reset interactive meshes array
    unitMeshesRef.current = [];

    // Remove previous dynamic objects (tagged with cadastreTag)
    const toRemove: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child.userData && child.userData.cadastreTag) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((obj) => {
      scene.remove(obj);
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) {
        if (Array.isArray((obj as any).material)) {
          (obj as any).material.forEach((m: any) => m.dispose());
        } else {
          (obj as any).material.dispose();
        }
      }
    });

    const dynamicGroup = new THREE.Group();
    dynamicGroup.userData.cadastreTag = true;

    // 0. BLANK INITIAL STATE
    if (isInitialBlank) {
      const centerCircleGeo = new THREE.RingGeometry(2.0, 2.4, 32);
      centerCircleGeo.rotateX(-Math.PI / 2);
      const centerCircleMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const centerCircle = new THREE.Mesh(centerCircleGeo, centerCircleMat);
      centerCircle.position.y = 0.05;
      dynamicGroup.add(centerCircle);

      const crossGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-4, 0.06, 0),
        new THREE.Vector3(4, 0.06, 0),
        new THREE.Vector3(0, 0.06, -4),
        new THREE.Vector3(0, 0.06, 4),
      ]);
      const crossLine = new THREE.LineSegments(
        crossGeo,
        new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.5 })
      );
      dynamicGroup.add(crossLine);

      scene.add(dynamicGroup);
      return;
    }

    // 0.B UNMAPPED PARCEL STATE: Render illuminated 20m x 20m parcel footprint
    if (isEmptyParcel) {
      const parcelSize = 20.0;
      const parcelFloorGeo = new THREE.PlaneGeometry(parcelSize, parcelSize);
      parcelFloorGeo.rotateX(-Math.PI / 2);
      const parcelFloorMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
      });
      const parcelFloor = new THREE.Mesh(parcelFloorGeo, parcelFloorMat);
      parcelFloor.position.y = 0.02;
      dynamicGroup.add(parcelFloor);

      const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(parcelSize, 0.15, parcelSize));
      const borderLine = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 3 })
      );
      borderLine.position.y = 0.08;
      dynamicGroup.add(borderLine);

      // 4 Corner boundary beacons & vertical laser guides
      const corners = [
        [-parcelSize / 2, -parcelSize / 2],
        [parcelSize / 2, -parcelSize / 2],
        [parcelSize / 2, parcelSize / 2],
        [-parcelSize / 2, parcelSize / 2],
      ];
      corners.forEach(([cx, cz]) => {
        const beaconGeo = new THREE.CylinderGeometry(0.3, 0.45, 2.5, 16);
        const beaconMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xd97706,
          emissiveIntensity: 0.9,
          roughness: 0.3,
        });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(cx, 1.25, cz);
        dynamicGroup.add(beacon);

        const rayGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(cx, 0, cz),
          new THREE.Vector3(cx, 14, cz),
        ]);
        const rayLine = new THREE.Line(
          rayGeo,
          new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.45 })
        );
        dynamicGroup.add(rayLine);
      });

      scene.add(dynamicGroup);
      return;
    }

    // Precalculate properties to render: strictly restrict to displaying building flats only
    const rawList = allProperties.length > 0 ? allProperties : enrichedProperty ? [enrichedProperty] : [];
    const propertiesToRender = targetBuildingId
      ? rawList.filter((p) => {
          const pBldId =
            p.building?.building_id ||
            p.building?.id ||
            p.property?.building_id ||
            p.floor?.building_id ||
            p.location?.building_id;
          return pBldId === targetBuildingId;
        })
      : rawList;

    // 1. Overall Building Envelope
    const buildingWidth = currentBuilding?.plot_area ? Math.min(24, Math.sqrt(currentBuilding.plot_area * 0.6)) : 16.0;
    const buildingLength = 14.0;
    const totalHeight = currentBuilding?.total_height || currentBuilding?.total_building_height || 12.0;

    // Check if GLB model is present:
    // Only load external single-volume GLB if there are NO parametric apartment units defined.
    // If apartment units exist, we display the multi-unit cadastre model without an opaque GLB outer box blocking the view.
    if (currentBuilding?.model_url && currentBuilding.model_type === 'uploaded_glb' && propertiesToRender.length === 0) {
      setModelLoading(true);
      const loader = new GLTFLoader();
      loader.load(
        currentBuilding.model_url,
        (gltf) => {
          setModelLoading(false);
          const modelScene = gltf.scene;
          modelScene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              if (mesh.material) {
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                mats.forEach((m) => {
                  m.transparent = true;
                  m.opacity = 0.08;
                  m.depthWrite = false;
                  if ('roughness' in m) {
                    (m as any).roughness = 0.3;
                  }
                });
              }
              unitMeshesRef.current.push(mesh);
            }
          });
          dynamicGroup.add(modelScene);
        },
        undefined,
        (error) => {
          console.warn('GLTFLoader error, falling back to parametric extrusion:', error);
          setModelLoading(false);
        }
      );
    }

    const bldEnvelopeGeo = new THREE.BoxGeometry(buildingWidth, totalHeight, buildingLength);
    const bldEnvelopeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      transparent: true,
      opacity: viewMode === 'wireframe' ? 0.02 : 0.06,
      roughness: 0.2,
      metalness: 0.05,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const bldMesh = new THREE.Mesh(bldEnvelopeGeo, bldEnvelopeMat);
    bldMesh.position.set(0, totalHeight / 2, 0);
    dynamicGroup.add(bldMesh);

    // Building Wireframe Skeleton
    const bldEdges = new THREE.EdgesGeometry(bldEnvelopeGeo);
    const bldLine = new THREE.LineSegments(
      bldEdges,
      new THREE.LineBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.4,
      })
    );
    bldLine.position.set(0, totalHeight / 2, 0);
    dynamicGroup.add(bldLine);

    // 2. Floor Plates for all floors (including Sub-surface Basements if showUnderground)
    let floorsToRender: any[] = allFloors.length > 0 ? [...allFloors] : [];
    if (floorsToRender.length === 0) {
      floorsToRender = [
        { floor_number: -1, bottom_height: -3, top_height: 0, floor_id: 'B001-B01', floor_name: 'Basement B1 (Sub-surface)' },
        { floor_number: 0, bottom_height: 0, top_height: 3, floor_id: 'B001-F00', floor_name: 'Ground Floor' },
        { floor_number: 1, bottom_height: 3, top_height: 6, floor_id: 'B001-F01', floor_name: '1st Floor' },
        { floor_number: 2, bottom_height: 6, top_height: 9, floor_id: 'B001-F02', floor_name: '2nd Floor' },
        { floor_number: 3, bottom_height: 9, top_height: 12, floor_id: 'B001-F03', floor_name: '3rd Floor' },
      ];
    } else if (showUnderground && !floorsToRender.some((f) => f.floor_number < 0)) {
      // Ensure basement floor is present if user has enabled subsurface view
      floorsToRender.unshift({
        floor_number: -1,
        bottom_height: -3,
        top_height: 0,
        floor_id: 'B001-B01',
        floor_name: 'Basement B1 (Sub-surface Parking)',
      });
    }

    if (!showUnderground) {
      floorsToRender = floorsToRender.filter((f) => f.floor_number >= 0);
    }

    // 2.1 Subterranean Strata & Excavation Pit (Z < 0)
    if (showUnderground) {
      const pitDepth = 3.2;
      const pitWidth = buildingWidth + 0.8;
      const pitLength = buildingLength + 0.8;

      // Foundation Excavation Pit Retaining Walls (Slurry wall)
      const pitWallGeo = new THREE.BoxGeometry(pitWidth, pitDepth, pitLength);
      const pitWallMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        transparent: true,
        opacity: 0.22,
        roughness: 0.8,
        side: THREE.BackSide,
      });
      const pitWall = new THREE.Mesh(pitWallGeo, pitWallMat);
      pitWall.position.set(0, -pitDepth / 2, 0);
      dynamicGroup.add(pitWall);

      // Pit perimeter wireframe
      const pitEdges = new THREE.EdgesGeometry(pitWallGeo);
      const pitLine = new THREE.LineSegments(
        pitEdges,
        new THREE.LineBasicMaterial({
          color: 0x94a3b8,
          transparent: true,
          opacity: 0.6,
        })
      );
      pitLine.position.set(0, -pitDepth / 2, 0);
      dynamicGroup.add(pitLine);

      // Excavation ground-level perimeter warning border (Hazard yellow)
      const rimPoints = [
        new THREE.Vector3(-pitWidth / 2, 0.02, -pitLength / 2),
        new THREE.Vector3(pitWidth / 2, 0.02, -pitLength / 2),
        new THREE.Vector3(pitWidth / 2, 0.02, pitLength / 2),
        new THREE.Vector3(-pitWidth / 2, 0.02, pitLength / 2),
        new THREE.Vector3(-pitWidth / 2, 0.02, -pitLength / 2),
      ];
      const rimGeo = new THREE.BufferGeometry().setFromPoints(rimPoints);
      const rimLine = new THREE.Line(
        rimGeo,
        new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 })
      );
      dynamicGroup.add(rimLine);

      // Deep foundation piling columns (bored piles into bedrock at -4.5m)
      const pileGeo = new THREE.CylinderGeometry(0.35, 0.35, 2.5, 12);
      const pileMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
      [-buildingWidth / 2 + 1.2, 0, buildingWidth / 2 - 1.2].forEach((px) => {
        [-buildingLength / 2 + 1.2, buildingLength / 2 - 1.2].forEach((pz) => {
          const pile = new THREE.Mesh(pileGeo, pileMat);
          pile.position.set(px, -pitDepth - 1.25, pz);
          dynamicGroup.add(pile);
        });
      });

      // 2.2 Underground Infrastructure Pipelines & Corridors (Module 2)
      if (undergroundAssets && undergroundAssets.length > 0) {
        undergroundAssets.forEach((asset) => {
          if (!asset.route_points || asset.route_points.length < 2) return;

          const points = asset.route_points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
          const curve = new THREE.CatmullRomCurve3(points);
          const radius = Math.max(0.2, (asset.diameter_or_width || 0.8) / 2);

          // Check if this asset has a clash detected
          const isClashing = clashReport?.clashes?.some(
            (c: any) =>
              (c.assetId || c.asset_id) === asset.asset_id ||
              (c.assetName || c.asset_name) === asset.name
          );

          // Pipe Tube Mesh
          const tubeGeo = new THREE.TubeGeometry(curve, 32, radius, 12, false);
          const pipeColor = isClashing
            ? 0xef4444
            : asset.color_code && typeof asset.color_code === 'string'
            ? parseInt(asset.color_code.replace('#', '0x'), 16)
            : 0x0284c7;

          const tubeMat = new THREE.MeshStandardMaterial({
            color: pipeColor,
            roughness: 0.3,
            metalness: 0.6,
            emissive: isClashing ? 0xdc2626 : pipeColor,
            emissiveIntensity: isClashing ? 0.8 : 0.25,
          });
          const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
          tubeMesh.castShadow = true;
          tubeMesh.receiveShadow = true;
          dynamicGroup.add(tubeMesh);

          // Buffer Zone Cylinder Sleeve (statutory right-of-way)
          const bufferRadius = radius + (asset.buffer_zone_meters || 1.5);
          const bufferGeo = new THREE.TubeGeometry(curve, 24, bufferRadius, 10, false);
          const bufferMat = new THREE.MeshBasicMaterial({
            color: isClashing ? 0xef4444 : pipeColor,
            transparent: true,
            opacity: isClashing ? 0.25 : 0.08,
            wireframe: true,
          });
          const bufferMesh = new THREE.Mesh(bufferGeo, bufferMat);
          dynamicGroup.add(bufferMesh);

          // If Clashing: Display Pulsating 3D Warning Beacon at Clash Coordinate
          if (isClashing && clashReport?.clashes) {
            const clash = clashReport.clashes.find(
              (c: any) =>
                c.assetId === asset.id ||
                c.asset_id === asset.id ||
                c.assetName === asset.name ||
                c.asset_name === asset.name
            );
            const pt = clash ? (clash.intersectionPoint || (clash as any).clash_point) : null;
            if (pt) {
              const warningDiamondGeo = new THREE.OctahedronGeometry(0.7, 0);
              const warningDiamondMat = new THREE.MeshStandardMaterial({
                color: 0xef4444,
                emissive: 0xff0000,
                emissiveIntensity: 1.0,
                roughness: 0.2,
              });
              const diamond = new THREE.Mesh(warningDiamondGeo, warningDiamondMat);
              diamond.position.set(pt.x, pt.y, pt.z);
              dynamicGroup.add(diamond);

              // Vertical warning beacon ray
              const rayPoints = [
                new THREE.Vector3(pt.x, pt.y, pt.z),
                new THREE.Vector3(pt.x, 8.0, pt.z),
              ];
              const rayGeo = new THREE.BufferGeometry().setFromPoints(rayPoints);
              const rayLine = new THREE.Line(
                rayGeo,
                new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2, transparent: true, opacity: 0.7 })
              );
              dynamicGroup.add(rayLine);
            }
          }
        });
      }
    }

    // 2.3 Terrain Elevation Relief Contours (Module 3)
    if (showTerrainMesh) {
      const terrainGroup = new THREE.Group();
      // Generate 3 concentric terrain topographic contour curves
      const contours = [
        { radius: 18, elevation: 0.0, color: 0x94a3b8 },
        { radius: 24, elevation: 0.25, color: 0x0ea5e9 },
        { radius: 30, elevation: 0.6, color: 0x38bdf8 },
      ];
      contours.forEach((c) => {
        const ringPoints: THREE.Vector3[] = [];
        for (let a = 0; a <= Math.PI * 2; a += Math.PI / 24) {
          const rx = Math.cos(a) * c.radius + (Math.sin(a * 4) * 0.8);
          const rz = Math.sin(a) * c.radius + (Math.cos(a * 3) * 0.8);
          ringPoints.push(new THREE.Vector3(rx, c.elevation, rz));
        }
        const contourGeo = new THREE.BufferGeometry().setFromPoints(ringPoints);
        const contourLine = new THREE.Line(
          contourGeo,
          new THREE.LineBasicMaterial({
            color: c.color,
            transparent: true,
            opacity: 0.35,
          })
        );
        terrainGroup.add(contourLine);
      });
      dynamicGroup.add(terrainGroup);
    }

    floorsToRender.forEach((fl) => {
      if (filterFloor !== 'ALL' && fl.floor_number !== filterFloor) return;

      const isCurrentUnitFloor = fl.floor_number === activeFloorNo;
      const verticalShift = fl.floor_number * explodedOffset * 4.5;

      // Floor slab plate at bottom_height
      const slabGeo = new THREE.BoxGeometry(buildingWidth - 0.3, 0.2, buildingLength - 0.3);
      const slabMat = new THREE.MeshStandardMaterial({
        color: isCurrentUnitFloor ? 0x0284c7 : fl.floor_number === 0 ? 0x0ea5e9 : 0xe2e8f0,
        transparent: true,
        opacity: isCurrentUnitFloor ? 0.55 : fl.floor_number === 0 ? 0.45 : 0.3,
        roughness: 0.5,
        depthWrite: false,
      });
      const slabMesh = new THREE.Mesh(slabGeo, slabMat);
      slabMesh.position.set(0, fl.bottom_height + 0.1 + verticalShift, 0);
      dynamicGroup.add(slabMesh);

      // Floor boundary wireframe
      const slabEdges = new THREE.EdgesGeometry(slabGeo);
      const slabLine = new THREE.LineSegments(
        slabEdges,
        new THREE.LineBasicMaterial({
          color: isCurrentUnitFloor ? 0x0284c7 : 0x94a3b8,
          transparent: true,
          opacity: 0.6,
        })
      );
      slabLine.position.set(0, fl.bottom_height + 0.1 + verticalShift, 0);
      dynamicGroup.add(slabLine);

      // Center Core / Elevator / Staircase Shaft Outline
      const coreGeo = new THREE.BoxGeometry(2.0, 3.0, 3.0);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xcfd8dc,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.set(0, fl.bottom_height + 1.5 + verticalShift, 0);
      dynamicGroup.add(coreMesh);
    });

    // Top Roof Slab Plate (Enclosing the top floor)
    if (filterFloor === 'ALL' && floorsToRender.length > 0) {
      const topFloorNum = Math.max(...floorsToRender.map((f) => f.floor_number));
      const topExplodedShift = topFloorNum * explodedOffset * 4.5;
      const roofSlabGeo = new THREE.BoxGeometry(buildingWidth - 0.3, 0.2, buildingLength - 0.3);
      const roofSlabMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.3,
        roughness: 0.5,
        depthWrite: false,
      });
      const roofSlabMesh = new THREE.Mesh(roofSlabGeo, roofSlabMat);
      roofSlabMesh.position.set(0, totalHeight + 0.1 + topExplodedShift, 0);
      dynamicGroup.add(roofSlabMesh);

      const roofEdges = new THREE.EdgesGeometry(roofSlabGeo);
      const roofLine = new THREE.LineSegments(
        roofEdges,
        new THREE.LineBasicMaterial({
          color: 0x94a3b8,
          transparent: true,
          opacity: 0.5,
        })
      );
      roofLine.position.set(0, totalHeight + 0.1 + topExplodedShift, 0);
      dynamicGroup.add(roofLine);
    }

    // 3. Render Property Units in 3D
    propertiesToRender.forEach((item) => {
      const flNumber = item.floor.floor_number;
      if (filterFloor !== 'ALL' && flNumber !== filterFloor) return;

      const pId = item.property.property_id;
      const isThisSelected = pId === activePropId;
      const geom = item.verticalGeometry;
      const pType = item.property.property_type.toLowerCase();

      const unitWidth = Math.max(2, geom.width || 6.8);
      const unitLength = Math.max(2, geom.length || 12.0);
      const unitHeight = Math.max(0.5, geom.top_height - geom.bottom_height);
      const xOffset = geom.x_offset ?? (pId.includes('101') || pId.includes('201') || pId.includes('301') || pId.includes('G01') ? -3.6 : 3.6);
      const yOffset = geom.y_offset ?? 0.0;

      const currentExplodedShift = flNumber * explodedOffset * 4.5;
      const centerY = geom.bottom_height + unitHeight / 2 + currentExplodedShift;

      const unitGeo = new THREE.BoxGeometry(unitWidth, unitHeight, unitLength);

      // Distinct Color & Material Palettes matching Image 2:
      // Floor 3 (top): Purple (#8b5cf6)
      // Floor 2 (mid): Indigo (#6366f1)
      // Floor 1 (lower): Tech Blue (#3b82f6)
      // Floor 0 (ground): Luminous Cyan (#06b6d4)
      let baseColor = 0x3b82f6;
      let emissiveColor = 0x1d4ed8;
      let emissiveInt = 0.2;
      let opacityVal = viewMode === 'xray' ? 0.35 : 0.65;

      if (isThisSelected) {
        baseColor = 0x06b6d4;
        emissiveColor = 0x0891b2;
        emissiveInt = 0.75;
        opacityVal = viewMode === 'xray' ? 0.5 : 0.9;
      } else if (pType.includes('parking') || pType.includes('stilt')) {
        baseColor = 0x06b6d4; // Luminous cyan glass
        emissiveColor = 0x0891b2;
        emissiveInt = 0.15;
        opacityVal = 0.5;
      } else if (pType.includes('watchman') || pType.includes('security')) {
        baseColor = 0x10b981; // Emerald glass
        emissiveColor = 0x047857;
        emissiveInt = 0.3;
        opacityVal = 0.65;
      } else {
        // Normal residential flat
        baseColor = flNumber === 1 ? 0x3b82f6 : flNumber === 2 ? 0x6366f1 : 0x8b5cf6;
        emissiveColor = flNumber === 1 ? 0x1d4ed8 : flNumber === 2 ? 0x4338ca : 0x7c3aed;
        emissiveInt = 0.2;
      }

      if (viewMode === 'wireframe') {
        opacityVal = 0.1;
      }

      const unitMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        transparent: true,
        opacity: opacityVal,
        roughness: 0.25,
        metalness: 0.2,
        emissive: emissiveColor,
        emissiveIntensity: emissiveInt,
        depthWrite: false, // Prevents depth fighting and dark occlusions
      });

      const unitMesh = new THREE.Mesh(unitGeo, unitMat);
      unitMesh.position.set(xOffset, centerY, yOffset);
      unitMesh.castShadow = true;
      unitMesh.receiveShadow = true;

      // Metadata on mesh for raycast selection & hover tooltip
      unitMesh.userData = {
        propertyId: pId,
        propertyInfo: {
          propertyId: pId,
          flatNumber: item.property.flat_number,
          floorNumber: flNumber,
          bottomHeight: geom.bottom_height,
          topHeight: geom.top_height,
          identifier: item.prototype3DId.generated_identifier,
          propertyType: item.property.property_type,
        },
      };

      unitMeshesRef.current.push(unitMesh);
      dynamicGroup.add(unitMesh);

      // Edge outlines
      const unitEdges = new THREE.EdgesGeometry(unitGeo);
      const unitOutline = new THREE.LineSegments(
        unitEdges,
        new THREE.LineBasicMaterial({
          color: isThisSelected ? 0x22d3ee : isThisSelected ? 0x38bdf8 : 0x94a3b8,
          linewidth: isThisSelected ? 3 : 1,
          transparent: true,
          opacity: isThisSelected ? 0.95 : 0.6,
        })
      );
      unitOutline.position.set(xOffset, centerY, yOffset);
      dynamicGroup.add(unitOutline);

      // Interior Spatial Architectural Elements
      if (viewMode !== 'wireframe') {
        // Parking slots visual lines for Ground Floor Parking
        if (pType.includes('parking')) {
          const slotLinesGeo = new THREE.BufferGeometry();
          const slotPoints: THREE.Vector3[] = [];
          // 4 parking bay dividers
          for (let s = -unitLength / 2 + 1.5; s <= unitLength / 2 - 1.5; s += 2.8) {
            slotPoints.push(new THREE.Vector3(-unitWidth / 2 + 0.2, -unitHeight / 2 + 0.05, s));
            slotPoints.push(new THREE.Vector3(unitWidth / 2 - 0.2, -unitHeight / 2 + 0.05, s));
          }
          slotLinesGeo.setFromPoints(slotPoints);
          const slotLines = new THREE.LineSegments(
            slotLinesGeo,
            new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 })
          );
          slotLines.position.set(xOffset, centerY, yOffset);
          dynamicGroup.add(slotLines);

          // Support Stilt Pillars
          const pillarGeo = new THREE.CylinderGeometry(0.2, 0.2, unitHeight, 8);
          const pillarMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.2 });
          [-unitWidth / 2 + 0.5, unitWidth / 2 - 0.5].forEach((px) => {
            [-unitLength / 2 + 1, 0, unitLength / 2 - 1].forEach((pz) => {
              const pillar = new THREE.Mesh(pillarGeo, pillarMat);
              pillar.position.set(xOffset + px, centerY, yOffset + pz);
              dynamicGroup.add(pillar);
            });
          });
        } else if (pType.includes('watchman')) {
          // Security cabin door and viewing glass window frame
          const winFrameGeo = new THREE.BufferGeometry();
          const winPoints = [
            // Window box outline
            new THREE.Vector3(-unitWidth / 2 + 0.1, 0.2, -1.0),
            new THREE.Vector3(-unitWidth / 2 + 0.1, 1.0, -1.0),
            new THREE.Vector3(-unitWidth / 2 + 0.1, 1.0, 1.0),
            new THREE.Vector3(-unitWidth / 2 + 0.1, 0.2, 1.0),
            new THREE.Vector3(-unitWidth / 2 + 0.1, 0.2, -1.0),
          ];
          winFrameGeo.setFromPoints(winPoints);
          const winLine = new THREE.Line(
            winFrameGeo,
            new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 2 })
          );
          winLine.position.set(xOffset, centerY, yOffset);
          dynamicGroup.add(winLine);
        } else {
          // Residential Flat Interior Room Partition Grid (Living Room, Bedrooms, Balcony)
          const roomLineGeo = new THREE.BufferGeometry();
          const halfW = unitWidth / 2;
          const halfL = unitLength / 2;
          const points = [
            // Wall along length (separating hall from bedrooms)
            new THREE.Vector3(0, -unitHeight / 2, -halfL),
            new THREE.Vector3(0, unitHeight / 2, -halfL),
            new THREE.Vector3(0, unitHeight / 2, halfL * 0.4),
            new THREE.Vector3(0, -unitHeight / 2, halfL * 0.4),
            // Wall across width
            new THREE.Vector3(-halfW, -unitHeight / 2, 0),
            new THREE.Vector3(-halfW, unitHeight / 2, 0),
            new THREE.Vector3(halfW, unitHeight / 2, 0),
            new THREE.Vector3(halfW, -unitHeight / 2, 0),
          ];
          roomLineGeo.setFromPoints(points);
          const roomLines = new THREE.LineSegments(
            roomLineGeo,
            new THREE.LineBasicMaterial({
              color: isThisSelected ? 0xa5f3fc : 0x93c5fd,
              transparent: true,
              opacity: 0.35,
            })
          );
          roomLines.position.set(xOffset, centerY, yOffset);
          dynamicGroup.add(roomLines);

          // Balcony railing line on outer edge
          const balconyRailGeo = new THREE.BufferGeometry();
          const railX = xOffset < 0 ? -halfW : halfW;
          const railPoints = [
            new THREE.Vector3(railX, -unitHeight / 2 + 1.0, -halfL),
            new THREE.Vector3(railX, -unitHeight / 2 + 1.0, halfL),
          ];
          balconyRailGeo.setFromPoints(railPoints);
          const railLine = new THREE.Line(
            balconyRailGeo,
            new THREE.LineBasicMaterial({
              color: isThisSelected ? 0x38bdf8 : 0x64748b,
              linewidth: 2,
            })
          );
          railLine.position.set(xOffset, centerY, yOffset);
          dynamicGroup.add(railLine);
        }
      }
    });

    // 4. Vertical Height Ruler & Elevation Calipers (supports negative elevations Z < 0)
    if (showRuler) {
      const rulerX = -buildingWidth / 2 - 2.5;
      const rulerZ = buildingLength / 2 + 1;
      const minH = showUnderground ? -4 : 0;

      // Master Vertical Axis Line
      const axisPoints = [
        new THREE.Vector3(rulerX, minH, rulerZ),
        new THREE.Vector3(rulerX, totalHeight + 1, rulerZ),
      ];
      const axisGeo = new THREE.BufferGeometry().setFromPoints(axisPoints);
      const axisLine = new THREE.Line(
        axisGeo,
        new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
      );
      dynamicGroup.add(axisLine);

      // Height ticks every 1 meter (including subterranean levels Z < 0)
      for (let h = minH; h <= totalHeight; h += 1) {
        const isFloorBoundary = h % 3 === 0;
        const isSubterranean = h < 0;
        const tickLength = isFloorBoundary ? 1.2 : 0.5;
        const tickPoints = [
          new THREE.Vector3(rulerX, h, rulerZ),
          new THREE.Vector3(rulerX + tickLength, h, rulerZ),
        ];
        const tickGeo = new THREE.BufferGeometry().setFromPoints(tickPoints);
        const tickLine = new THREE.Line(
          tickGeo,
          new THREE.LineBasicMaterial({
            color: isSubterranean ? 0xf59e0b : isFloorBoundary ? 0x22d3ee : 0x64748b,
            linewidth: isFloorBoundary ? 2 : 1,
          })
        );
        dynamicGroup.add(tickLine);
      }

      // Selected Unit Elevation Caliper Bracket (from bottom_height to top_height)
      const currentExplodedShift = activeFloorNo * explodedOffset * 4.5;
      const caliperX = buildingWidth / 2 + 1.8;
      const caliperPoints = [
        new THREE.Vector3(caliperX - 0.8, activeGeom.bottom_height + currentExplodedShift, 0),
        new THREE.Vector3(caliperX, activeGeom.bottom_height + currentExplodedShift, 0),
        new THREE.Vector3(caliperX, activeGeom.top_height + currentExplodedShift, 0),
        new THREE.Vector3(caliperX - 0.8, activeGeom.top_height + currentExplodedShift, 0),
      ];
      const caliperGeo = new THREE.BufferGeometry().setFromPoints(caliperPoints);
      const caliperLine = new THREE.Line(
        caliperGeo,
        new THREE.LineBasicMaterial({
          color: activeGeom.bottom_height < 0 ? 0xf59e0b : 0x06b6d4, // Amber if subterranean, cyan otherwise
          linewidth: 3,
        })
      );
      dynamicGroup.add(caliperLine);
    }

    // 5. Cadastral Compass & North Arrow on Ground
    const arrowDir = new THREE.Vector3(0, 0, -1);
    const arrowOrigin = new THREE.Vector3(buildingWidth / 2 + 3, 0.05, -buildingLength / 2 - 2);
    const arrowHelper = new THREE.ArrowHelper(arrowDir, arrowOrigin, 4.5, 0xef4444, 1.2, 0.8);
    dynamicGroup.add(arrowHelper);

    scene.add(dynamicGroup);
  }, [
    activePropId,
    activeGeom.bottom_height,
    activeGeom.top_height,
    activeGeom.width,
    activeGeom.length,
    activeGeom.height,
    activeGeom.x_offset,
    activeGeom.y_offset,
    currentBuilding?.total_height,
    currentBuilding?.total_building_height,
    currentBuilding?.model_url,
    activeFloorNo,
    allProperties,
    allFloors,
    isSelected,
    explodedOffset,
    viewMode,
    showRuler,
    filterFloor,
    isInitialBlank,
    isEmptyParcel,
    showUnderground,
    undergroundAssets,
    clashReport,
    showTerrainMesh,
  ]);

  // Camera presets
  const setPresetView = (view: 'iso' | 'front' | 'top' | 'side') => {
    const camera = cameraRef.current;
    if (!camera) return;
    setCameraView(view);

    if (view === 'iso') {
      camera.position.set(24, 20, 24);
      camera.lookAt(0, 6.0, 0);
    } else if (view === 'front') {
      // Front elevation showing vertical height range (Z-elevation profile)
      camera.position.set(0, 6.0, 36);
      camera.lookAt(0, 6.0, 0);
    } else if (view === 'top') {
      // 2D Cadastral parcel footprint plan
      camera.position.set(0, 42, 0.001);
      camera.lookAt(0, 0, 0);
    } else if (view === 'side') {
      camera.position.set(36, 6.0, 0);
      camera.lookAt(0, 6.0, 0);
    }
  };

  const handleResetCamera = () => {
    setPresetView('iso');
  };

  return (
    <div className="relative w-full h-full min-h-[440px] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-md flex flex-col">
      {/* 3D WebGL Canvas Container or 2D Volumetric Blueprint Fallback */}
      {webglError || webglContextLost ? (
        <div className="relative w-full h-full flex-1 bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden select-none">
          {/* SVG Volumetric Blueprint Plan */}
          <svg
            className="w-full h-full max-h-[460px] select-none"
            viewBox="0 0 800 440"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="cadastre-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1e293b" strokeWidth="0.7" />
              </pattern>
              <linearGradient id="blueprint-unit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0369a1" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="selected-unit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Grid Background */}
            <rect width="800" height="440" fill="url(#cadastre-grid)" />

            {/* Cadastral Base Parcel (Isometric Ground Outline) */}
            <polygon
              points="400,390 680,290 400,200 120,290"
              fill="#0b1329"
              stroke="#0284c7"
              strokeWidth="2"
              strokeDasharray="6 3"
            />
            <text x="130" y="285" fill="#38bdf8" fontSize="10" fontFamily="monospace">
              Survey Parcel: {currentBuilding?.survey_number || 'Plot Boundary'}
            </text>

            {/* North Compass Indicator */}
            <g transform="translate(60, 60)">
              <circle cx="0" cy="0" r="20" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
              <polygon points="0,-16 5,0 0,-4 -5,0" fill="#ef4444" />
              <polygon points="0,16 5,0 0,4 -5,0" fill="#94a3b8" />
              <text x="0" y="-20" fill="#ef4444" fontSize="11" fontWeight="bold" textAnchor="middle">
                N
              </text>
            </g>

            {/* Stacked Cadastral Floors */}
            {(() => {
              const floorsToRender = allFloors && allFloors.length > 0
                ? allFloors
                : Array.from({ length: currentBuilding?.total_floors || 4 }).map((_, i) => ({
                    floor_id: `FLR-${i}`,
                    building_id: currentBuilding?.building_id || 'B001',
                    floor_number: i,
                    elevation_above_ground: i * 3.0,
                    height: 3.0,
                    built_up_area: 280,
                    gross_floor_area: 260,
                  }));

              const totalFlrs = floorsToRender.length;

              return floorsToRender.map((floor, fIdx) => {
                const stepY = fIdx * (160 / Math.max(1, totalFlrs));
                const baseY = 340 - stepY;
                const isSelectedFloor = enrichedProperty?.floor.floor_number === floor.floor_number;

                // Units on this floor (strictly filtered to this displaying building)
                const floorUnits = (allProperties || []).filter((p) => {
                  const pBldId =
                    p.building?.building_id ||
                    p.building?.id ||
                    p.property?.building_id ||
                    p.floor?.building_id ||
                    p.location?.building_id;
                  const matchesBld = !targetBuildingId || pBldId === targetBuildingId;
                  return matchesBld && p.floor.floor_number === floor.floor_number;
                });

                return (
                  <g key={`blueprint-floor-${floor.floor_id || fIdx}`}>
                    {/* Floor Slab Polygon */}
                    <polygon
                      points={`400,${baseY} 640,${baseY - 70} 400,${baseY - 130} 160,${baseY - 70}`}
                      fill={isSelectedFloor ? 'rgba(8, 145, 178, 0.25)' : 'rgba(15, 23, 42, 0.7)'}
                      stroke={isSelectedFloor ? '#22d3ee' : '#334155'}
                      strokeWidth={isSelectedFloor ? 2 : 1.2}
                    />

                    {/* Floor Elevation Marker Label */}
                    {(() => {
                      const elev =
                        typeof (floor as any).elevation_above_ground === 'number'
                          ? (floor as any).elevation_above_ground
                          : typeof floor.bottom_height === 'number'
                          ? floor.bottom_height
                          : (floor.floor_number ?? 0) * 3.0;
                      return (
                        <text
                          x="130"
                          y={baseY - 65}
                          fill={isSelectedFloor ? '#22d3ee' : '#64748b'}
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight={isSelectedFloor ? 'bold' : 'normal'}
                          textAnchor="end"
                        >
                          Floor {floor.floor_number ?? 0} (Z: {elev.toFixed(1)}m)
                        </text>
                      );
                    })()}

                    {/* Strata Unit Subdivisions */}
                    {floorUnits.map((prop, uIdx) => {
                      const isSelectedUnit = prop.property.property_id === activePropId;
                      const unitCount = floorUnits.length || 1;
                      const spreadX = ((uIdx - (unitCount - 1) / 2) * 80);
                      const unitCenterX = 400 + spreadX;
                      const unitCenterY = baseY - 65;

                      return (
                        <g
                          key={`unit-svg-${prop.property.property_id}`}
                          className="cursor-pointer transition-transform hover:scale-105"
                          onClick={() => onSelectProperty && onSelectProperty(prop.property.property_id)}
                          onMouseEnter={() =>
                            setHoveredUnit({
                              propertyId: prop.property.property_id,
                              flatNumber: prop.property.flat_number,
                              floorNumber: prop.floor.floor_number,
                              bottomHeight: prop.verticalGeometry.bottom_height,
                              topHeight: prop.verticalGeometry.top_height,
                              identifier: prop.prototype3DId.generated_identifier,
                              propertyType: prop.property.property_type,
                            })
                          }
                          onMouseLeave={() => setHoveredUnit(null)}
                        >
                          <rect
                            x={unitCenterX - 34}
                            y={unitCenterY - 18}
                            width="68"
                            height="36"
                            rx="5"
                            fill={isSelectedUnit ? 'url(#selected-unit-grad)' : 'url(#blueprint-unit-grad)'}
                            stroke={isSelectedUnit ? '#34d399' : '#38bdf8'}
                            strokeWidth={isSelectedUnit ? 2.5 : 1.2}
                          />
                          <text
                            x={unitCenterX}
                            y={unitCenterY + 2}
                            fill="#ffffff"
                            fontSize="11"
                            fontWeight="bold"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {prop.property.flat_number}
                          </text>
                          <text
                            x={unitCenterX}
                            y={unitCenterY + 13}
                            fill={isSelectedUnit ? '#a7f3d0' : '#bae6fd'}
                            fontSize="8"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {prop.property.area || (prop.property as any).carpet_area_sqm || 85} m²
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              });
            })()}

            {/* Vertical Elevation Caliper Axis on Right */}
            <line x1="710" y1="350" x2="710" y2="120" stroke="#f59e0b" strokeWidth="2" />
            <line x1="702" y1="350" x2="718" y2="350" stroke="#f59e0b" strokeWidth="2" />
            <line x1="702" y1="120" x2="718" y2="120" stroke="#f59e0b" strokeWidth="2" />
            <text x="726" y="240" fill="#fbbf24" fontSize="11" fontFamily="monospace" fontWeight="bold">
              Height: {((currentBuilding?.total_height ?? (currentBuilding as any)?.height_meters) ?? 12.0).toFixed(1)}m
            </text>
            <text x="726" y="354" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              0.0m Ground (Z=0)
            </text>
          </svg>

          {/* WebGL Hardware Notice & Recovery Banner */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-950/90 border border-amber-600/80 text-amber-200 text-xs shadow-xl backdrop-blur-md z-30">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-100 block text-xs">
                  WebGL Hardware Acceleration Disabled or Blocked — Active 2D Volumetric Cadastral Blueprint
                </span>
                <span className="text-[11px] text-amber-300/90 font-sans block">
                  All cadastral data, floors, units, height metrics, coordinates, and ULPIN records are fully functional.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="btn-retry-webgl"
                onClick={() => {
                  setWebglError(null);
                  setWebglContextLost(false);
                  setWebglRetryCount((c) => c + 1);
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry 3D WebGL</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full flex-1 cursor-grab" />
      )}

      {/* BLANK-SLATE INITIAL STATE OVERLAY */}
      {isInitialBlank && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-50/80 backdrop-blur-xs pointer-events-none z-20">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center max-w-md shadow-xl space-y-2.5">
            <div className="w-12 h-12 rounded-xl bg-cyan-100 border border-cyan-300 text-cyan-700 flex items-center justify-center mx-auto">
              <Scan className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 font-mono">Cadastral Spatial Viewport Awaiting Search</h3>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              Enter GPS Coordinates (e.g., <span className="text-cyan-700 font-bold font-mono">17.4435, 78.5410</span>) or paste a Google Maps URL in the search bar above to query PostGIS records.
            </p>
          </div>
        </div>
      )}

      {/* UNMAPPED PARCEL PROMPT OVERLAY */}
      {isEmptyParcel && (
        <div className="absolute top-4 inset-x-4 flex justify-center pointer-events-none z-20">
          <div className="bg-white border-2 border-amber-400 rounded-xl p-3.5 shadow-xl backdrop-blur-md max-w-lg w-full flex items-center justify-between gap-3 pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <span>No 3D Building at Coordinates</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold">
                    20m × 20m Parcel Footprint
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  {unmappedCoordinates && typeof unmappedCoordinates.lat === 'number' && typeof unmappedCoordinates.lng === 'number'
                    ? `${unmappedCoordinates.lat.toFixed(5)}, ${unmappedCoordinates.lng.toFixed(5)}`
                    : 'Searched Coordinates'}
                </div>
              </div>
            </div>

            {onOpenIngestionModal && (
              <button
                id="btn-register-3d-building-prompt"
                onClick={onOpenIngestionModal}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Register 3D Building</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Model Loading Indicator */}
      {modelLoading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white border border-cyan-400 text-cyan-800 rounded-full text-xs font-mono flex items-center gap-2 z-20 shadow-md">
          <div className="w-3 h-3 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading 3D GLB Model from Supabase Storage...</span>
        </div>
      )}

      {/* Top Floating Overlay - Cadastral Metadata Badges */}
      {!isInitialBlank && !isEmptyParcel && (
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 pointer-events-none z-10">
          <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-md bg-white/95 text-cyan-800 border border-slate-200 backdrop-blur-md flex items-center gap-1.5 shadow-xs">
            <Box className="w-3.5 h-3.5 text-cyan-600" />
            3D Cadastral Property Model
          </span>
          <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-white/95 text-slate-700 border border-slate-200 backdrop-blur-md shadow-xs">
            Building: <strong className="text-slate-900">{currentBuilding?.building_id || currentBuilding?.survey_number || 'Registered'}</strong>
          </span>
          <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-white/95 text-slate-700 border border-slate-200 backdrop-blur-md shadow-xs">
            Active: <strong className="text-cyan-700">{enrichedProperty?.property.flat_number || 'Unit Selected'}</strong>
          </span>
        </div>
      )}

      {/* Top Right - Hover Tooltip / Status */}
      {!isInitialBlank && !isEmptyParcel && (
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
          {hoveredUnit ? (
            <div className="px-3 py-1.5 text-xs rounded-lg bg-white/95 text-slate-800 border border-cyan-500 shadow-xl backdrop-blur-md flex items-center gap-2 animate-fadeIn">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" />
              <div>
                <span className="font-bold text-slate-900">{hoveredUnit.flatNumber}</span>
                <span className="text-slate-500 text-[10px] ml-1.5 font-mono">
                  (Floor {hoveredUnit.floorNumber} | Z: {hoveredUnit.bottomHeight}–{hoveredUnit.topHeight}m)
                </span>
                <span className="block text-[10px] text-amber-700 font-mono font-bold">
                  Prototype ID: {hoveredUnit.identifier}
                </span>
              </div>
            </div>
          ) : (
            <div className="px-3 py-1 text-xs rounded-md bg-white/90 text-slate-700 border border-slate-200 backdrop-blur-md flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-mono text-[11px]">Click Any Unit in 3D to Inspect</span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-white/95 border border-slate-200 backdrop-blur-md z-10 shadow-md text-slate-800">
        {/* Camera Preset Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPresetView('iso')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              cameraView === 'iso'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Isometric 3D Cadastral Perspective"
          >
            3D Iso
          </button>
          <button
            onClick={() => setPresetView('front')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              cameraView === 'front'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Front Elevation (Z-axis Vertical Extent View)"
          >
            Elevation (Z)
          </button>
          <button
            onClick={() => setPresetView('top')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              cameraView === 'top'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Top-down 2D Cadastral Plan"
          >
            2D Plan
          </button>
          <button
            onClick={() => setPresetView('side')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              cameraView === 'side'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Side Elevation View"
          >
            Side
          </button>
          <button
            onClick={handleResetCamera}
            className="p-1.5 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
            title="Reset Camera View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Explode View Slider & Height Ruler Toggle */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {onExplodedOffsetChange && !isInitialBlank && !isEmptyParcel && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
              <Sliders className="w-3.5 h-3.5 text-cyan-600" />
              <span className="text-[11px] text-slate-600">Explode View:</span>
              <input
                id="three-exploded-slider"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={explodedOffset}
                onChange={(e) => onExplodedOffsetChange(parseFloat(e.target.value))}
                className="w-20 sm:w-24 accent-cyan-600 cursor-pointer"
                title={`Explode floors: ${(((explodedOffset ?? 0) * 100)).toFixed(0)}%`}
              />
              <span className="text-[10px] text-cyan-700 font-bold w-7">
                {(((explodedOffset ?? 0) * 100)).toFixed(0)}%
              </span>
            </div>
          )}

          {onToggleRuler && (
            <button
              onClick={onToggleRuler}
              className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer ${
                showRuler
                  ? 'bg-cyan-100 text-cyan-800 border border-cyan-300 font-bold'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
              title="Toggle Vertical Height Ruler Calipers"
            >
              <Eye className="w-3 h-3" />
              <span>Ruler: {showRuler ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {onToggleUnderground && (
            <button
              onClick={onToggleUnderground}
              className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer ${
                showUnderground
                  ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
              title="Toggle Sub-surface Basements & Underground Infrastructure (Z < 0)"
            >
              <Layers className="w-3 h-3 text-indigo-600" />
              <span>Sub-surface (Z&lt;0): {showUnderground ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {onToggleTerrainMesh && (
            <button
              onClick={onToggleTerrainMesh}
              className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer ${
                showTerrainMesh
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
              title="Toggle Digital Elevation Model (DEM) Topographic Contours"
            >
              <Mountain className="w-3 h-3 text-emerald-600" />
              <span>Terrain: {showTerrainMesh ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {(clashReport?.hasCollision || (clashReport as any)?.has_clashes) && (
            <div className="px-2 py-0.5 rounded bg-red-100 border border-red-300 text-red-700 text-[10px] font-mono font-bold flex items-center gap-1 animate-pulse">
              <AlertTriangle className="w-3 h-3 text-red-600" />
              <span>{clashReport.clashes.length} Clash Detected</span>
            </div>
          )}
        </div>

        {/* Active Prototype 3D Property ID Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono hidden md:inline">3D ULPIN:</span>
          <span className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-cyan-50 text-cyan-800 border border-cyan-200 max-w-[260px] truncate" title={enrichedProperty?.prototype3DId.generated_identifier}>
            {enrichedProperty?.prototype3DId.generated_identifier || 'Awaiting Selection'}
          </span>
        </div>
      </div>
    </div>
  );
};
