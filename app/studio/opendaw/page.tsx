'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import OpenDAWIntegration, { useOpenDAWIntegration } from '@/components/OpenDAWIntegration';

const OpenDAWContent: React.FC = () => {
  const searchParams = useSearchParams();
  const roomId = searchParams?.get('roomId');
  const { isReady, error, handleReady, handleError } = useOpenDAWIntegration();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            OpenDAW Studio Integration
          </h1>
          <p className="text-gray-600">
            Digital Audio Workstation powered by OpenDAW, integrated seamlessly into your React app.
            {roomId && (
              <span className="block text-sm text-blue-600 mt-1">
                Loading room project: {roomId}
              </span>
            )}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Status Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Status</h2>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    error ? 'bg-red-500' : isReady ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className="text-sm">
                    {error ? 'Error' : isReady ? 'Ready' : 'Loading...'}
                  </span>
                </div>
                
                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}
                
                {isReady && (
                  <div className="text-green-600 text-sm bg-green-50 p-2 rounded">
                    OpenDAW is ready for use!
                  </div>
                )}
              </div>

              <div className="mt-6">
                <h3 className="font-medium mb-2">Instructions</h3>
                <ol className="text-sm text-gray-600 space-y-1">
                  <li>1. Ensure OpenDAW server is running</li>
                  <li>2. Use the DAW interface below</li>
                  <li>3. Create and edit audio projects</li>
                  <li>4. Export your work when done</li>
                </ol>
              </div>

              <div className="mt-6">
                <h3 className="font-medium mb-2">Quick Start</h3>
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  <p className="font-mono text-xs mb-2">Terminal Commands:</p>
                  <p className="font-mono text-xs">cd openDAW</p>
                  <p className="font-mono text-xs">npm run web</p>
                </div>
              </div>
            </div>
          </div>

          {/* OpenDAW Integration */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">DAW Interface</h2>
              
              <OpenDAWIntegration
                width="100%"
                height="700px"
                roomId={roomId || undefined}
                onReady={handleReady}
                onError={handleError}
                className="border-2 border-gray-200"
              />
            </div>
          </div>
        </div>

        {/* Additional Controls */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Integration Controls</h2>
          
          <div className="flex flex-wrap gap-4">
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={() => window.location.reload()}
            >
              Refresh Integration
            </button>
            
            <button 
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              onClick={() => {
                const newWindow = window.open('https://localhost:8080', '_blank');
                if (!newWindow) {
                  alert('Please allow popups to open OpenDAW in a new window');
                }
              }}
            >
              Open in New Window
            </button>
            
            <button 
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              onClick={() => {
                // Toggle fullscreen for the iframe
                const container = document.querySelector('.opendaw-container');
                if (container) {
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  } else {
                    container.requestFullscreen();
                  }
                }
              }}
            >
              Toggle Fullscreen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const OpenDAWPage: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading OpenDAW Studio...</p>
        </div>
      </div>
    }>
      <OpenDAWContent />
    </Suspense>
  );
};

export default OpenDAWPage;
