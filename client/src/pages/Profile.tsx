import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const { user, updateProfile, isLoading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    address: '',
    latitude: 0,
    longitude: 0,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        phone: '',
        address: user.location?.address || '',
        latitude: user.location?.latitude || 0,
        longitude: user.location?.longitude || 0,
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
          }));
          setSuccess('Location updated successfully');
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Failed to get your location. Please enter your address manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const validateForm = (): boolean => {
    if (!formData.displayName.trim()) {
      setError('Display name is required');
      return false;
    }
    if (formData.displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters');
      return false;
    }
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(formData.phone)) {
        setError('Please enter a valid phone number');
        return false;
      }
    }
    if (!formData.address.trim()) {
      setError('Location is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validateForm()) {
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({
        displayName: formData.displayName,
        location: {
          latitude: formData.latitude,
          longitude: formData.longitude,
          address: formData.address,
        },
      });
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        phone: '',
        address: user.location?.address || '',
        latitude: user.location?.latitude || 0,
        longitude: user.location?.longitude || 0,
      });
    }
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="btn-primary">
              Edit Profile
            </button>
          )}
        </div>
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}
        <div className="card">
          <div className="flex items-center space-x-4 pb-6 border-b border-gray-200">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-2xl font-bold">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-gray-900">{user.displayName}</h2>
              <p className="text-gray-600">{user.email}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                  {user.accountType === 'individual' ? '👤 Individual' : '🏢 Organization'}
                </span>
                {user.isVerified ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    ✓ Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    ⚠ Not Verified
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6 border-b border-gray-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">{user.ecoPoints}</div>
              <div className="text-sm text-gray-600 mt-1">Eco-Points</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">{user.totalExchanges}</div>
              <div className="text-sm text-gray-600 mt-1">Total Exchanges</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">
                {user.rating > 0 ? user.rating.toFixed(1) : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 mt-1">Rating</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="pt-6 space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input id="email" type="email" value={user.email} disabled className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" />
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
            </div>
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">Display Name *</label>
              <input id="displayName" name="displayName" type="text" required value={formData.displayName} onChange={handleChange} disabled={!isEditing || isSaving} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500" />
            </div>
            <div>
              <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
              <input id="accountType" type="text" value={user.accountType === 'individual' ? 'Individual' : 'Organization'} disabled className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" />
              <p className="mt-1 text-xs text-gray-500">Account type cannot be changed</p>
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
              <div className="space-y-2">
                <input id="address" name="address" type="text" required value={formData.address} onChange={handleChange} disabled={!isEditing || isSaving} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500" placeholder="123 Main St, City, State" />
                {isEditing && (
                  <button type="button" onClick={handleGetLocation} disabled={isSaving} className="w-full btn-secondary text-sm disabled:opacity-50">
                    📍 Update to Current Location
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">Your location helps us connect you with nearby users</p>
            </div>
            {isEditing && (
              <div className="flex space-x-4 pt-4">
                <button type="submit" disabled={isSaving} className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={handleCancel} disabled={isSaving} className="flex-1 btn-secondary disabled:opacity-50">
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>
        {!user.isVerified && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">📧 Verify Your Email</h3>
            <p className="text-gray-700 mb-4">Please check your email inbox for a verification link. Verifying your email helps build trust in the community.</p>
            <button className="btn-primary text-sm">Resend Verification Email</button>
          </div>
        )}
      </div>
    </div>
  );
}
