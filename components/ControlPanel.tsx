import React from 'react';
import { MechanismConfig } from '../types';

interface ControlPanelProps {
  config: MechanismConfig;
  onChange: (newConfig: MechanismConfig) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

const SliderRaw: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  color?: string;
}> = ({ label, value, min, max, onChange, color = "accent-blue-600" }) => (
  <div className="mb-4">
    <div className="flex justify-between items-center mb-1">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{value.toFixed(1)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={0.5}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${color}`}
    />
  </div>
);

// Memoize the slider to prevent re-renders of the whole panel on unrelated updates if needed
const Slider = React.memo(SliderRaw);

const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onChange,
  isPlaying,
  onTogglePlay,
  speed,
  onSpeedChange
}) => {
  const updateConfig = (key: keyof MechanismConfig, value: number) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="w-full md:w-80 bg-white border-r border-gray-200 p-6 flex flex-col h-full overflow-y-auto custom-scrollbar shadow-lg z-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span className="text-blue-600">Kinema</span>
        <span className="text-sm font-normal text-gray-400 mt-1">v1.0</span>
      </h1>

      <div className="mb-8">
        <h2 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-4">Link Lengths</h2>
        
        <Slider
          label="Ground (r1)"
          value={config.r1}
          min={50}
          max={600}
          onChange={(v) => updateConfig('r1', v)}
          color="accent-gray-600"
        />
        <Slider
          label="Crank (r2)"
          value={config.r2}
          min={10}
          max={300}
          onChange={(v) => updateConfig('r2', v)}
          color="accent-red-500"
        />
        <Slider
          label="Coupler (r3)"
          value={config.r3}
          min={10}
          max={500}
          onChange={(v) => updateConfig('r3', v)}
          color="accent-green-500"
        />
        <Slider
          label="Rocker (r4)"
          value={config.r4}
          min={10}
          max={500}
          onChange={(v) => updateConfig('r4', v)}
          color="accent-blue-500"
        />
      </div>

      <div className="mb-8">
        <h2 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-4">Simulation</h2>
        
        <div className="flex gap-2 mb-4">
          <button
            onClick={onTogglePlay}
            className={`flex-1 py-2 px-4 rounded font-semibold transition-all ${
              isPlaying 
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
            }`}
          >
            {isPlaying ? 'Pause' : 'Play Animation'}
          </button>
        </div>

        <Slider
          label={`Speed (${speed.toFixed(1)}x)`}
          value={speed}
          min={0.1}
          max={5.0}
          onChange={onSpeedChange}
        />
        
        <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-700 font-medium">Assembly Mode</span>
            <button 
                onClick={() => updateConfig('assemblyMode', config.assemblyMode * -1 as 1 | -1)}
                className="text-xs bg-gray-100 border border-gray-300 px-3 py-1 rounded hover:bg-gray-200"
            >
                {config.assemblyMode === 1 ? 'Open (+)' : 'Crossed (-)'}
            </button>
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Drag the <strong className="text-red-500">Red</strong> joint to drive the crank, or the <strong className="text-blue-500">Blue</strong> joint to drive the rocker.
        </p>
      </div>
    </div>
  );
};

export default ControlPanel;