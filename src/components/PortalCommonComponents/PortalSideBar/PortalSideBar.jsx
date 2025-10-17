import React, { useState } from "react";
import "./PortalSideBar.css";
import { useSelector } from "react-redux";
import { selectCurrentLogo } from "../../../store/slices/themeSlice";
import Navigation from "../../Navigation/Navigation";

const PortalSideBar = () => {
    const currentLogo = useSelector(selectCurrentLogo);
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseEnter = () => {
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    return (
        <div 
            id="PortalSideBar" 
            className={`portal-sidebar ${isHovered ? 'expanded' : 'collapsed'}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="PortalBrandLogoContainer">
                <div className="PortalLogoContainer">
                    <img src={currentLogo} alt="Bliss Portal Logo" />
                </div>
            </div>

            {/* Navigation Menu */}
            <div className="PortalNavigationContainer">
                <Navigation isCollapsed={!isHovered} />
            </div>
        </div>
    )
}

export default PortalSideBar;
