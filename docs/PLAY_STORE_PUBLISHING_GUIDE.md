# Google Play Store Publishing Guide for Resilience360

## Prerequisites Completed ✓
- Android debug APK built successfully
- Signing configuration added to build.gradle
- Keystore security configured in .gitignore

---

## Step 1: Create Google Play Console Account

1. Visit: https://play.google.com/console/signup
2. Pay $25 one-time registration fee
3. Complete developer account profile
4. Accept Developer Distribution Agreement

---

## Step 2: Generate Release Keystore (CRITICAL - One-Time Only)

Run this in PowerShell:

```powershell
cd "f:\Resilience360\android\app"
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
& "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -v `
  -keystore resilience360-release.keystore `
  -alias resilience360 `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000
```

**You will be prompted for:**
- Keystore password (choose strong password)
- Key password (can be same as keystore password)
- Your name, organization, city, state, country

**CRITICAL**: 
- Save the keystore file and passwords in a secure location (encrypted backup)
- If you lose this keystore, you can NEVER update your app again
- Keep multiple backups in different secure locations

---

## Step 3: Configure Keystore Properties

1. Copy the template:
```powershell
Copy-Item "f:\Resilience360\android\keystore.properties.template" "f:\Resilience360\android\keystore.properties"
```

2. Edit `android/keystore.properties` and fill in your actual passwords:
```properties
storeFile=app/resilience360-release.keystore
storePassword=YOUR_ACTUAL_STORE_PASSWORD
keyAlias=resilience360
keyPassword=YOUR_ACTUAL_KEY_PASSWORD
```

**NEVER commit this file to git** (already in .gitignore)

---

## Step 4: Update Version Info (Every Release)

Edit `android/app/build.gradle`:
```groovy
versionCode 1        // Increment this for each Play Store release (1, 2, 3...)
versionName "1.0.0"  // User-visible version (1.0.0, 1.0.1, 1.1.0...)
```

---

## Step 5: Build Signed Release AAB

Run from project root:

```powershell
# 1. Build latest web assets
npm run mobile:prepare

# 2. Build signed release AAB
cd android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat bundleRelease

# AAB will be at: android\app\build\outputs\bundle\release\app-release.aab
```

---

## Step 6: Create App in Play Console

1. Go to: https://play.google.com/console/
2. Click "Create app"
3. Fill in:
   - App name: **Resilience360**
   - Default language: English (United States)
   - App or game: App
   - Free or paid: Free
4. Accept declarations and create

---

## Step 7: Complete Store Listing (Required)

### App Details
- Short description (80 chars max)
- Full description (4000 chars max)
- App icon (512 x 512 PNG)
- Feature graphic (1024 x 500 PNG)
- Screenshots (minimum 2, max 8 per device type)
  - Phone: 16:9 or 9:16 ratio
  - Recommended: 1080 x 1920 px

### Contact Details
- Email address
- Phone number (optional)
- Website (optional)

### Privacy Policy
- Required for most apps
- Must be publicly accessible URL
- Can use GitHub Pages: Create privacy-policy.md in your repo

---

## Step 8: Complete Content Rating

1. In Play Console → Content rating
2. Fill out questionnaire based on your app content
3. Submit for rating
4. Apply rating to app

---

## Step 9: Select Countries/Regions

1. In Play Console → Production → Countries/regions
2. Select countries where you want to distribute
3. Default: All available countries

---

## Step 10: Upload AAB to Internal Testing

1. Go to Play Console → Testing → Internal testing
2. Click "Create new release"
3. Upload: `android/app/build/outputs/bundle/release/app-release.aab`
4. Fill in release notes
5. Review and roll out to internal testing
6. Add testers (email addresses with Google accounts)
7. Share testing link with testers

---

## Step 11: Test the Build

1. Install from Internal testing link on real Android devices
2. Test all features thoroughly:
   - Map functionality
   - Image uploads
   - API connectivity
   - Permissions (camera, location, storage)
   - Offline functionality
3. Confirm no crashes or major bugs

---

## Step 12: Promote to Production

Once testing is successful:

1. Go to Play Console → Production → Releases
2. Click "Create new release"
3. Upload the same AAB or create new release
4. Add release notes for users
5. Review release
6. Click "Start rollout to Production"

**Note**: First production release requires Google review (1-7 days)

---

## Step 13: Post-Publishing

### Monitor Performance
- Check crash reports in Play Console
- Monitor reviews and ratings
- Track installation metrics

### Update Process (Future Releases)
1. Make code changes
2. Increment `versionCode` in build.gradle
3. Update `versionName` if needed
4. Run: `npm run mobile:prepare`
5. Build new AAB: `cd android && .\gradlew.bat bundleRelease`
6. Upload to Play Console
7. Test in internal/closed testing
8. Roll out to production

---

## Troubleshooting

### Build Fails
- Check JAVA_HOME is set correctly
- Verify keystore.properties paths are correct
- Check keystore exists in app/ directory

### Upload Rejected
- Ensure versionCode is higher than previous release
- Check minimum API level compatibility
- Review target API requirements

### App Not Published
- Complete ALL required sections in Play Console
- Wait for Google review (first release only)
- Check for policy violations in email

---

## Security Checklist

- [ ] Keystore backed up in 3+ secure locations
- [ ] Passwords stored in password manager
- [ ] keystore.properties in .gitignore
- [ ] *.keystore in .gitignore
- [ ] Never share keystore file publicly
- [ ] Never commit passwords to git

---

## Quick Commands Reference

```powershell
# Full release build workflow
npm run mobile:prepare
cd android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
.\gradlew.bat bundleRelease

# Output location
# android\app\build\outputs\bundle\release\app-release.aab
```

---

## Need Help?

- Play Console Help: https://support.google.com/googleplay/android-developer
- Capacitor Docs: https://capacitorjs.com/docs/android
- This project issues: https://github.com/shanu222/Resilience360/issues
