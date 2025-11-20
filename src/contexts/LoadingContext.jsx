import React, { createContext, useContext, useState, useRef } from 'react';

const LoadingContext = createContext({
    isLoading: false,
    setLoading: () => {},
    loadingMessage: '',
    setLoadingMessage: () => {}
});

export const LoadingProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const loadingTimeoutRef = useRef(null);

    const setLoading = (loading) => {
        // Clear any existing timeout
        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
        }

        if (loading) {
            setIsLoading(true);
        } else {
            // Small delay before hiding to prevent flashing
            loadingTimeoutRef.current = setTimeout(() => {
                setIsLoading(false);
                setLoadingMessage('');
                loadingTimeoutRef.current = null;
            }, 200);
        }
    };

    return (
        <LoadingContext.Provider value={{ isLoading, setLoading, loadingMessage, setLoadingMessage }}>
            {children}
        </LoadingContext.Provider>
    );
};

export const useLoading = () => {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};

