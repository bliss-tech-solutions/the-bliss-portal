import React from 'react';
import './makarSankranti.css';

const KiteIcon = ({
    size = 40,
    className = '',
    animate = true,
    delay = 0
}) => {
    const animationClass = animate ? 'festival-kite-float' : '';
    const style = {
        animationDelay: `${delay}s`
    };

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`festival-kite-icon ${animationClass} ${className}`}
            style={style}
        >
            {/* Kite Body - Diamond Shape */}
            <g className="kite-body">
                {/* Main kite diamond */}
                <path
                    d="M 50 10 L 75 50 L 50 75 L 25 50 Z"
                    className="kite-fill-primary"
                />

                {/* Decorative center cross */}
                <line x1="50" y1="10" x2="50" y2="75" className="kite-accent-line" />
                <line x1="25" y1="50" x2="75" y2="50" className="kite-accent-line" />

                {/* Small decorative dots */}
                <circle cx="37" cy="42" r="2" className="kite-fill-accent" />
                <circle cx="63" cy="42" r="2" className="kite-fill-accent" />
                <circle cx="50" cy="58" r="2" className="kite-fill-accent" />
            </g>

            {/* Kite String */}
            <g className="kite-string">
                <path
                    d="M 50 75 Q 52 85 48 95"
                    className="kite-string-path"
                />

                {/* Small tail ribbons */}
                <path d="M 48 85 L 43 87 L 45 83 Z" className="kite-fill-secondary" opacity="0.7" />
                <path d="M 50 90 L 45 92 L 47 88 Z" className="kite-fill-secondary" opacity="0.7" />
            </g>
        </svg>
    );
};

export default KiteIcon;
