import React from 'react';
import './makarSankranti.css';

const SunIcon = ({
    size = 35,
    className = '',
    animate = true
}) => {
    const animationClass = animate ? 'festival-sun-pulse' : '';

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`festival-sun-icon ${animationClass} ${className}`}
        >
            {/* Sun center */}
            <circle
                cx="50"
                cy="50"
                r="20"
                className="sun-center"
            />

            {/* Sun rays */}
            <g className="sun-rays">
                {/* Top */}
                <path d="M 50 5 L 50 25" className="sun-ray" />
                {/* Top-right */}
                <path d="M 73 15 L 62 26" className="sun-ray" />
                {/* Right */}
                <path d="M 95 50 L 75 50" className="sun-ray" />
                {/* Bottom-right */}
                <path d="M 85 85 L 64 64" className="sun-ray" />
                {/* Bottom */}
                <path d="M 50 95 L 50 75" className="sun-ray" />
                {/* Bottom-left */}
                <path d="M 15 85 L 36 64" className="sun-ray" />
                {/* Left */}
                <path d="M 5 50 L 25 50" className="sun-ray" />
                {/* Top-left */}
                <path d="M 27 15 L 38 26" className="sun-ray" />
            </g>

            {/* Inner decorative circle */}
            <circle
                cx="50"
                cy="50"
                r="12"
                className="sun-inner"
                opacity="0.3"
            />
        </svg>
    );
};

export default SunIcon;
