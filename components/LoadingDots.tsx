
import React from 'react';

const LoadingDots: React.FC = () => {
  return (
    <div className="flex items-center justify-center space-x-1 py-2">
      <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500"></span>
      <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 animation-delay-200"></span>
      <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 animation-delay-400"></span>
    </div>
  );
};

export default LoadingDots;
