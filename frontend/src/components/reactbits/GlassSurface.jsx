import React from 'react';
import '../../styles/mosaic.css';

const GlassSurface = ({ children, width, height, borderRadius = 18, className = '', ...props }) => {
  return (
    <div
      className={`glass-surface ${className}`}
      style={{
        width,
        height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassSurface;
