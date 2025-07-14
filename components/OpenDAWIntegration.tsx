import React, { useRef, useEffect, useState } from 'react';

interface OpenDAWIntegrationProps {
  /** Width of the iframe */
  width?: string | number;
  /** Height of the iframe */
  height?: string | number;
  /** Whether to show loading indicator */
  showLoading?: boolean;
  /** Custom styles for the iframe container */
  className?: string;
  /** Callback when openDAW is ready */
  onReady?: () => void;
  /** Callback when openDAW encounters an error */
  onError?: (error: string) => void;
}

const OpenDAWIntegration: React.FC<OpenDAWIntegrationProps> = ({
  width = '100%',
  height = '600px',
  showLoading = true,
  className = '',
  onReady,
  onError
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDAWUrl, setOpenDAWUrl] = useState<string | null>(null);

  useEffect(() => {
    // Start the openDAW development server
    const startOpenDAW = async () => {
      try {
        // Check if openDAW server is already running
        const response = await fetch('https://localhost:8080', { 
          mode: 'no-cors',
          method: 'HEAD'
        });
        
        setOpenDAWUrl('https://localhost:8080');
      } catch (err) {
        // Server not running, we'll need to start it
        console.log('OpenDAW server not running. Please start it manually.');
        setError('OpenDAW server is not running. Please run: npm run opendaw:start');
        if (onError) {
          onError('OpenDAW server is not running');
        }
      }
    };

    startOpenDAW();
  }, [onError]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    if (onReady) {
      onReady();
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    const errorMsg = 'Failed to load OpenDAW';
    setError(errorMsg);
    if (onError) {
      onError(errorMsg);
    }
  };

  // Function to communicate with the iframe
  const sendMessageToOpenDAW = (message: any) => {
    if (iframeRef.current && openDAWUrl) {
      iframeRef.current.contentWindow?.postMessage(message, openDAWUrl);
    }
  };

  // Listen for messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin === 'https://localhost:8080') {
        // Handle messages from openDAW
        console.log('Message from OpenDAW:', event.data);
        
        // You can add specific message handlers here
        switch (event.data.type) {
          case 'opendaw-ready':
            console.log('OpenDAW is ready');
            break;
          case 'opendaw-error':
            console.error('OpenDAW error:', event.data.error);
            break;
          // Add more message types as needed
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (error) {
    return (
      <div className={`opendaw-error ${className}`} style={{ width, height }}>
        <div className="error-content">
          <h3>OpenDAW Error</h3>
          <p>{error}</p>
          <div className="error-instructions">
            <p>To start OpenDAW:</p>
            <ol>
              <li>Open a terminal</li>
              <li>Navigate to the openDAW directory</li>
              <li>Run: <code>npm run web</code></li>
              <li>Refresh this page</li>
            </ol>
          </div>
        </div>
        <style jsx>{`
          .opendaw-error {
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px dashed #ccc;
            border-radius: 8px;
            background-color: #f9f9f9;
          }
          .error-content {
            text-align: center;
            padding: 20px;
          }
          .error-instructions {
            margin-top: 16px;
            text-align: left;
            background: #f0f0f0;
            padding: 12px;
            border-radius: 4px;
          }
          .error-instructions code {
            background: #e0e0e0;
            padding: 2px 4px;
            border-radius: 2px;
            font-family: monospace;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`opendaw-container ${className}`} style={{ width, height, position: 'relative' }}>
      {isLoading && showLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading OpenDAW...</div>
        </div>
      )}
      
      {openDAWUrl && (
        <iframe
          ref={iframeRef}
          src={openDAWUrl}
          width="100%"
          height="100%"
          style={{
            border: 'none',
            borderRadius: '8px',
            display: isLoading ? 'none' : 'block'
          }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          allow="microphone; midi; camera; display-capture"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
        />
      )}

      <style jsx>{`
        .opendaw-container {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          background: white;
        }
        
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.9);
          z-index: 10;
        }
        
        .loading-spinner {
          padding: 20px;
          font-size: 16px;
          color: #666;
        }
        
        .loading-spinner::after {
          content: '';
          display: inline-block;
          width: 20px;
          height: 20px;
          margin-left: 10px;
          border: 2px solid #ccc;
          border-top: 2px solid #333;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default OpenDAWIntegration;

// Hook for easier integration
export const useOpenDAWIntegration = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReady = () => setIsReady(true);
  const handleError = (errorMsg: string) => setError(errorMsg);

  return {
    isReady,
    error,
    handleReady,
    handleError,
    clearError: () => setError(null)
  };
};
