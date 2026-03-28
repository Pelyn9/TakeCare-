# TakeCare+ - Medication Reminder App

A mobile medication tracker app built with React and Capacitor.

## Features
- Medicine scheduling and tracking
- Daily dose reminders
- Alarm notifications with sound and vibration
- History tracking
- Works offline as Android APK

## Build Commands

### For Local APK Build
```bash
# Install dependencies
npm install

# Build and sync to Android
npm run build:apk

# The APK will be in: android/app/build/outputs/apk/debug/app-debug.apk
```

### For EAS Cloud Build
```bash
# Login to EAS
npx eas-cli login

# Build APK (preview profile)
npx eas-cli build --platform android --profile preview

# Build App Bundle (production profile)
npx eas-cli build --platform android --profile production
```

## Inspection Guard

The app includes an inspection guard that:
- Disables right-click menu in production
- Disables DevTools keyboard shortcuts (F12, Ctrl+Shift+I/J/C)
- Blocks debugging in production
- Only active on non-localhost URLs

## Deployment

### Vercel (Web)
```bash
npm run build
# Deploy the dist folder to Vercel
```

The inspection guard will automatically enable on Vercel deployment.

## Project Structure
```
src/
  components/     # React components
  pages/          # Page components
  hooks/          # Custom React hooks
  services/       # Utility services
