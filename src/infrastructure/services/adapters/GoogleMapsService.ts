import { Client } from '@googlemaps/google-maps-services-js';
import {
  IMapsService,
  Coordinates,
  Address,
  GeocodeResult,
  DistanceResult,
  NearbySearchResult,
} from '../IMapsService';

export interface GoogleMapsConfig {
  apiKey: string;
  timeout?: number;
}

export class GoogleMapsService implements IMapsService {
  private client: Client;

  constructor(private config: GoogleMapsConfig) {
    this.client = new Client({});
  }

  async geocodeAddress(address: string): Promise<GeocodeResult> {
    try {
      const response = await this.client.geocode({
        params: {
          address,
          key: this.config.apiKey,
        },
      });

      if (response.data.results.length === 0) {
        throw new Error('Address not found');
      }

      const result = response.data.results[0];
      const location = result.geometry.location;
      const addressComponents = result.address_components;

      return {
        coordinates: {
          latitude: location.lat,
          longitude: location.lng,
        },
        address: this.parseAddressComponents(addressComponents, result.formatted_address),
        accuracy: result.geometry.location_type as any,
      };
    } catch (error) {
      throw new Error(`Geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async reverseGeocode(coordinates: Coordinates): Promise<Address> {
    try {
      const response = await this.client.reverseGeocode({
        params: {
          latlng: `${coordinates.latitude},${coordinates.longitude}`,
          key: this.config.apiKey,
        },
      });

      if (response.data.results.length === 0) {
        throw new Error('No address found for coordinates');
      }

      const result = response.data.results[0];
      return this.parseAddressComponents(result.address_components, result.formatted_address);
    } catch (error) {
      throw new Error(`Reverse geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async calculateDistance(
    from: Coordinates,
    to: Coordinates,
    unit: 'meters' | 'kilometers' | 'miles' = 'meters'
  ): Promise<DistanceResult> {
    try {
      const response = await this.client.distancematrix({
        params: {
          origins: [`${from.latitude},${from.longitude}`],
          destinations: [`${to.latitude},${to.longitude}`],
          units: unit === 'miles' ? ('imperial' as any) : ('metric' as any),
          key: this.config.apiKey,
        },
      });

      const element = response.data.rows[0]?.elements[0];
      if (!element || element.status !== 'OK') {
        throw new Error('Unable to calculate distance');
      }

      let distance = element.distance.value; // in meters
      if (unit === 'kilometers') {
        distance = distance / 1000;
      } else if (unit === 'miles') {
        distance = distance * 0.000621371; // Convert meters to miles
      }

      return {
        distance,
        duration: element.duration?.value,
        unit,
      };
    } catch (error) {
      // Fallback to haversine formula
      return this.calculateHaversineDistance(from, to, unit);
    }
  }

  async calculateDistances(
    from: Coordinates,
    destinations: Coordinates[],
    unit: 'meters' | 'kilometers' | 'miles' = 'meters'
  ): Promise<DistanceResult[]> {
    try {
      const destinationStrings = destinations.map(dest => `${dest.latitude},${dest.longitude}`);
      
      const response = await this.client.distancematrix({
        params: {
          origins: [`${from.latitude},${from.longitude}`],
          destinations: destinationStrings,
          units: unit === 'miles' ? ('imperial' as any) : ('metric' as any),
          key: this.config.apiKey,
        },
      });

      const elements = response.data.rows[0]?.elements || [];
      return elements.map((element: any, index: number) => {
        if (element.status !== 'OK') {
          // Fallback to haversine calculation
          return this.calculateHaversineDistance(from, destinations[index], unit);
        }

        let distance = element.distance.value; // in meters
        if (unit === 'kilometers') {
          distance = distance / 1000;
        } else if (unit === 'miles') {
          distance = distance * 0.000621371;
        }

        return {
          distance,
          duration: element.duration?.value,
          unit,
        };
      });
    } catch (error) {
      // Fallback to haversine calculations for all destinations
      return destinations.map(dest => this.calculateHaversineDistance(from, dest, unit));
    }
  }

  async findNearbyUsers(
    center: Coordinates,
    radiusInMeters: number,
    userLocations: Array<{ userId: string; coordinates: Coordinates }>
  ): Promise<NearbySearchResult[]> {
    const results: NearbySearchResult[] = [];

    for (const userLocation of userLocations) {
      const distanceResult = await this.calculateDistance(center, userLocation.coordinates, 'meters');
      
      if (distanceResult.distance <= radiusInMeters) {
        results.push({
          userId: userLocation.userId,
          coordinates: userLocation.coordinates,
          distance: distanceResult.distance,
        });
      }
    }

    // Sort by distance (closest first)
    return results.sort((a, b) => a.distance - b.distance);
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple test geocoding request
      await this.client.geocode({
        params: {
          address: 'New York, NY',
          key: this.config.apiKey,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  validateCoordinates(coordinates: Coordinates): boolean {
    const { latitude, longitude } = coordinates;
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    );
  }

  private parseAddressComponents(components: any[], formattedAddress: string): Address {
    const address: Address = {
      formattedAddress,
      city: '',
      country: '',
    };

    for (const component of components) {
      const types = component.types;
      
      if (types.includes('street_number') || types.includes('route')) {
        address.street = address.street 
          ? `${component.long_name} ${address.street}`
          : component.long_name;
      } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        address.city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        address.state = component.short_name;
      } else if (types.includes('country')) {
        address.country = component.long_name;
      } else if (types.includes('postal_code')) {
        address.postalCode = component.long_name;
      }
    }

    return address;
  }

  private calculateHaversineDistance(
    from: Coordinates,
    to: Coordinates,
    unit: 'meters' | 'kilometers' | 'miles' = 'meters'
  ): DistanceResult {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = (from.latitude * Math.PI) / 180;
    const lat2Rad = (to.latitude * Math.PI) / 180;
    const deltaLatRad = ((to.latitude - from.latitude) * Math.PI) / 180;
    const deltaLngRad = ((to.longitude - from.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    let distance = R * c; // Distance in meters

    if (unit === 'kilometers') {
      distance = distance / 1000;
    } else if (unit === 'miles') {
      distance = distance * 0.000621371;
    }

    return {
      distance,
      unit,
    };
  }
}