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

  const B1: Point = {
    x: x2 + h * (O4.y - A.y) / dist_AO4,
    y: y2 - h * (O4.x - A.x) / dist_AO4
  };

  const B2: Point = {
    x: x2 - h * (O4.y - A.y) / dist_AO4,
    y: y2 + h * (O4.x - A.x) / dist_AO4
  };

  const B = assemblyMode === 1 ? B1 : B2;

  const theta3 = Math.atan2(B.y - A.y, B.x - A.x);
  const theta4 = Math.atan2(B.y - O4.y, B.x - O4.x);

  // Transmission Angle (mu): Angle between coupler (r3) and output (r4)
  // Calculated using Law of Cosines on triangle ABO4 with side AO4 as the opposite side to Angle B?
  // No, Angle at B in triangle ABO4 is the angle between AB and BO4.
  // The transmission angle mu is defined as the acute angle between coupler and rocker lines.
  // Standard formula using lengths:
  // AO4^2 = r3^2 + r4^2 - 2*r3*r4*cos(mu) -> if considering the interior angle.
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

  // Choose intersection A1 or A2.
  // For dragging, we usually return one valid solution.
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
    const { r1, r2, r3, r4 } = config;
    
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
         // Standard config places B above ground usually.
         // Theta4 relative to positive X at O4. Vector O4->O2 is 180 deg.
         // So Theta4 = PI - gamma.
         const t4 = Math.PI - gamma;
         
         // Calculate Point B
         const O4 = {x: r1, y: 0};
         const B = {
             x: O4.x + r4 * Math.cos(t4),
             y: O4.y + r4 * Math.sin(t4)
         };
         
         // Calculate Point A
         // A, B, O2 are collinear. A is dist r2 from O2.
         // If Extended (dist = r2 + r3), A is between O2 and B.
         // If Folded (dist = |r2 - r3|), position depends on r2 vs r3.
         // Vector O2->B
         const angleO2B = Math.atan2(B.y, B.x); // Angle of line
         
         // Determining A position along the line:
         // If extended: A is in direction of B.
         // If folded: 
         //    If r2 > r3, B is closer to O2 than A. A is in same dir.
         //    If r3 > r2, B is "behind" pivot relative to crank? No.
         //    Actually, calculating A as intersection of Circle(0, r2) and Line(0, B) is ambiguous (2 points).
         //    Correct Logic: 
         //    Folded: Vector(O2->A) and Vector(A->B) are opposite.
         //    Extended: Vector(O2->A) and Vector(A->B) are same direction.
         
         // For folded, we assume the mechanism hasn't flipped assembly mode in a weird way, 
         // but geometric limit is simply when they overlap.
         // If r3 > r2, and folded, A points towards B?
         // Example: r2=2, r3=5. Folded len = 3. O2(0), B(3). A(2)? |A-B| = 1 != 5.
         // Ah, |r2-r3|. If r3 > r2, then A and B are "opposed" relative to the pivot joint A?
         // No. Joint A connects r2 and r3.
         // Folded means angle between r2 and r3 is 180.
         // So O2->A is direction X. A->B is direction -X.
         // B = A - r3 * (A/|A|).
         // O2->B = O2->A + A->B = r2*u - r3*u = (r2-r3)*u.
         // Length is |r2-r3|. 
         // If r2 < r3, O2->B is -(r3-r2)u. Opposite direction to A.
         
         // So if r2 < r3, A and B are on opposite sides of O2? No. 
         // O2 is the origin.
         // If A is at (2,0). B is at (2-5, 0) = (-3, 0).
         // So Angle(B) = 180, Angle(A) = 0.
         // But we found B based on triangle O2-O4-B. B is fixed in space by r1, r4 intersection.
         // So A must be placed accordingly.
         
         // Let scale factor k such that A = k * B?
         // If r2 < r3 (B is -3, A is 2), then A = B * (2 / -3). Negative scale.
         // If r2 > r3 (B is 3, A is 5? No, r2=5, r3=2. B=3. A=5. A = B * 5/3).
         // Extended: r2=2, r3=5. B=7. A=2. A = B * 2/7.
         
         // Summary:
         // Extended (dist = r2+r3): A = B * (r2 / (r2+r3))
         // Folded (dist = |r2-r3|):
         //    If r2 >= r3: A = B * (r2 / (r2-r3))
         //    If r2 < r3:  A = B * (-r2 / (r3-r2))
         
         const isExtended = Math.abs(distO2B - (r2 + r3)) < 0.001;
         let scale = 0;
         
         if (isExtended) {
             scale = r2 / (r2 + r3);
         } else {
             // Folded
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
        const ang1 = toDegrees(s1.theta4);
        const ang2 = toDegrees(s2.theta4);
        rockerMin = Math.min(ang1, ang2);
        rockerMax = Math.max(ang1, ang2);
        stateMin = ang1 < ang2 ? s1 : s2;
        stateMax = ang1 < ang2 ? s2 : s1;
    }
 
    // --- Transmission Angle Limits ---
    // Occur when Crank (r2) and Ground (r1) are collinear.
    // 1. Extended Ground: theta2 = 0. A = (r2, 0). dist(A, O4) = |r1 - r2|
    // 2. Folded Ground: theta2 = 180. A = (-r2, 0). dist(A, O4) = r1 + r2
    
    const getTransAngle = (dA_O4: number) => {
        // Law of cosines on triangle A-B-O4:
        // dA_O4^2 = r3^2 + r4^2 - 2*r3*r4*cos(mu)
        // cos(mu) = (r3^2 + r4^2 - dA_O4^2) / (2*r3*r4)
        const val = (r3*r3 + r4*r4 - dA_O4*dA_O4) / (2*r3*r4);
        // If triangle cannot be formed, it means mechanism breaks at this point or physically impossible.
        // However, we clamp for robust display.
        const clamped = Math.max(-1, Math.min(1, val));
        return toDegrees(Math.acos(clamped));
    };
    
    const d1 = Math.abs(r1 - r2);
    const d2 = r1 + r2;
    
    // Check if these distances are reachable by r3+r4
    // Valid triangle condition for A-B-O4: |r3-r4| <= dA_O4 <= r3+r4
    // If not valid, it implies the mechanism cannot rotate fully to theta2=0 or 180.
    // In that case, the transmission limit is at the Rocker Limit (where mu = 0 or 180?)
    // Actually, if the mechanism is a Grashof Crank-Rocker, r2 can rotate fully.
    // If Non-Grashof, we might not reach theta2=0.
    // Let's assume valid geometry for the extrema if they are reachable.
    
    const tA = getTransAngle(d1);
    const tB = getTransAngle(d2);
    
    const transmissionMin = Math.min(tA, tB);
    const transmissionMax = Math.max(tA, tB);
 
    return {
        hasRockerLimits,
        rockerMin, rockerMax,
        transmissionMin, transmissionMax,
        limitStateMin: stateMin,
        limitStateMax: stateMax
    };
 };