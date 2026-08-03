import React, { useRef, useState, useEffect } from 'react';
import { Camera, Check, RotateCw, AlertCircle, RefreshCw } from 'lucide-react';

const CameraCapture = ({ onCapture, label }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [error, setError] = useState('');

  // Get list of available video input devices on mount
  useEffect(() => {
    const getDevices = async () => {
      try {
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = mediaDevices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          // Default to the back camera if available (usually contains "back" or index > 0)
          const backCam = videoDevices.find(d => d.label.toLowerCase().includes('back'));
          setSelectedDevice(backCam ? backCam.deviceId : videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Error fetching camera devices:', err);
      }
    };
    getDevices();
  }, []);

  const startCamera = async () => {
    setError('');
    setCapturedImage(null);
    
    // Stop any existing stream
    stopCamera();

    const constraints = {
      video: selectedDevice ? { deviceId: { exact: selectedDevice } } : { facingMode: 'user' }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      setError('Could not access camera. Please check permissions.');
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const context = canvas.getContext('2d');
    // Draw mirrored if facing user (usually default device label checking)
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const base64 = canvas.toDataURL('image/jpeg', 0.85); // Capture as JPEG with good compression
    setCapturedImage(base64);
    onCapture(base64);
    stopCamera();
  };

  const handleDeviceChange = (e) => {
    setSelectedDevice(e.target.value);
    if (cameraActive) {
      // Restart camera with new device
      setTimeout(() => startCamera(), 100);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="flex flex-col items-center bg-gray-50 p-4 border border-gray-200 rounded-xl">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">{label}</span>
      
      {error && (
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Camera Viewport / Preview */}
      <div className="relative w-full aspect-3/4 rounded-lg overflow-hidden border border-gray-200 bg-slate-900 flex items-center justify-center">
        {cameraActive && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
        
        {capturedImage && !cameraActive && (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        )}

        {!cameraActive && !capturedImage && (
          <div className="text-center p-4">
            <Camera className="h-10 w-10 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Camera is offline</p>
          </div>
        )}
      </div>

      {/* Select Camera input dropdown */}
      {cameraActive && devices.length > 1 && (
        <div className="w-full mt-3">
          <select
            value={selectedDevice}
            onChange={handleDeviceChange}
            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 px-2.5 text-xs focus:outline-none"
          >
            {devices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${devices.indexOf(device) + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Control Buttons */}
      <div className="mt-4 flex gap-2 w-full">
        {!cameraActive && !capturedImage && (
          <button
            type="button"
            onClick={startCamera}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-ieee-blue py-2 px-3 text-xs font-bold text-white hover:bg-ieee-dark transition cursor-pointer"
          >
            <Camera className="h-3.5 w-3.5" /> Start Camera
          </button>
        )}

        {cameraActive && (
          <>
            <button
              type="button"
              onClick={stopCamera}
              className="flex-1 rounded-lg border border-gray-300 bg-white py-2 px-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={capturePhoto}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 px-3 text-xs font-bold text-white hover:bg-green-700 transition cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" /> Capture Frame
            </button>
          </>
        )}

        {capturedImage && !cameraActive && (
          <button
            type="button"
            onClick={startCamera}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retake Photo
          </button>
        )}
      </div>

    </div>
  );
};

export default CameraCapture;
