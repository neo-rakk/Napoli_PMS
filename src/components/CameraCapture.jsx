import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Check, RotateCcw } from 'lucide-react';

export default function CameraCapture({ isOpen, onClose, onCapture, cameraType, title }) {
  const [stream, setStream] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const videoRef = useRef(null);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    stopCamera(); // Make sure any previous stream is stopped
    try {
      const constraints = {
        video: {
          facingMode: cameraType === 'user' ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      // alert("Impossible d'accéder à la caméra: " + err.message);
    }
  };

  useEffect(() => {
    if (isOpen && !photoPreview) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, photoPreview, cameraType]);

  const takePhoto = () => {
    if (videoRef.current && stream) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      
      // If using user (selfie) camera, we might want to mirror it on canvas if it was mirrored in CSS
      if (cameraType === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhotoPreview(dataUrl);
      stopCamera(); // IMPERATIVEMENT COUPER
    }
  };

  const handleRetake = () => {
    setPhotoPreview(null);
    // startCamera will be called by useEffect
  };

  const handleValidate = () => {
    onCapture(photoPreview);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-black/50 absolute top-0 left-0 right-0 z-10 shrink-0">
        <h3 className="font-bold text-lg">{title}</h3>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main View */}
      <div className="flex-1 bg-black flex flex-col justify-center items-center relative overflow-hidden">
        {photoPreview ? (
          <img 
            src={photoPreview} 
            alt="Preview" 
            className={`max-w-full max-h-full object-contain ${cameraType === 'user' ? 'scale-x-[-1]' : ''}`} 
          />
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className={`w-full h-full object-cover ${cameraType === 'user' ? 'scale-x-[-1]' : ''}`}
          />
        )}
      </div>

      {/* Controls */}
      <div className="p-6 pb-10 bg-black flex items-center justify-center gap-8 shrink-0 relative z-10 border-t border-white/10">
        {photoPreview ? (
          <>
            <button 
              onClick={handleRetake}
              className="flex flex-col items-center gap-2 p-4 text-white/70 hover:text-white transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <RotateCcw className="w-8 h-8" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest">Reprendre</span>
            </button>
            <button 
              onClick={handleValidate}
              className="flex flex-col items-center gap-2 p-4 text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-10 h-10 text-white" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest">Valider</span>
            </button>
          </>
        ) : (
          <button 
            onClick={takePhoto}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1">
              <div className="w-full h-full bg-white rounded-full active:scale-95 transition-transform" />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-white/50">Capturer</span>
          </button>
        )}
      </div>
    </div>
  );
}
