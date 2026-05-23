import { FiCamera, FiX } from "react-icons/fi";

export const CameraCapture = ({ videoRef, canvasRef, stopCamera, handleCameraCapture }) => {
  return (
    <div className="relative mt-3 overflow-hidden rounded-xl border border-slate-200 bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-[300px] w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
        <button
          type="button"
          onClick={stopCamera}
          className="rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20"
        >
          <FiX className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleCameraCapture}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#1B3D8F] shadow-lg hover:scale-105 transition"
        >
          <FiCamera className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};
