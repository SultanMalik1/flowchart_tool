'use client';

import dynamic from 'next/dynamic';

const DiagramWorkspace = dynamic(
  () => import('@/components/canvas/canvas-workspace'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen w-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          <div className="text-lg text-black">Loading FlowPilot...</div>
        </div>
      </div>
    ),
  }
);

export default function CanvasPage() {
  return (
    <div className="h-screen w-screen">
      <DiagramWorkspace />
    </div>
  );
}
