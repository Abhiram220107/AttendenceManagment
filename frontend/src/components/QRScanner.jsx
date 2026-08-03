import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, AlertCircle, RefreshCw } from 'lucide-react';

const QRScanner = ({ onScan, onClose }) => {
  const scannerId = 'ieee-qr-reader';
  const html5QrcodeRef = useRef(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Create new Html5Qrcode instance
    const html5Qrcode = new Html5Qrcode(scannerId);
    html5QrcodeRef.current = html5Qrcode;

    const startScanning = async () => {
      try {
        setIsScanning(true);
        setError('');
        
        await html5Qrcode.start(
          { facingMode: 'environment' }, // Default to back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            // Successfully scanned QR Code
            onScan(decodedText);
            stopScanning();
          },
          (errorMessage) => {
            // Silently swallow scanning errors (fires constantly when no QR is in frame)
          }
        );
      } catch (err) {
        setError('Unable to start QR camera. Please check camera permissions.');
        setIsScanning(false);
        console.error(err);
      }
    };

    // Delay start slightly to ensure DOM element is rendered
    const timer = setTimeout(() => {
      startScanning();
    }, 150);

    return () => {
      clearTimeout(timer);
      stopScanning();
    };
  }, []);

  const stopScanning = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  return (
    <div className="flex flex-col items-center bg-gray-50 p-6 border border-gray-200 rounded-xl max-w-sm w-full mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <QrCode className="h-5 w-5 text-ieee-blue animate-pulse" />
        <span className="text-sm font-bold text-gray-700">Align QR Code in Window</span>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-md border border-red-100">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Reader Element container */}
      <div 
        id={scannerId} 
        className="w-full aspect-square rounded-lg overflow-hidden border-2 border-slate-900 bg-slate-950 shadow-md"
      />

      <div className="mt-5 flex gap-2 w-full">
        <button
          onClick={onClose}
          className="flex-1 rounded-lg border border-gray-300 bg-white py-2 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
        >
          Cancel Scan
        </button>
      </div>

    </div>
  );
};

export default QRScanner;
