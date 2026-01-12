import React, { useState } from "react";
import "./PortalSideBar.css";
import { useSelector } from "react-redux";
import { selectCurrentLogo } from "../../../store/slices/themeSlice";
import Navigation from "../../Navigation/Navigation";
import { ENABLE_MAKAR_SANKRANTI_THEME } from '../../../config/festivalTheme';
import KiteIcon from '../../FestivalTheme/MakarSankranti/KiteIcon';
import StringPattern from '../../FestivalTheme/MakarSankranti/StringPattern';

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
            {/* Makar Sankranti Festival Decorations */}
            {ENABLE_MAKAR_SANKRANTI_THEME && (
                <>
                    <div className="festival-sidebar-decoration festival-sidebar-pattern festival-fade-in">
                        <StringPattern height={50} />
                    </div>
                    <div className="festival-sidebar-decoration festival-sidebar-kite festival-fade-in">
                        <KiteIcon size={32} animate={true} delay={0.3} />
                    </div>
                </>
            )}

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
