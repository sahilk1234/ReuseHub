export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  street?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  formattedAddress: string;
}

export interface GeocodeResult {
  coordinates: Coordinates;
  address: Address;
  accuracy: 'ROOFTOP' | 'RANGE_INTERPOLATED' | 'GEOMETRIC_CENTER' | 'APPROXIMATE';
}

export interface DistanceResult {
  distance: number; // in meters
  duration?: number; // in seconds
  unit: 'meters' | 'kilometers' | 'miles';
}

export interface NearbySearchResult {
  userId: string;
  coordinates: Coordinates;
  distance: number; // in meters
}

export interface IMapsService {
  /**
   * Convert an address to coordinates (geocoding)
   * @param address - The address to geocode
   * @returns Promise resolving to geocode result
   */
  geocodeAddress(address: string): Promise<GeocodeResult>;

  /**
   * Convert coordinates to an address (reverse geocoding)
   * @param coordinates - The coordinates to reverse geocode
   * @returns Promise resolving to address information
   */
  reverseGeocode(coordinates: Coordinates): Promise<Address>;

  /**
   * Calculate distance between two points
   * @param from - Starting coordinates
   * @param to - Destination coordinates
   * @param unit - Unit for the result (default: meters)
   * @returns Promise resolving to distance result
   */
  calculateDistance(from: Coordinates, to: Coordinates, unit?: 'meters' | 'kilometers' | 'miles'): Promise<DistanceResult>;

  /**
   * Calculate distances from one point to multiple points
   * @param from - Starting coordinates
   * @param destinations - Array of destination coordinates
   * @param unit - Unit for the results (default: meters)
   * @returns Promise resolving to array of distance results
   */
  calculateDistances(from: Coordinates, destinations: Coordinates[], unit?: 'meters' | 'kilometers' | 'miles'): Promise<DistanceResult[]>;

  /**
   * Find users within a specified radius
   * @param center - Center coordinates for the search
   * @param radiusInMeters - Search radius in meters
   * @param userLocations - Array of user locations to search through
   * @returns Promise resolving to array of nearby users
   */
  findNearbyUsers(
    center: Coordinates,
    radiusInMeters: number,
    userLocations: Array<{ userId: string; coordinates: Coordinates }>
  ): Promise<NearbySearchResult[]>;

  /**
   * Check if the maps service is available
   * @returns Promise resolving to true if service is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Validate coordinates
   * @param coordinates - Coordinates to validate
   * @returns True if coordinates are valid
   */
  validateCoordinates(coordinates: Coordinates): boolean;
}