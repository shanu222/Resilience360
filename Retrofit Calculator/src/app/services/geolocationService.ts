import type { CityRateConfiguration } from "../context/AppContext"

export type GeolocationResult = {
  city: string
  country: string
  latitude: number
  longitude: number
}

/**
 * Get city rates for a specific city
 * This function can be enhanced to call an AI API or database in the future
 */
export async function getCityRates(cityName: string, detectedAutomatically: boolean): Promise<CityRateConfiguration> {
  // Default rates database for Pakistani cities
  const cityRatesDatabase: Record<string, Partial<CityRateConfiguration>> = {
    lahore: {
      locationMultiplier: 1.05,
      surfacePreparationRate: 480,
      epoxyInjectionRate: 2800,
      rcJacketingRate: 92000,
      skilledLaborRate: 850,
    },
    karachi: {
      locationMultiplier: 1.12,
      surfacePreparationRate: 520,
      epoxyInjectionRate: 3100,
      rcJacketingRate: 98000,
      skilledLaborRate: 920,
    },
    islamabad: {
      locationMultiplier: 1.10,
      surfacePreparationRate: 510,
      epoxyInjectionRate: 3000,
      rcJacketingRate: 95000,
      skilledLaborRate: 900,
    },
    rawalpindi: {
      locationMultiplier: 1.08,
      surfacePreparationRate: 495,
      epoxyInjectionRate: 2900,
      rcJacketingRate: 93000,
      skilledLaborRate: 875,
    },
    faisalabad: {
      locationMultiplier: 1.03,
      surfacePreparationRate: 470,
      epoxyInjectionRate: 2750,
      rcJacketingRate: 90000,
      skilledLaborRate: 830,
    },
    multan: {
      locationMultiplier: 1.04,
      surfacePreparationRate: 475,
      epoxyInjectionRate: 2775,
      rcJacketingRate: 91000,
      skilledLaborRate: 840,
    },
    peshawar: {
      locationMultiplier: 1.07,
      surfacePreparationRate: 490,
      epoxyInjectionRate: 2875,
      rcJacketingRate: 93500,
      skilledLaborRate: 865,
    },
    quetta: {
      locationMultiplier: 1.15,
      surfacePreparationRate: 535,
      epoxyInjectionRate: 3150,
      rcJacketingRate: 99000,
      skilledLaborRate: 940,
    },
  }

  // Normalize city name
  const normalizedCity = cityName.toLowerCase().replace(/[^a-z]/g, '')
  
  // Find matching city or use default
  const cityKey = Object.keys(cityRatesDatabase).find(key => normalizedCity.includes(key)) || 'lahore'
  const baseRates = cityRatesDatabase[cityKey]

  // Return complete rate configuration with defaults
  return {
    cityName,
    detectedAutomatically,
    surfacePreparationRate: baseRates.surfacePreparationRate || 480,
    epoxyInjectionRate: baseRates.epoxyInjectionRate || 2800,
    rcJacketingRate: baseRates.rcJacketingRate || 92000,
    skilledLaborRate: baseRates.skilledLaborRate || 850,
    locationMultiplier: baseRates.locationMultiplier || 1.0,
    contingencyPercent: 10,
    overheadPercent: 15,
    severeSurfaceRepairRate: 8500,
    moderateSurfaceRepairRate: 6200,
    lowSurfaceRepairRate: 4100,
    veryLowSurfaceRepairRate: 2350,
    investigationCost: 65000,
    replacementAllowance: 210000,
    isConfirmed: false,
  }
}

/**
 * Get user's current location using browser Geolocation API
 */
export async function getCurrentPosition(): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"))
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Use reverse geocoding to get city from coordinates
          const city = await reverseGeocode(position.coords.latitude, position.coords.longitude)
          resolve(city)
        } catch (error) {
          reject(error)
        }
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  })
}

/**
 * Reverse geocode coordinates to city name
 * Uses OpenStreetMap Nominatim API (free, no key required)
 */
async function reverseGeocode(latitude: number, longitude: number): Promise<GeolocationResult> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      {
        headers: {
          'User-Agent': 'RetrofitCalculator/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error('Reverse geocoding failed')
    }

    const data = await response.json()
    
    return {
      city: data.address?.city || data.address?.town || data.address?.village || 'Unknown City',
      country: data.address?.country || 'Unknown Country',
      latitude,
      longitude
    }
  } catch (error) {
    throw new Error('Failed to determine city from coordinates')
  }
}

/**
 * Get approximate location from IP address (fallback method)
 */
export async function getLocationFromIP(): Promise<GeolocationResult> {
  try {
    // Using ipapi.co (free tier, no key required for basic usage)
    const response = await fetch('https://ipapi.co/json/')
    
    if (!response.ok) {
      throw new Error('IP geolocation failed')
    }

    const data = await response.json()
    
    return {
      city: data.city || 'Lahore',
      country: data.country_name || 'Pakistan',
      latitude: data.latitude || 31.5204,
      longitude: data.longitude || 74.3587
    }
  } catch (error) {
    // Fallback to Lahore if IP detection fails
    return {
      city: 'Lahore',
      country: 'Pakistan',
      latitude: 31.5204,
      longitude: 74.3587
    }
  }
}

/**
 * List of Pakistani cities for manual selection
 */
export const pakistaniCities = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Sialkot",
  "Gujranwala",
  "Bahawalpur",
  "Sargodha",
  "Sukkur",
  "Larkana",
  "Sheikhupura",
  "Jhang",
  "Rahim Yar Khan",
  "Gujrat",
  "Kasur",
  "Mardan",
]
