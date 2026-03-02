# Resilience360 Android APK Build & Deployment Guide

## Overview
This guide walks through building a production-ready Android APK for Resilience360 with full cross-device compatibility, all features enabled, and dynamic backend synchronization.

## Prerequisites

### System Requirements
- **Windows/Mac/Linux** with Git installed
- **Java Development Kit (JDK) 11+** (verify: `java -version`)
- **Android SDK** installed via Android Studio
- **Gradle 7.0+** (bundled with project)
- **Node.js 16+** and npm (for web build)
- **Capacitor CLI** (`npm i -g @capacitor/cli`)

### Verify Setup
```bash
# Check Java
java -version

# Check Android SDK
echo %ANDROID_HOME%  # Windows
echo $ANDROID_HOME   # Mac/Linux

# Check Gradle (in android folder)
cd android && ./gradlew --version
```

## Phase 1: Prepare Web Build

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Web Assets
```bash
npm run build
```
This creates optimized production build in `dist/` folder.

**Output Expected:**
- ✅ 389 modules transformed
- ✅ Zero TypeScript errors
- ✅ ~1.3 MB main JavaScript bundle (gzipped: ~398 KB)
- ✅ 75 CSS assets (gzipped: 19.46 KB)
- ✅ PWA manifest with 74 precached entries

### 3. Verify Build
```bash
npm run preview
```
Open http://localhost:4173 and test all core features:
- ✅ Home page loads
- ✅ Risk maps display
- ✅ Design toolkit sections accessible
- ✅ API calls working (check Network tab)

## Phase 2: Configure Android Build

### 1. Sync Web Assets to Android
```bash
npx cap copy
```
This copies `dist/` folder to `android/app/src/main/assets/www/`

### 2. Create Keystore for Release Signing
Generate a release keystore for production APK signing:

```bash
cd android

# Generate keystore (valid for 25 years)
keytool -genkey -v -keystore app/resilience360-release.keystore ^
  -keyalg RSA -keysize 2048 -validity 9125 ^
  -alias resilience360

# You'll be prompted for passwords - SAVE THESE SECURELY:
# - Store password: [CREATE STRONG PASSWORD]
# - Key password: [CREATE STRONG PASSWORD]
# Keep these in secure location (password manager, encrypted file)
```

### 3. Create keystore.properties File
```bash
# In /android folder, create keystore.properties
# DO NOT COMMIT TO GIT

storeFile=app/resilience360-release.keystore
storePassword=YOUR_STORE_PASSWORD_HERE
keyAlias=resilience360
keyPassword=YOUR_KEY_PASSWORD_HERE
```

### 4. Verify Android Build Configuration
```bash
cd android
./gradlew --version     # Verify Gradle works
./gradlew tasks         # List available tasks
```

## Phase 3: Build Release APK

### Debug Build (Testing)
```bash
cd android
./gradlew assembleDebug
```
**Output:** `android/app/build/outputs/apk/debug/app-debug.apk` (~35-40 MB)

### Release Build (Production)
```bash
cd android
./gradlew assembleRelease
```
**Output:** `android/app/build/outputs/apk/release/app-release.apk` (~25-30 MB)

**Build Process:**
1. Compiles Java source code
2. Transforms 389 JavaScript/CSS modules
3. Packages web assets into APK
4. Signs with release keystore
5. Optimizes with ProGuard/R8
6. Generates final APK (~25-30 MB)

**Build Time:** 3-5 minutes (first build may be slower)

### Verify APK Signature
```bash
# Verify release APK is properly signed
jarsigner -verify -verbose android/app/build/outputs/apk/release/app-release.apk
```

## Phase 4: Test APK Installation

### Option A: Android Emulator (if running Android Studio)
```bash
# List connected devices
adb devices

# Install debug APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb shell am start -n com.resilience360.app/.MainActivity

# View logs
adb logcat | grep resilience360
```

### Option B: Physical Android Device
1. Enable Developer Mode:
   - Go to Settings > About phone
   - Tap Build Number 7 times
   - Go to Settings > Developer Options > Enable USB Debugging

2. Connect via USB and install:
   ```bash
   adb devices
   adb install -r android/app/build/outputs/apk/release/app-release.apk
   ```

3. Grant permissions when prompted:
   - Location (for risk maps)
   - Camera (for retrofit image upload)
   - Storage (for file uploads)

### Option C: Distribute APK File
- File location: `android/app/build/outputs/apk/release/app-release.apk`
- Share via AirDrop, email, or cloud storage
- Users install: Settings > Apps > Install from Unknown Sources > Select APK

## Phase 5: Feature Verification Checklist

### Core Features
- [ ] App launches without crashes
- [ ] Home page loads with all cards visible
- [ ] Navigation between sections works
- [ ] Cards display images correctly

### Risk Maps & Location
- [ ] Pakistan Risk Map loads and displays districts
- [ ] Location services prompt appears (grant permission)
- [ ] Current location marker appears on map
- [ ] Zoom/pan map controls work
- [ ] Map tiles load properly at different zoom levels

### Live & Historical Data
- [ ] Live Earthquake Alerts load from USGS/EMSC
- [ ] Earthquake markers appear on globe
- [ ] PMD weather data loads
- [ ] Historical data charts render

### AI Features
- [ ] Vision Analysis: Upload building photo → Receives defect analysis
- [ ] ML Retrofit Estimate: Fills form → Gets cost estimate
- [ ] Construction Guidance: Selects retrofit type → Gets step-by-step guide
- [ ] Infrastructure Research: Specifies requirements → Gets design report
- [ ] Community Advisory: Asks location-based question → Gets response

### Design Toolkit
- [ ] Cost Estimator: All 4 input sections work
- [ ] Cost calculations display correctly
- [ ] Cost breakdown table visible and readable
- [ ] Comparison panel shows standard vs resilient costs
- [ ] All PKR currency values formatted correctly

### Portals (Web Links)
- [ ] COE Training Portal link opens
- [ ] Material Hubs Portal link opens
- [ ] GBCP Code Portal link opens
- [ ] Retrofit Calculator link opens
- [ ] Portals load in external browser

### Camera & File Upload
- [ ] Camera permission request appears
- [ ] Can take photo within app
- [ ] Can select from gallery
- [ ] Photo uploads to backend
- [ ] Upload progress shows
- [ ] Confirmation displays after upload

### Connectivity & Fallbacks
- [ ] Works on WiFi and cellular data
- [ ] API calls succeed (Network tab shows 200 OK)
- [ ] Graceful error handling when offline
- [ ] Service Worker caches offline content
- [ ] Can use app in airplane mode (cached content)

### Performance
- [ ] App launches in < 3 seconds
- [ ] Navigation between sections < 1 second
- [ ] Maps render smoothly without lag
- [ ] File uploads show progress without freezing
- [ ] Memory usage stable (check via adb)

### Cross-Device Compatibility
- [ ] Test on Android 9, 10, 11, 12, 13, 14+
- [ ] Test on small phones (5"), medium (6"), large (6.5"+)
- [ ] Test on tablets
- [ ] Portrait and landscape modes work
- [ ] Text scaling (small, normal, large) displays correctly

## Phase 6: Dynamic Backend Synchronization

### How It Works
1. **Service Worker** handles offline caching automatically
2. **API Endpoints** are called in real-time for fresh data
3. **Dynamic Content**:
   - Video URLs pulled from server
   - Earthquake data fetched live
   - Cost estimates calculated fresh
   - AI model responses generated in real-time

### Zero Reinstall Updates
Users **DO NOT** need to reinstall APK when you:
- ✅ Update backend API logic
- ✅ Change AI models or prompts
- ✅ Fix bugs in server code
- ✅ Add new videos or media
- ✅ Update earthquake feeds
- ✅ Modify database content
- ✅ Change portal links

**Only APK reinstall needed if you:**
- ❌ Add new native permissions
- ❌ Change app version significantly
- ❌ Update Capacitor plugins

### Verify Dynamic Updates
1. Deploy API change to backend (render.com)
2. Wait 5 minutes for propagation
3. Restart app or clear cache
4. Changes appear automatically

## Phase 7: Production Deployment

### Step 1: Google Play Store Submission
1. Create Google Play Developer account ($25 one-time fee)
2. Go to Google Play Console
3. Create new app
4. Fill in store listing details
5. Add screenshots (feature graphics, phone screenshots)
6. Complete content rating form
7. Set up privacy policy
8. Upload APK:
   - Go to Release > Testing > Alpha
   - Upload `app-release.apk`
   - Test with testers first
9. Move to Production release

### Step 2: Direct Distribution
Share APK file directly:
- Email to stakeholders
- Dropbox/Google Drive link
- GitHub Releases page
- Internal app store

### Step 3: Monitor & Update
```bash
# Check app logs from devices
adb logcat | grep -E "resilience360|error|Exception"

# Collect crash reports (enable in app)
# Monitor API usage via render.com dashboard
# Track user feedback from Google Play Store
```

## Troubleshooting

### Issue: "BUILD FAILED"
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleRelease
```

### Issue: "Permission Denied" errors
Make sure `gradlew` has execute permissions:
```bash
chmod +x gradlew
```

### Issue: APK won't install
```bash
# Might need to uninstall old version first
adb uninstall com.resilience360.app
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### Issue: App crashes on launch
```bash
# View crash logs
adb logcat | grep "AndroidRuntime\|resilience360"

# Check if web assets copied properly
ls -la android/app/src/main/assets/www/
```

### Issue: Maps/API not working
```bash
# Verify cleartext traffic allowed only for localhost
# Public APIs (USGS, EMSC) use HTTPS (production)
# Check network_security_config.xml
```

### Issue: Camera not working
```bash
# Verify camera permission in AndroidManifest.xml
# Test camera permission grant in Android settings
# Check that camera feature is not required-only
```

## Performance Notes

### APK Size
- Debug: 35-40 MB
- Release: 25-30 MB (minified, no symbols)
- Can be further optimized with dynamic feature modules

### Memory Usage
- Target: < 150 MB RAM on 2GB+ devices
- Smooth performance on Android 9+

### Battery
- Minimal impact due to PWA caching
- Location services only active when user grants permission
- Background updates minimal (mostly API calls)

## Security Checklist

- ✅ HTTPS enforced for all production APIs
- ✅ Certificate pinning configured
- ✅ Cleartext traffic disabled except localhost
- ✅ Permissions request at runtime (Android 6+)
- ✅ Sensitive data not hardcoded
- ✅ API keys in environment variables only
- ✅ No debug mode in release builds
- ✅ ProGuard enabled for code obfuscation

## Support & Maintenance

### Weekly
- Monitor crash reports
- Check API error rates
- Review user feedback

### Monthly
- Update dependencies
- Security patches
- Feature improvements

### Quarterly
- Major feature releases
- UI/UX improvements
- Performance optimization

## Next Steps

1. [x] Prepare web build
2. [x] Configure Android manifest
3. [x] Generate release keystore
4. [ ] Create keystore.properties
5. [ ] Build release APK
6. [ ] Test on devices
7. [ ] Submit to Google Play Store
8. [ ] Monitor production usage

---

**Version:** 1.0.0
**Last Updated:** March 2, 2026
**Contact:** Engineering Team
