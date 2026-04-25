import React, { useEffect, useCallback } from 'react';

export function PinPad({ pin, setPin, onComplete, disabled = false }) {
  const maxDigits = 6;

  const handlePress = useCallback((val) => {
    if (disabled) return;
    if (val === 'backspace') {
      setPin(prev => prev.slice(0, -1));
    } else if (pin.length < maxDigits) {
      const newPin = pin + val;
      setPin(newPin);
      if (newPin.length === maxDigits) {
        onComplete(newPin);
      }
    }
  }, [pin, setPin, disabled, onComplete, maxDigits]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (disabled) return;
      if (e.key >= '0' && e.key <= '9') {
        handlePress(e.key);
      } else if (e.key === 'Backspace') {
        handlePress('backspace');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePress, disabled]);

  const nums = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3']
  ];

  return (
    <div className="w-full max-w-[280px] mx-auto">
      {/* PIN dots */}
      <div className="flex justify-center gap-3 mb-8">
        {Array.from({ length: maxDigits }).map((_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full border-2 transition-colors duration-200 ${
              i < pin.length ? 'bg-emerald-600 border-emerald-600' : 'bg-transparent border-slate-300'
            }`}
          />
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {nums.map((row, i) => (
          <React.Fragment key={i}>
            {row.map(num => (
              <button
                key={num}
                disabled={disabled}
                onClick={() => handlePress(num)}
                className="h-16 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-2xl font-medium flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {num}
              </button>
            ))}
          </React.Fragment>
        ))}
        {/* Bottom row */}
        <div className="h-16" /> {/* Empty spot */}
        <button
          disabled={disabled}
          onClick={() => handlePress('0')}
          className="h-16 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-2xl font-medium flex items-center justify-center transition-colors disabled:opacity-50"
        >
          0
        </button>
        <button
          disabled={disabled}
          onClick={() => handlePress('backspace')}
          className="h-16 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xl font-medium flex items-center justify-center transition-colors disabled:opacity-50"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
