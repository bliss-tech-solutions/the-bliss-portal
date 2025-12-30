# Notification Sound Files

This directory contains notification sound files used throughout the application.

## iOS Default Notification Sound

To add the iOS default notification sound (Tri-tone/Note):

1. **Download the iOS notification sound:**
   - Visit: https://www.zedge.net/notification-sounds/ and search for "iOS notification" or "Tri-tone"
   - Or extract the "Note" sound from an iOS device
   - The sound file should be named: `iOSNotification.wav`

2. **Place the file in this directory:**
   - Save the file as: `iOSNotification.wav` in `/public/NotificationSoundFile/`

3. **Supported formats:**
   - `.wav` (recommended)
   - `.mp3`
   - `.ogg`
   - `.m4a`

## Current Sound Files

- `NotificationSound.wav` - Default notification sound
- `iOSNotification.wav` - iOS default notification sound (Tri-tone) - **Add this file**

## Usage

The sounds are configured in `/src/utils/soundConfig.js`. You can change which sound is used for different notification types there.

