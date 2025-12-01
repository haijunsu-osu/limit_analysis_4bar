import React from 'react';
import { MechanismState, GrashofType, LimitAnalysis } from '../types';
import { toDegrees } from '../services/kinematics';

interface InfoPanelProps {
  state: MechanismState;
  grashofType: GrashofType;
  limits: LimitAnalysis;
}

const DataCard: React.FC<{ label: string; value: string | number; unit?: string; alert?: boolean; good?: boolean; subtext?: string }> = ({ 
  label, value, unit, alert, good, subtext
}) => (
  <div className={`p-3 rounded-lg border ${
    alert ? 'bg-red-50 border-red-200' : good ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'
  } shadow-sm`}>
    <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">{label}</div>
    <div className={`text-xl font-mono font-bold ${
      alert ? 'text-red-600' : good ? 'text-green-600' : 'text-gray-800'
    }`}>
      {value}<span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
    </div>
    {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
  </div>
);

const InfoPanel: React.FC<InfoPanelProps> = ({ state, grashofType, limits }) => {
  const transAngleDeg = toDegrees(state.transmissionAngle);
  // Ideally between 40 and 140 degrees (generalized rule of thumb)
  const isTransBad = transAngleDeg < 30 || transAngleDeg > 150;
  const isTransOptimal = transAngleDeg > 80 && transAngleDeg < 100;

  return (
    <div className="absolute bottom-6 right-6 flex flex-col gap-4 pointer-events-none max-w-xs w-full z-20">
        {/* Grashof Type Badge */}
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-200 pointer-events-auto">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Mechanism Type</h3>
            <div className={`text-lg font-bold ${
                grashofType === GrashofType.INVALID ? 'text-red-500' : 'text-indigo-600'
            }`}>
                {grashofType}
            </div>
             {!state.isValid && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                    ⚠️ Invalid Configuration
                </div>
            )}
        </div>

        {/* Stats Grid */}
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-200 pointer-events-auto grid grid-cols-2 gap-3 max-h-80 overflow-y-auto custom-scrollbar">
             <DataCard 
                label="θ2 (Input)" 
                value={toDegrees(state.theta2).toFixed(1)} 
                unit="°" 
            />
            <DataCard 
                label="θ4 (Output)" 
                value={toDegrees(state.theta4).toFixed(1)} 
                unit="°" 
            />
            
            <DataCard 
                label="Transm. Angle (μ)" 
                value={transAngleDeg.toFixed(1)} 
                unit="°"
                alert={isTransBad}
                good={isTransOptimal}
            />
             <DataCard 
                label="θ3 (Coupler)" 
                value={toDegrees(state.theta3).toFixed(1)} 
                unit="°" 
            />

            {/* Limit Analysis Section */}
            <div className="col-span-2 mt-2 pt-3 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Limit Analysis</h4>
            </div>

            {limits.hasRockerLimits ? (
                <>
                    <DataCard 
                        label="Rocker Min" 
                        value={limits.rockerMin.toFixed(1)} 
                        unit="°" 
                    />
                    <DataCard 
                        label="Rocker Max" 
                        value={limits.rockerMax.toFixed(1)} 
                        unit="°" 
                    />
                </>
            ) : (
                <div className="col-span-2 text-xs text-gray-400 italic text-center py-2">
                    Rocker rotates fully (No limits)
                </div>
            )}

            <DataCard 
                label="μ Min" 
                value={limits.transmissionMin.toFixed(1)} 
                unit="°" 
                subtext="Worst Case"
            />
            <DataCard 
                label="μ Max" 
                value={limits.transmissionMax.toFixed(1)} 
                unit="°" 
                subtext="Best Case"
            />
        </div>
    </div>
  );
};

export default InfoPanel;