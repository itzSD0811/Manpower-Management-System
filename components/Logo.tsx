import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "h-12" }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* DNS Brand Identity */}
      <svg viewBox="0 0 200 100" className="h-full w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
         {/* Dot Element */}
         <circle cx="60" cy="25" r="10" fill="#CD2027" />
         
         {/* Swoosh Element */}
         <path 
            d="M 80 20 C 180 0, 180 100, 70 95" 
            stroke="#CD2027" 
            strokeWidth="8" 
            strokeLinecap="round"
            fill="none"
         />
         
         {/* Typography */}
         <text x="10" y="80" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="70" fill="currentColor">
            DNS
         </text>
      </svg>
    </div>
  );
};