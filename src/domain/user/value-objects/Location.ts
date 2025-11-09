export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

export class Location {
  private readonly _latitude: number;
  private readonly _longitude: number;
  private readonly _address: string;

  constructor(data: LocationData) {
    if (data.latitude < -90 || data.latitude > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees');
    }
    if (data.longitude < -180 || data.longitude > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees');
    }
    if (!data.address || data.address.trim().length === 0) {
      throw new Error('Address cannot be empty');
    }

    this._latitude = data.latitude;
    this._longitude = data.longitude;
    this._address = data.address.trim();
  }

  get latitude(): number {
    return this._latitude;
  }

  get longitude(): number {
    return this._longitude;
  }

  get address(): string {
    return this._address;
  }

  equals(other: Location): boolean {
    return (
      this._latitude === other._latitude &&
      this._longitude === other._longitude &&
      this._address === other._address
    );
  }

  distanceTo(other: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(other._latitude - this._latitude);
    const dLon = this.toRadians(other._longitude - this._longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(this._latitude)) * Math.cos(this.toRadians(other._latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  toData(): LocationData {
    return {
      latitude: this._latitude,
      longitude: this._longitude,
      address: this._address
    };
  }
}