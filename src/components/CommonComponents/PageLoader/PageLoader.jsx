import React from 'react';
import { useSelector } from 'react-redux';
import { selectTheme } from '../../../store/slices/themeSlice';
import { useLoading } from '../../../contexts/LoadingContext';
import './PageLoader.css';

const PageLoader = () => {
    const { isLoading, loadingMessage } = useLoading();
    const theme = useSelector(selectTheme);

    if (!isLoading) return null;

    return (
        <div className={`page-loader-overlay theme-${theme}`}>
            <div className="page-loader-container">
                <div className="page-loader-logo-wrapper">
                    <img 
                        src={theme === 'dark' 
                            ? "https://the-bliss-solution.vercel.app/Images/BlissLogo/BlissWhiteLogo.png"
                            : "https://the-bliss-solution.vercel.app/Images/BlissLogo/BlissBlacklogo.png"
                        }
                        alt="Bliss Logo" 
                        className="page-loader-logo"
                        onError={(e) => {
                            // Fallback to local logo if external fails
                            e.target.src = theme === 'dark' 
                                ? "/Images/TheBlissLogo.png"
                                : "/Images/TheBlissLogo.png";
                        }}
                    />
                </div>
                {loadingMessage && (
                    <p className="page-loader-message">{loadingMessage}</p>
                )}
            </div>
        </div>
    );
};

export default PageLoader;

