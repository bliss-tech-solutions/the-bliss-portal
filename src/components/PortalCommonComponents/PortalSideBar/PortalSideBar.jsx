import React from "react";
import "./PortalSideBar.css";
import { useSelector } from "react-redux";
import { selectCurrentLogo } from "../../../store/slices/themeSlice";
import Navigation from "../../Navigation/Navigation";

const PortalSideBar = () => {
    const currentLogo = useSelector(selectCurrentLogo);

    return (
        <div id="PortalSideBar" className="portal-sidebar">
            <div className="PortalBrandLogoContainer">
                <div className="PortalLogoContainer">
                    <img src={currentLogo} alt="Bliss Portal Logo" />
                </div>
            </div>

            {/* Navigation Menu */}
            <div className="PortalNavigationContainer">
                <Navigation />
            </div>
        </div>
    )
}

export default PortalSideBar;
