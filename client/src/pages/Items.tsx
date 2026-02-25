import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Item {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  images: string[];
  condition: string;
  status: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  distanceKm?: number;
  createdAt: string;
}

interface SearchFilters {
  searchTerm: string;
  category: string;
  maxDistance: number;
  condition: string;
}

export default function Items() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [hasMore, setHasMore] = useState(false);
  
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    category: '',
    maxDistance: 50,
    condition: '',
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [useGeoLocation, setUseGeoLocation] = useState(false);
  const [geoLocation, setGeoLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const categories = [
    'Furniture',
    'Electronics',
    'Clothing',
    'Books',
    'Toys',
    'Kitchen',
    'Sports',
    'Garden',
    'Tools',
    'Other'
  ];

  useEffect(() => {
    fetchItems();
  }, [page]);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('status', 'available');
      params.append('limit', limit.toString());
      params.append('offset', ((page - 1) * limit).toString());
      
      if (filters.searchTerm) {
        params.append('searchTerm', filters.searchTerm);
      }
      if (filters.category) {
        params.append('category', filters.category);
      }
      const locationToUse = geoLocation
        ? geoLocation
        : user && user.location && user.location.latitude && user.location.longitude
          ? { latitude: user.location.latitude, longitude: user.location.longitude }
          : null;

      if (locationToUse && filters.maxDistance) {
        params.append('latitude', locationToUse.latitude.toString());
        params.append('longitude', locationToUse.longitude.toString());
        params.append('maxDistance', filters.maxDistance.toString());
      }

      const response = await fetch(`${API_URL}/items?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }

      const data = await response.json();
      setItems(data.data.items);
      setTotalCount(data.data.totalCount);
      setHasMore(data.data.hasMore ?? data.data.items.length + (page - 1) * limit < data.data.totalCount);
    } catch (err: any) {
      setError(err.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleFilterChange = (name: string, value: string | number) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      category: '',
      maxDistance: 50,
      condition: '',
    });
  };

  const requestGeoLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
      },
      (err) => {
        setGeoError(err.message || 'Failed to get location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const getConditionBadgeColor = (condition: string) => {
    switch (condition) {
      case 'new':
        return 'bg-green-100 text-green-800';
      case 'like-new':
        return 'bg-blue-100 text-blue-800';
      case 'good':
        return 'bg-yellow-100 text-yellow-800';
      case 'fair':
        return 'bg-orange-100 text-orange-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Browse Items</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              placeholder="Search for items..."
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filters</span>
          </button>
          <button type="submit" className="btn-primary">
            Search
          </button>
        </div>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Clear all
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {(user || useGeoLocation) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Distance (km)
                </label>
                <input
                  type="number"
                  value={filters.maxDistance}
                  onChange={(e) => handleFilterChange('maxDistance', parseInt(e.target.value))}
                  min="1"
                  max="500"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <div className="mt-3 flex items-center space-x-2">
                  <input
                    id="useGeoLocation"
                    type="checkbox"
                    checked={useGeoLocation}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setUseGeoLocation(checked);
                      if (checked) {
                        requestGeoLocation();
                      } else {
                        setGeoLocation(null);
                      }
                    }}
                  />
                  <label htmlFor="useGeoLocation" className="text-sm text-gray-700">
                    Use my current location
                  </label>
                  {geoLocation && (
                    <span className="text-xs text-green-600">Location active</span>
                  )}
                </div>
                {geoError && (
                  <div className="text-xs text-red-600 mt-1">{geoError}</div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condition
              </label>
              <select
                value={filters.condition}
                onChange={(e) => handleFilterChange('condition', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Any Condition</option>
                <option value="new">New</option>
                <option value="like-new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      {!loading && (
        <div className="mb-4 text-sm text-gray-600">
          Showing {Math.min((page - 1) * limit + 1, totalCount)}-
          {Math.min(page * limit, totalCount)} of {totalCount} item{totalCount !== 1 ? 's' : ''}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Items Grid/List */}
      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div className="card text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No items found</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
            }>
              {items.map(item => (
                <Link
                  key={item.id}
                  to={`/items/${item.id}`}
                  className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden ${
                    viewMode === 'list' ? 'flex' : ''
                  }`}
                >
                  <div className={viewMode === 'list' ? 'w-48 flex-shrink-0' : ''}>
                    <img
                      src={item.images[0] || '/placeholder-image.png'}
                      alt={item.title}
                      className={`w-full object-cover ${viewMode === 'list' ? 'h-full' : 'h-48'}`}
                    />
                  </div>
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                        {item.title}
                      </h3>
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getConditionBadgeColor(item.condition)}`}>
                        {item.condition}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {item.location.address.split(',')[0]}
                        {item.distanceKm !== undefined && (
                          <span className="ml-2 text-xs text-gray-400">• {item.distanceKm} km away</span>
                        )}
                      </div>
                      {item.category && (
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          {item.category}
                        </span>
                      )}
                    </div>
                    {item.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {!loading && !error && totalCount > limit && (
        <div className="mt-8 flex items-center justify-between">
          <button
            className="btn-secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <div className="text-sm text-gray-600">
            Page {page} of {Math.max(1, Math.ceil(totalCount / limit))}
          </div>
          <button
            className="btn-secondary"
            disabled={!hasMore && page * limit >= totalCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
