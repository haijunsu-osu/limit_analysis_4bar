import React, { useRef, useEffect, useState } from 'react';
import { MechanismConfig, MechanismState, LimitAnalysis } from '../types';
import { solveInverseTheta2 } from '../services/kinematics';

interface MechanismCanvasProps {
  config: MechanismConfig;
  state: MechanismState;
  limits: LimitAnalysis;
  onTheta2Change: (theta2: number) => void;
}

const MechanismCanvas: React.FC<MechanismCanvasProps> = ({ config, state, limits, onTheta2Change }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'A' | 'B' | null>(null);
  const [pan, setPan] = useState({ x: 100, y: 300 }); // Initial Offset
  const [zoom, setZoom] = useState(1);

  // Coordinate transformation helpers
  // SVG Screen coords -> Mechanism World Coords
  const toWorld = (sx: number, sy: number) => {
    return {
      x: (sx - pan.x) / zoom,
      y: (pan.y - sy) / zoom // Flip Y because SVG Y is down, standard kinematics Y is up
    };
  };

  // Mechanism World Coords -> SVG Screen Coords
  const toScreen = (wx: number, wy: number) => {
    return {
      x: wx * zoom + pan.x,
      y: pan.y - wy * zoom
    };
  };

  const handlePointerDown = (joint: 'A' | 'B') => (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(joint);
    e.stopPropagation();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    
    // Get mouse position in world coordinates relative to the specific ground pivots
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldPos = toWorld(mouseX, mouseY);

    if (dragging === 'A') {
      // Driving Crank: Calculate angle relative to O2 (0,0)
      const angle = Math.atan2(worldPos.y, worldPos.x);
      onTheta2Change(angle);
    } else if (dragging === 'B') {
      // Driving Rocker: Calculate angle relative to O4 (r1, 0)
      const angleT4 = Math.atan2(worldPos.y, worldPos.x - config.r1);
      
      // Inverse Kinematics to find corresponding theta2
      const newTheta2 = solveInverseTheta2(config, angleT4);
      if (newTheta2 !== null && !isNaN(newTheta2)) {
        onTheta2Change(newTheta2);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDragging(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Wheel Zoom/Pan
  const handleWheel = (e: React.WheelEvent) => {
      if (e.ctrlKey) {
          e.preventDefault();
          setZoom(z => Math.max(0.1, Math.min(5, z - e.deltaY * 0.001)));
      }
  };

  // Render Helpers
  const sO2 = toScreen(state.O2.x, state.O2.y);
  const sO4 = toScreen(state.O4.x, state.O4.y);
  const sA = toScreen(state.A.x, state.A.y);
  const sB = toScreen(state.B.x, state.B.y);

  // Render Limit Configuration Helper
  const renderGhostMechanism = (ghostState: MechanismState, color: string) => {
      const gA = toScreen(ghostState.A.x, ghostState.A.y);
      const gB = toScreen(ghostState.B.x, ghostState.B.y);
      return (
          <g opacity="0.3" stroke={color} strokeDasharray="5,5" fill="none" strokeWidth="2">
              <line x1={sO2.x} y1={sO2.y} x2={gA.x} y2={gA.y} />
              <line x1={gA.x} y1={gA.y} x2={gB.x} y2={gB.y} />
              <line x1={sO4.x} y1={sO4.y} x2={gB.x} y2={gB.y} strokeWidth="4" />
              <circle cx={gA.x} cy={gA.y} r="4" fill={color} stroke="none"/>
              <circle cx={gB.x} cy={gB.y} r="4" fill={color} stroke="none"/>
          </g>
      );
  };

  // Calculate Rocker Limit Arc
  let arcPath = "";
  if (limits.hasRockerLimits && limits.limitStateMin && limits.limitStateMax) {
      // Draw arc between B_min and B_max centered at O4
      const p1 = toScreen(limits.limitStateMin.B.x, limits.limitStateMin.B.y);
      const p2 = toScreen(limits.limitStateMax.B.x, limits.limitStateMax.B.y);
      const r = config.r4 * zoom;
      // Determine sweep flag. Usually the rocker moves in the upper area (smaller arc)
      // but geometry can be tricky. We just draw a simple path for now.
      arcPath = `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 0 ${p2.x} ${p2.y}`;
  }

  return (
    <div className="flex-1 bg-white relative overflow-hidden cursor-move touch-none">
      <svg
        ref={svgRef}
        className="w-full h-full block"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      >
        <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Legend / Axes */}
        <g opacity="0.2">
             <line x1={0} y1={pan.y} x2="100%" y2={pan.y} stroke="black" />
             <line x1={pan.x} y1={0} x2={pan.x} y2="100%" stroke="black" />
        </g>
        
        {/* Limit States (Ghosts) */}
        {limits.limitStateMin && renderGhostMechanism(limits.limitStateMin, "#9333ea")}
        {limits.limitStateMax && renderGhostMechanism(limits.limitStateMax, "#9333ea")}

        {/* Limit Arc */}
        {limits.hasRockerLimits && (
             <path d={arcPath} fill="none" stroke="#9333ea" strokeWidth="2" strokeDasharray="4 4" opacity="0.4" />
        )}

        {/* Links */}
        <g strokeLinecap="round" strokeLinejoin="round">
            {/* Ground (Fixed) */}
            <line x1={sO2.x} y1={sO2.y} x2={sO4.x} y2={sO4.y} stroke="#334155" strokeWidth="6" />
            <line x1={sO2.x} y1={sO2.y} x2={sO4.x} y2={sO4.y} stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5"/>
            
            {/* Crank (Input) */}
            <line x1={sO2.x} y1={sO2.y} x2={sA.x} y2={sA.y} stroke="#ef4444" strokeWidth="8" className="transition-all duration-75" />
            
            {/* Rocker (Output) */}
            <line x1={sO4.x} y1={sO4.y} x2={sB.x} y2={sB.y} stroke="#3b82f6" strokeWidth="8" className="transition-all duration-75" />
            
            {/* Coupler */}
            <line x1={sA.x} y1={sA.y} x2={sB.x} y2={sB.y} stroke="#22c55e" strokeWidth="8" className="transition-all duration-75" />
        </g>

        {/* Joints */}
        <g>
            {/* O2 Fixed */}
            <circle cx={sO2.x} cy={sO2.y} r="8" fill="white" stroke="#334155" strokeWidth="3" />
            <path d={`M ${sO2.x-10} ${sO2.y+10} L ${sO2.x+10} ${sO2.y+10} L ${sO2.x} ${sO2.y-5} Z`} fill="#cbd5e1" opacity="0.5" transform={`translate(0, 10)`} />

            {/* O4 Fixed */}
            <circle cx={sO4.x} cy={sO4.y} r="8" fill="white" stroke="#334155" strokeWidth="3" />
            <path d={`M ${sO4.x-10} ${sO4.y+10} L ${sO4.x+10} ${sO4.y+10} L ${sO4.x} ${sO4.y-5} Z`} fill="#cbd5e1" opacity="0.5" transform={`translate(0, 10)`} />

            {/* Joint A (Interactive) */}
            <g 
                onPointerDown={handlePointerDown('A')} 
                className="cursor-grab active:cursor-grabbing"
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
                <circle 
                    cx={sA.x} cy={sA.y} 
                    r={dragging === 'A' ? 14 : 10} 
                    fill="#ef4444" 
                    stroke="white" 
                    strokeWidth="3" 
                    className="transition-all duration-150 drop-shadow-md hover:r-12"
                />
            </g>

            {/* Joint B (Interactive) */}
            <g 
                onPointerDown={handlePointerDown('B')} 
                className="cursor-grab active:cursor-grabbing"
            >
                <circle 
                    cx={sB.x} cy={sB.y} 
                    r={dragging === 'B' ? 14 : 10} 
                    fill="#3b82f6" 
                    stroke="white" 
                    strokeWidth="3" 
                    className="transition-all duration-150 drop-shadow-md hover:r-12"
                />
                {/* Transmission Angle Arc Indicator */}
                {state.isValid && (
                    <text x={sB.x + 15} y={sB.y - 15} fontSize="12" fill="#64748b" fontWeight="bold">
                        B
                    </text>
                )}
            </g>
        </g>
        
        {/* Labels */}
        <text x={sO2.x - 20} y={sO2.y + 25} className="text-sm font-bold fill-gray-600">O₂</text>
        <text x={sO4.x - 20} y={sO4.y + 25} className="text-sm font-bold fill-gray-600">O₄</text>
        <text x={sA.x - 15} y={sA.y - 15} className="text-sm font-bold fill-red-600">A</text>

      </svg>
      
      {/* Overlay Instructions for Interaction */}
      <div className="absolute top-4 left-4 pointer-events-none opacity-50 text-xs text-gray-400 select-none">
        Drag joints to move • Scroll + Ctrl to Zoom • Purple = Limit Positions
      </div>
    </div>
  );
};

export default MechanismCanvas;