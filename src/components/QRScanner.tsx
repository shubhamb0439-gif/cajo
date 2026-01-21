import { useState, useRef, useEffect } from 'react';
import { X, Camera } from 'lucide-react';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  onClose: () => void;
  mode: 'offline' | 'online';
}

export default function QRScanner({ onScan, onClose, mode }: QRScannerProps) {
  const [manualInput, setManualInput] = useState('');
  const [useManual, setUseManual] = useState(false);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {mode === 'offline' ? 'Report Device Offline' : 'Confirm Device Online'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-6">
          {!useManual ? (
            <div className="space-y-4">
              <div className="aspect-square bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Camera className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    QR Scanner requires camera access
                  </p>
                  <p className="text-slate-500 dark:text-slate-500 text-xs mt-2">
                    Camera scanning not available in this demo
                  </p>
                </div>
              </div>

              <button
                onClick={() => setUseManual(true)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Enter QR Code Manually
              </button>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Device QR Code or Serial Number
                </label>
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Enter device identifier..."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setUseManual(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Back to Scanner
                </button>
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Continue
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
