import React, { useState, useEffect, useRef } from 'react';
import { MechanismConfig, MechanismState, GrashofType, LimitAnalysis } from './types';
import { solveFourBar, getGrashofType, calculateLimits } from './services/kinematics';
import ControlPanel from './components/ControlPanel';
import MechanismCanvas from './components/MechanismCanvas';
import InfoPanel from './components/InfoPanel';

const INITIAL_CONFIG: MechanismConfig = {
  r1: 300, // Ground
  r2: 100, // Crank
  r3: 300, // Coupler
  r4: 200, // Rocker
  assemblyMode: 1 // Default to Open
};

const App: React.FC = () => {
  const [config, setConfig] = useState<MechanismConfig>(INITIAL_CONFIG);
  const [theta2, setTheta2] = useState<number>(1.57); // Start at 90 deg approx
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  // Derived State
  const mechanismState: MechanismState = solveFourBar(config, theta2);
  const grashofType: GrashofType = getGrashofType(config);
  const limits: LimitAnalysis = calculateLimits(config);

  // Animation Loop
  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      // Rotate 1 radian per second * speed
      setTheta2(prev => (prev + deltaTime * speed) % (2 * Math.PI));
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      lastTimeRef.current = undefined;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, speed]);

  const handleConfigChange = (newConfig: MechanismConfig) => {
    setConfig(newConfig);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Controls */}
      <ControlPanel 
        config={config} 
        onChange={handleConfigChange}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        speed={speed}
        onSpeedChange={setSpeed}
      />

      {/* Main Content */}
      <div className="flex-1 relative flex flex-col">
        <MechanismCanvas 
            config={config} 
            state={mechanismState} 
            limits={limits}
            onTheta2Change={(val) => {
                setTheta2(val);
                setIsPlaying(false); // Stop animation if user drags
            }} 
        />
        
        <InfoPanel 
            state={mechanismState} 
            grashofType={grashofType} 
            limits={limits}
        />
      </div>
    </div>
  );
};

export default App;