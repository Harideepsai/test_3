/**
 * 3D Volumetric Topology & Clash Detection Engine
 * ISO 19152 Cadastral Spatial Intersect & Municipal Utility Corridor Buffer Check
 */

import { Building, ClashItem, UndergroundAsset, UndergroundClashReport } from '../types';

/**
 * Standard Municipal Underground Infrastructure around Malkajgiri & Madhapur Parcels
 */
export const DEFAULT_UNDERGROUND_ASSETS: UndergroundAsset[] = [
  {
    id: 'ug-hmwssb-wat-01',
    asset_id: 'UG-HMWSSB-WAT-01',
    asset_type: 'water_main',
    name: 'HMWSSB 900mm High-Pressure Potable Water Transmission Line',
    utility_provider: 'Hyderabad Metropolitan Water Supply & Sewerage Board (HMWSSB)',
    depth_start: 2.2,
    depth_end: 2.4,
    diameter_or_width: 0.9,
    color_code: '#0284c7', // Cyan-blue
    buffer_zone_meters: 2.5,
    route_points: [
      { x: -18, y: -2.2, z: -8 },
      { x: 18, y: -2.3, z: -8 },
    ],
    status: 'active',
    description: 'Bulk feeder main supplying Malkajgiri Zone 4 overhead reservoir',
    created_at: new Date('2026-01-10T08:00:00Z').toISOString(),
  },
  {
    id: 'ug-gail-gas-01',
    asset_id: 'UG-GAIL-GAS-01',
    asset_type: 'gas_conduit',
    name: 'GAIL High-Pressure City Gas Distribution Steel Conduit (16 Bar)',
    utility_provider: 'GAIL Gas Ltd & Bhagyanagar Gas Limited',
    depth_start: 1.8,
    depth_end: 1.8,
    diameter_or_width: 0.45,
    color_code: '#eab308', // Amber-yellow
    buffer_zone_meters: 4.0, // Strict buffer for safety
    route_points: [
      { x: -18, y: -1.8, z: 9.5 },
      { x: 18, y: -1.8, z: 9.5 },
    ],
    status: 'restricted_corridor',
    description: 'Class 4 high-pressure pipeline with statutory 4.0m exclusion buffer',
    created_at: new Date('2026-01-10T08:00:00Z').toISOString(),
  },
  {
    id: 'ug-ghmc-sew-01',
    asset_id: 'UG-GHMC-SEW-01',
    asset_type: 'sewage_pipeline',
    name: 'GHMC Trunk Gravity Sewer Interceptor (1200mm Reinforced Concrete)',
    utility_provider: 'Greater Hyderabad Municipal Corporation (GHMC)',
    depth_start: 4.6,
    depth_end: 5.1,
    diameter_or_width: 1.2,
    color_code: '#d97706', // Amber-brown
    buffer_zone_meters: 3.0,
    route_points: [
      { x: 11.5, y: -4.8, z: -18 },
      { x: 11.5, y: -5.0, z: 18 },
    ],
    status: 'active',
    description: 'Trunk sewage interceptor flowing towards Amberpet STP',
    created_at: new Date('2026-01-10T08:00:00Z').toISOString(),
  },
  {
    id: 'ug-hmrl-metro-01',
    asset_id: 'UG-HMRL-METRO-01',
    asset_type: 'metro_tunnel',
    name: 'HMRL Phase-2 Subterranean Metro Rapid Transit Twin Bore Tunnel',
    utility_provider: 'Hyderabad Metro Rail Limited (HMRL)',
    depth_start: 13.5,
    depth_end: 14.5,
    diameter_or_width: 5.8,
    color_code: '#9333ea', // Purple
    buffer_zone_meters: 6.0,
    route_points: [
      { x: -18, y: -14.0, z: -2.0 },
      { x: 18, y: -14.0, z: 3.5 },
    ],
    status: 'planned',
    description: 'Underground transit corridor reserved for future Metro expansion',
    created_at: new Date('2026-01-10T08:00:00Z').toISOString(),
  },
];

/**
 * Calculates minimum distance between a 3D bounding box (building foundation / basement)
 * and a 3D line segment (underground utility pipeline)
 */
function distanceBoxToSegment(
  boxMin: { x: number; y: number; z: number },
  boxMax: { x: number; y: number; z: number },
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number }
): { minDistance: number; closestPoint: { x: number; y: number; z: number } } {
  // Approximate minimum distance by sampling segment at fine resolution
  let minDistance = Infinity;
  let closestPoint = { ...p1 };
  const steps = 40;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = p1.x + t * (p2.x - p1.x);
    const py = p1.y + t * (p2.y - p1.y);
    const pz = p1.z + t * (p2.z - p1.z);

    // Clamped point on AABB
    const cx = Math.max(boxMin.x, Math.min(px, boxMax.x));
    const cy = Math.max(boxMin.y, Math.min(py, boxMax.y));
    const cz = Math.max(boxMin.z, Math.min(pz, boxMax.z));

    const dx = px - cx;
    const dy = py - cy;
    const dz = pz - cz;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < minDistance) {
      minDistance = dist;
      closestPoint = { x: px, y: py, z: pz };
    }
  }

  return { minDistance, closestPoint };
}

/**
 * Executes a 3D Volumetric Topology & Sub-surface Collision Audit on a Building
 */
export function runClashDetectionAudit(
  building: Building,
  customAssets?: UndergroundAsset[]
): UndergroundClashReport {
  const assets = customAssets && customAssets.length > 0 ? customAssets : DEFAULT_UNDERGROUND_ASSETS;

  // Determine Building foundation & basement bounding box in local plot coordinate space
  const buildingWidth = building.plot_area ? Math.min(22, Math.sqrt(building.plot_area * 0.6)) : 16.0;
  const buildingLength = 14.0;
  const halfW = buildingWidth / 2;
  const halfL = buildingLength / 2;

  // Depth of foundation / basement
  // Standard foundation depth is 2.5m minimum; basements go down to 3.5m or 6.0m
  const basementDepth = building.has_subsurface
    ? building.basement_depth || (building.basement_levels ? building.basement_levels * 3.2 : 3.5)
    : 2.5; // Standard footing foundation depth

  // Foundation box: [ -halfW, -basementDepth, -halfL ] to [ halfW, 0, halfL ]
  // Add 0.5m for outer footing offset
  const footingMargin = 0.5;
  const foundationBox = {
    min: { x: -halfW - footingMargin, y: -basementDepth, z: -halfL - footingMargin },
    max: { x: halfW + footingMargin, y: 0.1, z: halfL + footingMargin },
  };

  const clashes: ClashItem[] = [];
  let criticalClashes = 0;
  let bufferViolations = 0;
  let passedChecks = 0;

  for (const asset of assets) {
    if (!asset.route_points || asset.route_points.length < 2) continue;

    // Check each segment of the utility route
    let minAssetDistance = Infinity;
    let closestPoint = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < asset.route_points.length - 1; i++) {
      const p1 = asset.route_points[i];
      const p2 = asset.route_points[i + 1];
      const { minDistance, closestPoint: pt } = distanceBoxToSegment(foundationBox.min, foundationBox.max, p1, p2);
      if (minDistance < minAssetDistance) {
        minAssetDistance = minDistance;
        closestPoint = pt;
      }
    }

    const radius = asset.diameter_or_width / 2;
    const requiredClearance = radius + asset.buffer_zone_meters;
    const deficit = Math.max(0, requiredClearance - minAssetDistance);

    let severity: 'CRITICAL_CLASH' | 'BUFFER_VIOLATION' | 'CLEARANCE_OK' = 'CLEARANCE_OK';
    let recommendation = 'Standard building code clearance achieved. Safe for excavation.';

    if (minAssetDistance <= radius + 0.1) {
      severity = 'CRITICAL_CLASH';
      criticalClashes++;
      recommendation = `CRITICAL CLASH: Building foundation intersects the physical conduit of ${asset.name}. Immediate structural redesign required. Shift basement boundary or acquire NOC from ${asset.utility_provider}.`;
    } else if (minAssetDistance < requiredClearance) {
      severity = 'BUFFER_VIOLATION';
      bufferViolations++;
      recommendation = `BUFFER VIOLATION: Foundation is within ${minAssetDistance.toFixed(1)}m of ${asset.name}, violating statutory ${asset.buffer_zone_meters}m safety buffer by ${deficit.toFixed(1)}m. Require engineered reinforced retaining wall and joint site inspection with ${asset.utility_provider}.`;
    } else {
      passedChecks++;
    }

    clashes.push({
      id: `clash-${asset.asset_id}-${building.building_id || 'bld'}`,
      severity,
      assetId: asset.asset_id,
      assetName: asset.name,
      assetType: asset.asset_type,
      utilityProvider: asset.utility_provider,
      buildingElement: building.has_subsurface ? 'Basement B1 Excavation & Footing' : 'Foundation Strip Footing',
      minDistanceMeters: Math.round(minAssetDistance * 100) / 100,
      requiredClearanceMeters: Math.round(requiredClearance * 100) / 100,
      clearanceDeficitMeters: Math.round(deficit * 100) / 100,
      intersectionPoint: closestPoint,
      recommendation,
    });
  }

  return {
    buildingId: building.building_id || building.id,
    timestamp: new Date().toISOString(),
    totalChecks: assets.length,
    criticalClashes,
    bufferViolations,
    passedChecks,
    hasCollision: criticalClashes > 0 || bufferViolations > 0,
    clashes,
  };
}
