export default function AppLoading({ message = "Cargando aplicación..." }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#ffffff] text-[#1b3d8f]">
      <div className="flex flex-col items-center px-6 text-center">
        <div className="mb-14">
          <img src="/image.png" alt="CM Stock" className="w-[min(220px,52vw)] max-w-full select-none" />
        </div>
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#1a2f8a] [animation-delay:0ms]" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#1a2f8a] [animation-delay:180ms]" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#1a2f8a] [animation-delay:360ms]" />
        </div>
        <p className="mt-4 text-[10.5px] font-bold uppercase tracking-[0.35em] text-slate-400">{message}</p>
      </div>
    </div>
  );
}
