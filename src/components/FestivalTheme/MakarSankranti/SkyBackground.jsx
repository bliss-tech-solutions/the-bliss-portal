import React from 'react';
import './makarSankranti.css';

const SkyBackground = ({ className = '' }) => {
    return (
        <svg
            className={`festival-sky-background ${className}`}
            width="100%"
            height="100%"
            viewBox="0 0 1920 1080"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
        >
            <defs>
                {/* Sky gradient - adapts to theme */}
                <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" className="sky-gradient-start" />
                    <stop offset="100%" className="sky-gradient-end" />
                </linearGradient>

                {/* Cloud pattern */}
                <filter id="cloudBlur">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                </filter>
            </defs>

            {/* Main sky gradient */}
            <rect width="1920" height="1080" fill="url(#skyGradient)" />

            {/* Decorative clouds */}
            <g className="festival-clouds" opacity="0.3">
                {/* Cloud 1 */}
                <ellipse cx="200" cy="150" rx="60" ry="30" className="cloud-shape" filter="url(#cloudBlur)">
                    <animateTransform
                        attributeName="transform"
                        type="translate"
                        from="0 0"
                        to="1920 0"
                        dur="120s"
                        repeatCount="indefinite"
                    />
                </ellipse>
                <ellipse cx="230" cy="160" rx="50" ry="25" className="cloud-shape" filter="url(#cloudBlur)">
                    <animateTransform
                        attributeName="transform"
                        type="translate"
                        from="0 0"
                        to="1920 0"
                        dur="120s"
                        repeatCount="indefinite"
                    />
                </ellipse>

                {/* Cloud 2 */}
                <ellipse cx="800" cy="200" rx="70" ry="35" className="cloud-shape" filter="url(#cloudBlur)">
                    <animateTransform
                        attributeName="transform"
                        type="translate"
                        from="0 0"
                        to="1920 0"
                        dur="100s"
                        repeatCount="indefinite"
                    />
                </ellipse>
                <ellipse cx="840" cy="210" rx="55" ry="28" className="cloud-shape" filter="url(#cloudBlur)">
                    <animateTransform
                        attributeName="transform"
                        type="translate"
                        from="0 0"
                        to="1920 0"
                        dur="100s"
                        repeatCount="indefinite"
                    />
                </ellipse>

                {/* Cloud 3 */}
                <ellipse cx="1400" cy="180" rx="65" ry="32" className="cloud-shape" filter="url(#cloudBlur)">
                    <animateTransform
                        attributeName="transform"
                        type="translate"
                        from="0 0"
                        to="1920 0"
                        dur="110s"
                        repeatCount="indefinite"
                    />
                </ellipse>
            </g>

            {/* Subtle sun rays */}
            <g className="festival-sun-rays" opacity="0.1">
                <path d="M 960 -100 L 800 1080" className="sun-beam" strokeWidth="2" />
                <path d="M 960 -100 L 900 1080" className="sun-beam" strokeWidth="2" />
                <path d="M 960 -100 L 1000 1080" className="sun-beam" strokeWidth="2" />
                <path d="M 960 -100 L 1100 1080" className="sun-beam" strokeWidth="2" />
            </g>
        </svg>
    );
};

export default SkyBackground;
