import React, { useState, useEffect, useRef } from "react";
import "./Dashboard.css";
import PortalHeader from "../PortalCommonComponents/PortalHeader/PortalHeader";
import { Row, Col } from "antd";
import PortalSideBar from "../PortalCommonComponents/PortalSideBar/PortalSideBar";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { getComponentByRoute } from "../Navigation/navigationConfig";
import { connectSocket, disconnectSocket } from "../../utils/socket";
import { selectUserId } from "../../store/slices/authSlice";
import { useLoading } from "../../contexts/LoadingContext";
import { useGetAllUsersQuery } from "../../store/api";
import { ENABLE_MAKAR_SANKRANTI_THEME } from '../../config/festivalTheme';
import RopeDecoration from '../FestivalTheme/MakarSankranti/RopeDecoration';

const Dashboard = () => {
    const [isSidebarHovered, setIsSidebarHovered] = useState(false);
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);
    const userId = useSelector(selectUserId);
    const { isLoading: globalLoading, setLoading } = useLoading();
    const loaderStartTimeRef = useRef(null);
    const hideLoaderTimeoutRef = useRef(null);

    // Monitor critical API calls that happen on Dashboard load
    // This query is commonly used and can indicate if APIs are loading
    const { isLoading: isLoadingUsers } = useGetAllUsersQuery(undefined, {
        skip: !userId // Only fetch if user is logged in
    });

    // Track when loader was first shown
    useEffect(() => {
        if (globalLoading && !loaderStartTimeRef.current) {
            loaderStartTimeRef.current = Date.now();
        } else if (!globalLoading) {
            loaderStartTimeRef.current = null;
        }
    }, [globalLoading]);

    // Check RTK Query state for any pending queries
    const apiState = useSelector((state) => state.api);
    const queries = apiState?.queries || {};
    const mutations = apiState?.mutations || {};

    const hasPendingQueries = Object.keys(queries).some(
        key => queries[key]?.status === 'pending'
    ) || Object.keys(mutations).some(
        key => mutations[key]?.status === 'pending'
    );

    // Initialize Socket connection
    useEffect(() => {
        if (userId) {
            connectSocket(userId);
        }

        return () => {
            disconnectSocket();
        };
    }, [userId]);

    // Monitor API loading state - hide loader only when APIs complete
    useEffect(() => {
        // Clear any existing timeout
        if (hideLoaderTimeoutRef.current) {
            clearTimeout(hideLoaderTimeoutRef.current);
            hideLoaderTimeoutRef.current = null;
        }

        // Only manage loader if it was showing (from login)
        if (!globalLoading) return;

        // Check if any APIs are still loading
        const areApisLoading = isLoadingUsers || hasPendingQueries;

        if (!areApisLoading) {
            // APIs completed - ensure minimum display time to prevent logo/dashboard merging
            const minDisplayTime = 1200; // Minimum 1.2 seconds to prevent merging
            const elapsed = loaderStartTimeRef.current
                ? Date.now() - loaderStartTimeRef.current
                : 0;
            const remainingTime = Math.max(0, minDisplayTime - elapsed);

            // Hide loader after minimum display time
            hideLoaderTimeoutRef.current = setTimeout(() => {
                setLoading(false);
                loaderStartTimeRef.current = null;
                hideLoaderTimeoutRef.current = null;
            }, remainingTime + 400); // Extra 400ms for smooth fade-out transition

            return () => {
                if (hideLoaderTimeoutRef.current) {
                    clearTimeout(hideLoaderTimeoutRef.current);
                    hideLoaderTimeoutRef.current = null;
                }
            };
        }
        // If APIs are still loading, keep loader visible (don't hide)
    }, [globalLoading, isLoadingUsers, hasPendingQueries, setLoading]);

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
                <Row className="h-100" gutter={0}>
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
                            
                            {/* Makar Sankranti Bottom Rope Decoration */}
                            {ENABLE_MAKAR_SANKRANTI_THEME && (
                                <div className="festival-rope-decoration festival-rope-bottom">
                                    <RopeDecoration variant="bottom" height={100} />
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