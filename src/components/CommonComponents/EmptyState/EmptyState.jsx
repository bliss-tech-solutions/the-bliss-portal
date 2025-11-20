import React from 'react';
import './EmptyState.css';

const EmptyState = ({
    image,
    title,
    description,
    className = '',
    imageAlt = 'No data available',
    imageClassName = ''
}) => {
    return (
        <div className={`empty-state-container ${className}`}>
            <div className="empty-state-content">
                {image && (
                    <div className="empty-state-image-wrapper">
                        <img
                            src={image}
                            alt={imageAlt}
                            className={`empty-state-image ${imageClassName}`}
                        />
                    </div>
                )}
                {title && (
                    <h3 className="empty-state-title">{title}</h3>
                )}
                {description && (
                    <p className="empty-state-description">{description}</p>
                )}
            </div>
        </div>
    );
};

export default EmptyState;

