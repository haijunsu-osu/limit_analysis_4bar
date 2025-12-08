import { MechanismConfig, MechanismState, Point, GrashofType, LimitAnalysis } from '../types';

/**
 * Calculates the position of joint A (Crank Tip)
 */
export const calculateA = (r2: number, theta2: number): Point => {
  return {
    x: r2 * Math.cos(theta2),
    y: r2 * Math.sin(theta2)
  };
};

/**
 * Calculates the Euclidean distance between two points
 */
export const distance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

/**
 * Normalizes an angle to [0, 2*PI]
 */
export const normalizeAngle = (angle: number): number => {
  let a = angle % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return a;
};

/**
 * Converts radians to degrees
 */
export const toDegrees = (rad: number): number => {
  return (rad * 180) / Math.PI;
};

/**
 * Converts degrees to radians
 */
export const toRadians = (deg: number): number => {
  return (deg * Math.PI) / 180;
};

/**
 * Solves the Four-Bar mechanism for a given input angle theta2
 */
export const solveFourBar = (config: MechanismConfig, theta2: number): MechanismState => {
  const { r1, r2, r3, r4, assemblyMode } = config;

  const O2: Point = { x: 0, y: 0 };
  const O4: Point = { x: r1, y: 0 };
  const A = calculateA(r2, theta2);

  // Distance from A to O4
  const dist_AO4 = distance(A, O4);

  // Check triangle inequality for the triangle formed by r3, r4, and dist_AO4
  if (dist_AO4 > r3 + r4 || dist_AO4 < Math.abs(r3 - r4) || dist_AO4 === 0) {
    return {
      A, B: { x: 0, y: 0 }, O2, O4,
      theta2, theta3: 0, theta4: 0, transmissionAngle: 0,
      isValid: false
    };
  }

  // Intersection of Circle(A, r3) and Circle(O4, r4).
  const a_dist = (r3 * r3 - r4 * r4 + dist_AO4 * dist_AO4) / (2 * dist_AO4);
  const h = Math.sqrt(Math.max(0, r3 * r3 - a_dist * a_dist));

  const x2 = A.x + a_dist * (O4.x - A.x) / dist_AO4;
  const y2 = A.y + a_dist * (O4.y - A.y) / dist_AO4;

  // B1 is the "Right" / "Clockwise" solution relative to vector A->O4 (Crossed)
  const B1: Point = {
    x: x2 + h * (O4.y - A.y) / dist_AO4,
    y: y2 - h * (O4.x - A.x) / dist_AO4
  };

  // B2 is the "Left" / "Counter-Clockwise" solution relative to vector A->O4 (Open)
  const B2: Point = {
    x: x2 - h * (O4.y - A.y) / dist_AO4,
    y: y2 + h * (O4.x - A.x) / dist_AO4
  };

  // Assembly Mode 1 = Open (B2), -1 = Crossed (B1)
  const B = assemblyMode === 1 ? B2 : B1;

  const theta3 = Math.atan2(B.y - A.y, B.x - A.x);
  const theta4 = Math.atan2(B.y - O4.y, B.x - O4.x);

  // Transmission Angle (mu): Angle between coupler (r3) and output (r4)
  const val = (r3 * r3 + r4 * r4 - dist_AO4 * dist_AO4) / (2 * r3 * r4);
  const clampedVal = Math.max(-1, Math.min(1, val));
  const transmissionAngle = Math.acos(clampedVal);

  return {
    A, B, O2, O4,
    theta2, theta3, theta4,
    transmissionAngle,
    isValid: true
  };
};

/**
 * Inverse Kinematics: Calculate theta2 given a desired theta4.
 */
export const solveInverseTheta2 = (config: MechanismConfig, targetTheta4: number): number | null => {
  const { r1, r2, r3, r4 } = config;
  
  const Bx = r1 + r4 * Math.cos(targetTheta4);
  const By = r4 * Math.sin(targetTheta4);

  const dist_O2B = Math.sqrt(Bx*Bx + By*By);

  if (dist_O2B > r2 + r3 || dist_O2B < Math.abs(r2 - r3)) {
    return null;
  }

  const a_dist = (r2 * r2 - r3 * r3 + dist_O2B * dist_O2B) / (2 * dist_O2B);
  const h = Math.sqrt(Math.max(0, r2 * r2 - a_dist * a_dist));
  
  const x2 = 0 + a_dist * (Bx - 0) / dist_O2B;
  const y2 = 0 + a_dist * (By - 0) / dist_O2B;

  // We need to pick A1 or A2.
  // Generally, A1 corresponds to "up" intersection relative to O2-B vector.
  // This is context dependent, but for dragging B, we can just return one valid A.
  const A1 = {
    x: x2 + h * (By - 0) / dist_O2B,
    y: y2 - h * (Bx - 0) / dist_O2B
  };
  
  return Math.atan2(A1.y, A1.x);
};

/**
 * Identify Grashof Type
 */
export const getGrashofType = (config: MechanismConfig): GrashofType => {
  const { r1, r2, r3, r4 } = config;
  const links = [r1, r2, r3, r4].sort((a, b) => a - b);
  const s = links[0];
  const l = links[3];
  const p = links[1];
  const q = links[2];

  const grashof = s + l <= p + q;

  if (!grashof) return GrashofType.TRIPLE_ROCKER;
  if (s + l === p + q) return GrashofType.CHANGE_POINT;

  if (r2 === s) return GrashofType.CRANK_ROCKER;
  if (r1 === s) return GrashofType.DOUBLE_CRANK;
  if (r3 === s) return GrashofType.DOUBLE_ROCKER;
  if (r4 === s) return GrashofType.DOUBLE_ROCKER;

  return GrashofType.DOUBLE_ROCKER;
};

/**
 * Calculate the motion limits and transmission limits
 */
export const calculateLimits = (config: MechanismConfig): LimitAnalysis => {
    const { r1, r2, r3, r4, assemblyMode } = config;
    
    // --- Rocker Limits ---
    // Occur when Crank (r2) and Coupler (r3) are collinear.
    // Max Extension: distance O2->B = r2 + r3
    // Min Extension: distance O2->B = |r2 - r3|
    
    let rockerMin = 0;
    let rockerMax = 360;
    let hasRockerLimits = false;
    let stateMin: MechanismState | null = null;
    let stateMax: MechanismState | null = null;
    
    // Helper to solve for MechanismState at a specific Rocker-O2 distance (collinear condition)
    const calcLimitState = (distO2B: number): MechanismState | null => {
         // Find angle gamma at O4 inside triangle(r1, r4, distO2B)
         // distO2B^2 = r1^2 + r4^2 - 2*r1*r4*cos(gamma)
         const cosGamma = (r1*r1 + r4*r4 - distO2B*distO2B) / (2*r1*r4);
         
         // If unreachable
         if (Math.abs(cosGamma) > 1.0) return null; 
         
         const gamma = Math.acos(cosGamma);
         
         // Determine theta4.
         // Standard: t4 = PI - gamma (Angle at O4 relative to O4->O2 vector being 180)
         // O4 is at (r1, 0). O2 is at (0,0).
         // Vector O4->O2 is angle 180 (PI).
         // Gamma is internal angle of triangle.
         // If assemblyMode is 1 (Open), B is typically y>0, so t4 in [0, PI].
         // If assemblyMode is -1 (Crossed), B is typically y<0, so t4 in [PI, 2PI].
         
         let t4 = Math.PI - gamma;
         if (assemblyMode === -1) {
             t4 = Math.PI + gamma;
         }
         
         // Calculate Point B
         const O4 = {x: r1, y: 0};
         const B = {
             x: O4.x + r4 * Math.cos(t4),
             y: O4.y + r4 * Math.sin(t4)
         };
         
         // Calculate Point A
         // A, B, O2 are collinear.
         const isExtended = Math.abs(distO2B - (r2 + r3)) < 0.001;
         let scale = 0;
         
         if (isExtended) {
             scale = r2 / (r2 + r3);
         } else {
             // Folded: |r2 - r3|
             // Direction O2->A vs O2->B depends on magnitude
             if (r2 >= r3) scale = r2 / (r2 - r3);
             else scale = -r2 / (r3 - r2);
         }
         
         const A = { x: B.x * scale, y: B.y * scale };
         const t2 = Math.atan2(A.y, A.x);
         
         return {
             A, B, O2: {x:0, y:0}, O4,
             theta2: t2, theta3: 0, theta4: t4, transmissionAngle: 0, isValid: true
         };
    };
    
    const distExt = r2 + r3;
    const distRet = Math.abs(r2 - r3);
    
    const s1 = calcLimitState(distExt);
    const s2 = calcLimitState(distRet);
    
    if (s1 && s2) {
        hasRockerLimits = true;
        let ang1 = toDegrees(normalizeAngle(s1.theta4));
        let ang2 = toDegrees(normalizeAngle(s2.theta4));
        
        // Handle wrapping for min/max logic so we get the correct arc
        // e.g. 350 and 10. We want the range to be small.
        // But for generic min/max display, just values are enough.
        
        rockerMin = Math.min(ang1, ang2);
        rockerMax = Math.max(ang1, ang2);
        
        // For drawing, we want the state associated with the min/max numerical values if we were plotting,
        // but for visualizer, we just need the two endpoints.
        stateMin = ang1 < ang2 ? s1 : s2;
        stateMax = ang1 < ang2 ? s2 : s1;
    }
 
    // --- Transmission Angle Limits ---
    // The transmission angle mu depends on distance d = dist(A, O4).
    // Formula: cos(mu) = (r3^2 + r4^2 - d^2) / (2*r3*r4)
    // As d increases, cos(mu) decreases, so mu increases.
    // Thus: mu_min corresponds to d_min, mu_max corresponds to d_max.
    
    // Range of d is the intersection of:
    // 1. Range reachable by Input Crank: [ |r1 - r2|, r1 + r2 ]
    // 2. Range allowed by Coupler/Rocker: [ |r3 - r4|, r3 + r4 ]
    
    const inputMin = Math.abs(r1 - r2);
    const inputMax = r1 + r2;
    
    const outputMin = Math.abs(r3 - r4);
    const outputMax = r3 + r4;
    
    const dMin = Math.max(inputMin, outputMin);
    const dMax = Math.min(inputMax, outputMax);
    
    let transmissionMin = 0;
    let transmissionMax = 0;
    
    // Helper to calc mu from d
    const calcMu = (d: number) => {
        const val = (r3*r3 + r4*r4 - d*d) / (2*r3*r4);
        const clamped = Math.max(-1, Math.min(1, val));
        return toDegrees(Math.acos(clamped));
    };
    
    if (dMin <= dMax) {
        transmissionMin = calcMu(dMin);
        transmissionMax = calcMu(dMax);
    } else {
        // Impossible geometry
        transmissionMin = NaN;
        transmissionMax = NaN;
    }
 
    return {
        hasRockerLimits,
        rockerMin, rockerMax,
        transmissionMin, transmissionMax,
        limitStateMin: stateMin,
        limitStateMax: stateMax
    };
 };