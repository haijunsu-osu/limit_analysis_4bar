export interface Point {
  x: number;
  y: number;
}

export interface MechanismConfig {
  r1: number; // Ground (d)
  r2: number; // Crank (a)
  r3: number; // Coupler (b)
  r4: number; // Rocker (c)
  assemblyMode: 1 | -1; // 1 for open, -1 for crossed (usually)
}

export interface MechanismState {
  A: Point; // Joint between Crank and Coupler
  B: Point; // Joint between Coupler and Rocker
  O2: Point; // Ground pivot 1 (0,0)
  O4: Point; // Ground pivot 2 (r1, 0)
  theta2: number; // Input angle (rad)
  theta3: number; // Coupler angle (rad)
  theta4: number; // Output angle (rad)
  transmissionAngle: number; // Angle between coupler and rocker (rad)
  isValid: boolean; // Is the mechanism assembled?
}

export enum GrashofType {
  CRANK_ROCKER = "Crank-Rocker",
  DOUBLE_CRANK = "Double-Crank (Drag-Link)",
  DOUBLE_ROCKER = "Double-Rocker",
  CHANGE_POINT = "Change-Point",
  TRIPLE_ROCKER = "Triple-Rocker (Non-Grashof)",
  INVALID = "Invalid Geometry"
}

export interface LimitAnalysis {
  hasRockerLimits: boolean;
  rockerMin: number; // degrees
  rockerMax: number; // degrees
  transmissionMin: number; // degrees
  transmissionMax: number; // degrees
  limitStateMin: MechanismState | null; // Configuration at Rocker Limit 1
  limitStateMax: MechanismState | null; // Configuration at Rocker Limit 2
}