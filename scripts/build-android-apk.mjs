#!/usr/bin/env node

/**
 * Resilience360 Android APK Build Automation Script
 * 
 * Usage:
 *   node scripts/build-android-apk.mjs debug     # Build debug APK
 *   node scripts/build-android-apk.mjs release   # Build release APK (requires keystore)
 *   node scripts/build-android-apk.mjs verify    # Verify build environment
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const androidDir = path.join(rootDir, 'android')
const distDir = path.join(rootDir, 'dist')

// Color console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  log(`\n${'='.repeat(70)}`, 'cyan')
  log(`  ${title}`, 'bright')
  log(`${'='.repeat(70)}\n`, 'cyan')
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue')
}

function executeCommand(command, description = '') {
  try {
    logInfo(description || command)
    execSync(command, { stdio: 'inherit', cwd: rootDir })
    logSuccess(`Completed: ${description || command}`)
    return true
  } catch (error) {
    logError(`Failed: ${description || command}`)
    console.error(error.message)
    return false
  }
}

function verifyEnvironment() {
  logSection('Verifying Build Environment')

  const checks = [
    {
      name: 'Node.js',
      command: 'node --version',
      minVersion: '16.0.0',
    },
    {
      name: 'npm',
      command: 'npm --version',
      minVersion: '7.0.0',
    },
    {
      name: 'Java/JDK',
      command: 'java -version 2>&1 | head -1',
      optional: false,
    },
    {
      name: 'Gradle',
      command: 'cd android && ./gradlew --version 2>&1 | head -1',
      optional: false,
    },
  ]

  let allPassed = true

  for (const check of checks) {
    try {
      const output = execSync(check.command, { encoding: 'utf8' })
      logSuccess(`${check.name}: ${output.split('\n')[0].trim()}`)
    } catch (error) {
      if (check.optional) {
        logWarning(`${check.name}: Not found (optional)`)
      } else {
        logError(`${check.name}: Not found or not in PATH`)
        allPassed = false
      }
    }
  }

  return allPassed
}

function buildWebAssets() {
  logSection('Building Web Assets (React → dist/)')

  if (!executeCommand('npm install', 'Installing dependencies')) {
    return false
  }

  if (!executeCommand('npm run build', 'Building with Vite')) {
    return false
  }

  // Verify build output
  if (!fs.existsSync(distDir)) {
    logError('Build output not found: ' + distDir)
    return false
  }

  const files = fs.readdirSync(distDir)
  logInfo(`Build output files: ${files.join(', ')}`)

  const indexFile = path.join(distDir, 'index.html')
  if (fs.existsSync(indexFile)) {
    logSuccess('Web build successful')
    return true
  } else {
    logError('index.html not found in build output')
    return false
  }
}

function copyWebAssetsToAndroid() {
  logSection('Copying Web Assets to Android')

  const command = process.platform === 'win32' ? 'npx cap copy' : 'npx cap copy'

  if (!executeCommand(command, 'Running capacitor copy')) {
    return false
  }

  const androidWwwDir = path.join(
    androidDir,
    'app/src/main/assets/www'
  )

  if (fs.existsSync(androidWwwDir)) {
    const files = fs.readdirSync(androidWwwDir)
    logSuccess(`Copied to Android: ${files.length} files`)
    return true
  } else {
    logError('Android assets directory not found: ' + androidWwwDir)
    return false
  }
}

function buildAndroidApk(buildType = 'debug') {
  logSection(`Building Android APK (${buildType.toUpperCase()})`)

  const isRelease = buildType === 'release'
  const keystoreFile = path.join(androidDir, 'app/resilience360-release.keystore')
  const keystorePropsFile = path.join(androidDir, 'keystore.properties')

  if (isRelease) {
    // Verify keystore exists
    if (!fs.existsSync(keystoreFile)) {
      logError('Release keystore not found: ' + keystoreFile)
      logWarning('Generate with: keytool -genkey -v -keystore ' + keystoreFile)
      return false
    }

    // Verify keystore.properties exists
    if (!fs.existsSync(keystorePropsFile)) {
      logError('keystore.properties not found')
      logWarning('Create this file with your keystore credentials')
      return false
    }

    logInfo('Keystore verified')
  }

  // Run Gradle build
  const gradleCommand = `cd android && ./gradlew assemble${
    isRelease ? 'Release' : 'Debug'
  }`

  if (!executeCommand(gradleCommand, `Gradle assembling ${buildType} APK`)) {
    return false
  }

  return true
}

function verifyApkBuild(buildType = 'debug') {
  logSection(`Verifying APK Build (${buildType.toUpperCase()})`)

  const apkPath = path.join(
    androidDir,
    `app/build/outputs/apk/${buildType}/app-${buildType}.apk`
  )

  if (!fs.existsSync(apkPath)) {
    logError('APK not found: ' + apkPath)
    return false
  }

  const stats = fs.statSync(apkPath)
  const sizeInMb = (stats.size / (1024 * 1024)).toFixed(2)

  logSuccess(`APK created: ${apkPath}`)
  logInfo(`APK size: ${sizeInMb} MB`)

  return true
}

function displayBuildSummary(buildType) {
  logSection('Build Summary')

  const apkPath = path.join(
    androidDir,
    `app/build/outputs/apk/${buildType}/app-${buildType}.apk`
  )

  if (fs.existsSync(apkPath)) {
    const stats = fs.statSync(apkPath)
    const sizeInMb = (stats.size / (1024 * 1024)).toFixed(2)

    logSuccess('✅ BUILD SUCCESSFUL')
    log(`\nAPK Location: ${apkPath}`, 'cyan')
    log(`APK Size: ${sizeInMb} MB`, 'cyan')
    log(`Build Type: ${buildType.toUpperCase()}`, 'cyan')

    if (buildType === 'release') {
      log('\n📦 Ready for Distribution:', 'green')
      log('  • Google Play Store submission', 'green')
      log('  • Direct APK distribution', 'green')
      log('  • Enterprise deployment', 'green')
    } else {
      log('\n🧪 Ready for Testing:', 'green')
      log('  • Android Studio Emulator', 'green')
      log('  • Connected Android device', 'green')
      log('  • USB installation (adb install)', 'green')
    }

    log('\n📱 Next Steps:', 'cyan')
    if (buildType === 'debug') {
      log('  1. adb install -r ' + apkPath, 'dim')
      log('  2. Test all features on device', 'dim')
      log('  3. Review logcat for errors: adb logcat | grep resilience360', 'dim')
    } else {
      log('  1. Sign APK with upload certificate for Google Play', 'dim')
      log('  2. Submit to Google Play Console', 'dim')
      log('  3. Or distribute via direct download', 'dim')
    }
  } else {
    logError('❌ Build verification failed - APK not found')
  }
}

function main() {
  const buildType = process.argv[2]?.toLowerCase() || 'verify'

  try {
    switch (buildType) {
      case 'verify':
        verifyEnvironment()
        break

      case 'debug':
      case 'release':
        if (!verifyEnvironment()) {
          logError('Environment verification failed')
          process.exit(1)
        }

        if (!buildWebAssets()) {
          logError('Web build failed')
          process.exit(1)
        }

        if (!copyWebAssetsToAndroid()) {
          logError('Asset copy failed')
          process.exit(1)
        }

        if (!buildAndroidApk(buildType)) {
          logError(`${buildType} APK build failed`)
          process.exit(1)
        }

        if (!verifyApkBuild(buildType)) {
          logError('APK verification failed')
          process.exit(1)
        }

        displayBuildSummary(buildType)
        break

      default:
        log('Usage: node scripts/build-android-apk.mjs [verify|debug|release]', 'yellow')
        process.exit(1)
    }
  } catch (error) {
    logError('Build process failed: ' + error.message)
    process.exit(1)
  }
}

main()
