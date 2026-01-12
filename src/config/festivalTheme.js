/**
 * Festival Theme Configuration
 * 
 * This file controls the display of festival-themed decorations across the portal.
 * To enable/disable festival themes, simply toggle the respective boolean flags.
 */

export const FESTIVAL_THEME_CONFIG = {
    // Makar Sankranti Festival Theme
    // Set to true to enable kite decorations and festive elements
    // Set to false to completely hide all Makar Sankranti decorations
    ENABLE_MAKAR_SANKRANTI: true,

    // Theme-specific settings
    MAKAR_SANKRANTI_SETTINGS: {
        // Animation durations (in seconds)
        kiteFloatDuration: 4,
        sunPulseDuration: 3,
        fadeInDuration: 0.5,

        // Number of decorative elements
        headerKiteCount: 2,
        sidebarKiteCount: 1,
        modalKiteCount: 2,

        // Size settings (in pixels)
        kiteSize: 40,
        sunSize: 35,
        stringPatternHeight: 60,
    }
};

// Export shorthand for easy access
export const ENABLE_MAKAR_SANKRANTI_THEME = FESTIVAL_THEME_CONFIG.ENABLE_MAKAR_SANKRANTI;
