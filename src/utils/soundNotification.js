import { getSoundPath } from './soundConfig';

/**
 * Utility function to play notification sounds
 * @param {string|undefined} soundPathOrType - Either a direct path to sound file, or a sound type from soundConfig (e.g., 'taskCompleted', 'newTask', 'default')
 *                                             If not provided, uses 'default' sound
 * @param {number} volume - Volume level (0.0 to 1.0), default is 0.7 (70%)
 * 
 * @example
 * // Use default sound
 * playNotificationSound();
 * 
 * // Use a specific sound type
 * playNotificationSound('taskCompleted');
 * 
 * // Use a custom sound file path
 * playNotificationSound('/NotificationSoundFile/CustomSound.wav');
 * 
 * // Use a sound type with custom volume
 * playNotificationSound('newTask', 0.5);
 */
export const playNotificationSound = (soundPathOrType = 'default', volume = 0.7) => {
    try {
        // Determine the sound path
        let soundPath;
        if (!soundPathOrType || soundPathOrType === 'default' || soundPathOrType === 'taskCompleted' || soundPathOrType === 'newTask' || soundPathOrType === 'iosDefault') {
            // It's a sound type, get path from config
            soundPath = getSoundPath(soundPathOrType);
        } else {
            // It's a direct file path
            soundPath = soundPathOrType;
        }

        console.log(`🔔 Playing notification sound: ${soundPath} (type: ${soundPathOrType})`);

        const audio = new Audio(soundPath);
        audio.volume = Math.max(0, Math.min(1, volume)); // Clamp volume between 0 and 1
        
        // Handle audio loading errors (e.g., file not found)
        audio.addEventListener('error', (e) => {
            console.error(`❌ Failed to load sound file: ${soundPath}`, e);
            console.error('Audio error details:', {
                error: audio.error,
                code: audio.error?.code,
                message: audio.error?.message
            });
            
            // Fallback to default sound if the specified sound fails to load
            if (soundPath !== getSoundPath('default')) {
                console.log('🔄 Falling back to default sound...');
                const fallbackAudio = new Audio(getSoundPath('default'));
                fallbackAudio.volume = Math.max(0, Math.min(1, volume));
                fallbackAudio.play().catch(err => {
                    console.error('❌ Failed to play fallback notification sound:', err);
                });
            }
        });
        
        // Log successful load
        audio.addEventListener('loadeddata', () => {
            console.log(`✅ Sound file loaded successfully: ${soundPath}`);
        });
        
        // Log when playback starts
        audio.addEventListener('play', () => {
            console.log(`▶️ Sound playback started: ${soundPath}`);
        });
        
        audio.play().catch(error => {
            console.error('❌ Failed to play notification sound:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message
            });
            // Some browsers require user interaction before playing audio
            // This is expected behavior and not a critical error
        });
    } catch (error) {
        console.error('❌ Error creating audio element:', error);
    }
};

