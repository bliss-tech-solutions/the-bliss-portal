import React from 'react';
import './makarSankranti.css';

const RopeDecoration = ({
    width = '100%',
    height = 100,
    className = '',
    variant = 'top' // 'top' or 'bottom'
}) => {
    const isTop = variant === 'top';

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 1920 ${height}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`festival-rope-decoration ${className}`}
            preserveAspectRatio="none"
        >
            <defs>
                {/* Rope gradient for depth */}
                <linearGradient id={`ropeGradient-${variant}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" className="rope-gradient-light" />
                    <stop offset="100%" className="rope-gradient-dark" />
                </linearGradient>
            </defs>

            {/* Main decorative rope with wave */}
            <g className="rope-main">
                <path
                    d={isTop
                        ? "M 0 30 Q 240 10, 480 30 T 960 30 T 1440 30 T 1920 30"
                        : "M 0 70 Q 240 90, 480 70 T 960 70 T 1440 70 T 1920 70"
                    }
                    className="rope-path"
                    strokeWidth="3"
                    fill="none"
                >
                    <animate
                        attributeName="d"
                        dur="8s"
                        repeatCount="indefinite"
                        values={isTop
                            ? "M 0 30 Q 240 10, 480 30 T 960 30 T 1440 30 T 1920 30;M 0 30 Q 240 50, 480 30 T 960 30 T 1440 30 T 1920 30;M 0 30 Q 240 10, 480 30 T 960 30 T 1440 30 T 1920 30"
                            : "M 0 70 Q 240 90, 480 70 T 960 70 T 1440 70 T 1920 70;M 0 70 Q 240 50, 480 70 T 960 70 T 1440 70 T 1920 70;M 0 70 Q 240 90, 480 70 T 960 70 T 1440 70 T 1920 70"
                        }
                    />
                </path>

                {/* Secondary thinner rope for depth */}
                <path
                    d={isTop
                        ? "M 0 35 Q 240 15, 480 35 T 960 35 T 1440 35 T 1920 35"
                        : "M 0 65 Q 240 85, 480 65 T 960 65 T 1440 65 T 1920 65"
                    }
                    className="rope-path-secondary"
                    strokeWidth="1.5"
                    fill="none"
                    opacity="0.5"
                >
                    <animate
                        attributeName="d"
                        dur="8s"
                        repeatCount="indefinite"
                        values={isTop
                            ? "M 0 35 Q 240 15, 480 35 T 960 35 T 1440 35 T 1920 35;M 0 35 Q 240 55, 480 35 T 960 35 T 1440 35 T 1920 35;M 0 35 Q 240 15, 480 35 T 960 35 T 1440 35 T 1920 35"
                            : "M 0 65 Q 240 85, 480 65 T 960 65 T 1440 65 T 1920 65;M 0 65 Q 240 45, 480 65 T 960 65 T 1440 65 T 1920 65;M 0 65 Q 240 85, 480 65 T 960 65 T 1440 65 T 1920 65"
                        }
                    />
                </path>
            </g>

            {/* Hanging decorative elements (small kites/flags) */}
            <g className="rope-hanging-items">
                {[...Array(10)].map((_, i) => {
                    const x = 100 + i * 180;
                    const baseY = isTop ? 30 : 70;
                    const stringLength = 25 + (i % 3) * 8;

                    return (
                        <g key={i}>
                            {/* Hanging string */}
                            <line
                                x1={x}
                                y1={baseY}
                                x2={x}
                                y2={baseY + stringLength}
                                className="hanging-string"
                                strokeWidth="1"
                                opacity="0.6"
                            />

                            {/* Small decorative triangle (mini kite) */}
                            <path
                                d={`M ${x} ${baseY + stringLength} L ${x - 6} ${baseY + stringLength + 10} L ${x + 6} ${baseY + stringLength + 10} Z`}
                                className="hanging-flag"
                                opacity="0.7"
                            >
                                <animateTransform
                                    attributeName="transform"
                                    type="rotate"
                                    from={`0 ${x} ${baseY + stringLength}`}
                                    to={`360 ${x} ${baseY + stringLength}`}
                                    dur={`${10 + i * 2}s`}
                                    repeatCount="indefinite"
                                />
                            </path>
                        </g>
                    );
                })}
            </g>
        </svg>
    );
};

export default RopeDecoration;
