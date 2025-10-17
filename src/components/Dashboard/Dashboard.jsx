import React, { useState, useEffect } from "react";
import "./Dashboard.css";
import PortalHeader from "../PortalCommonComponents/PortalHeader/PortalHeader";
import { Row, Col } from "antd";
import PortalSideBar from "../PortalCommonComponents/PortalSideBar/PortalSideBar";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { getComponentByRoute } from "../Navigation/navigationConfig";
import { connectSocket, disconnectSocket } from "../../utils/socket";
import { selectUserId } from "../../store/slices/authSlice";

const Dashboard = () => {
    const [isSidebarHovered, setIsSidebarHovered] = useState(false);
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);
    const userId = useSelector(selectUserId);

    // Initialize Socket connection
    useEffect(() => {
        if (userId) {
            connectSocket(userId);
        }

        return () => {
            disconnectSocket();
        };
    }, [userId]);

    const handleSidebarMouseEnter = () => {
        setIsSidebarHovered(true);
    };

    const handleSidebarMouseLeave = () => {
        setIsSidebarHovered(false);
    };

    // Get component for current route using Navigation config
    const CurrentComponent = getComponentByRoute(location.pathname);

    const sidebarSize = isSidebarHovered ? 4 : 2;
    const mainContentSize = isSidebarHovered ? 20 : 22;

    return (
        <div id="Dashboard" className="portal-container">
            <div className="PortalContainer h-100">
                <Row className="h-100">
                    <Col lg={sidebarSize} className="portal-column-transition">
                        <div
                            className="h-100"
                            onMouseEnter={handleSidebarMouseEnter}
                            onMouseLeave={handleSidebarMouseLeave}
                        >
                            <PortalSideBar />
                        </div>
                    </Col>
                    <Col lg={mainContentSize} className="portal-column-transition">
                        {/* <div className="h-100"> */}
                        <PortalHeader />
                        {/* </div> */}
                        <div className="PortalComponentsContainer">
                            {CurrentComponent ? (
                                <CurrentComponent />
                            ) : (
                                <div style={{
                                    padding: '24px',
                                    textAlign: 'center',
                                    color: 'var(--primary-text)',
                                    background: 'var(--primary-bg)',
                                    minHeight: 'calc(100vh - 120px)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <h2>Welcome to Bliss Portal</h2>
                                    <p>Select a menu item from the sidebar to get started.</p>
                                    <p>Current path: {location.pathname}</p>
                                </div>
                            )}
                        </div>
                    </Col>
                </Row>
            </div>
        </div>
    )
}

export default Dashboard;