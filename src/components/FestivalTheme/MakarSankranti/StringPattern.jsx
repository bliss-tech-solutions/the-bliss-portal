import React from 'react';
import './makarSankranti.css';

const StringPattern = ({
    width = '100%',
    height = 60,
    className = ''
}) => {
    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 200 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`festival-string-pattern ${className}`}
            preserveAspectRatio="none"
        >
            {/* Decorative wavy string pattern */}
            <path
                d="M 0 30 Q 25 10, 50 30 T 100 30 T 150 30 T 200 30"
                className="string-pattern-wave"
            />

            {/* Small decorative flags/triangles hanging from string */}
            <g className="pattern-flags">
                <path d="M 25 30 L 20 45 L 30 45 Z" className="pattern-flag" opacity="0.6" />
                <path d="M 75 30 L 70 45 L 80 45 Z" className="pattern-flag" opacity="0.6" />
                <path d="M 125 30 L 120 45 L 130 45 Z" className="pattern-flag" opacity="0.6" />
                <path d="M 175 30 L 170 45 L 180 45 Z" className="pattern-flag" opacity="0.6" />
            </g>
        </svg>
    );
};

export default StringPattern;
