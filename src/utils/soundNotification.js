/**
 * Utility function to play notification sounds
 * @param {string} soundPath - Path to the sound file (default: notification sound)
 */
export const playNotificationSound = (soundPath = '/NotificationSoundFile/NotificationSound.wav') => {
    try {
        const audio = new Audio(soundPath);
        audio.volume = 0.7; // Set volume to 70% to avoid being too loud
        audio.play().catch(error => {
            console.warn('Failed to play notification sound:', error);
            // Some browsers require user interaction before playing audio
            // This is expected behavior and not a critical error
        });
    } catch (error) {
        console.warn('Error creating audio element:', error);
    }
};

