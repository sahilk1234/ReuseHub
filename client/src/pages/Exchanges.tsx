import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Exchange {
  id: string;
  itemId: string;
  giverId: string;
  receiverId: string;
  status: 'requested' | 'accepted' | 'completed' | 'cancelled';
  scheduledPickup?: string;
  completedAt?: string;
  giverConfirmedAt?: string;
  receiverConfirmedAt?: string;
  giverRating?: {
    value: number;
    review?: string;
  };
  receiverRating?: {
    value: number;
    review?: string;
  };
  ecoPointsAwarded: number;
  createdAt: string;
  updatedAt: string;
}

interface ExchangeWithDetails extends Exchange {
  item?: {
    id: string;
    title: string;
    images: string[];
    category: string;
  };
  giver?: {
    id: string;
    displayName: string;
    avatar?: string;
    rating: number;
  };
  receiver?: {
    id: string;
    displayName: string;
    avatar?: string;
    rating: number;
  };
}

type TabType = 'active' | 'history' | 'unrated';

export default function Exchanges() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [exchanges, setExchanges] = useState<ExchangeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<ExchangeWithDetails | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [scheduledPickup, setScheduledPickup] = useState('');
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExchanges();
  }, [activeTab]);

  const fetchExchanges = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      let endpoint = '';

      switch (activeTab) {
        case 'active':
          endpoint = '/exchanges/active';
          break;
        case 'history':
          endpoint = '/exchanges/history';
          break;
        case 'unrated':
          endpoint = '/exchanges/unrated';
          break;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch exchanges');
      }

      const data = await response.json();
      const exchangesList = data.data.exchanges || [];

      // Fetch additional details for each exchange
      const exchangesWithDetails = await Promise.all(
        exchangesList.map(async (exchange: Exchange) => {
          const details: ExchangeWithDetails = { ...exchange };

          // Fetch item details
          try {
            const itemResponse = await fetch(`${API_URL}/items/${exchange.itemId}`);
            if (itemResponse.ok) {
              const itemData = await itemResponse.json();
              details.item = {
                id: itemData.data.id,
                title: itemData.data.title,
                images: itemData.data.images,
                category: itemData.data.category,
              };
            }
          } catch (err) {
            console.error('Failed to fetch item details:', err);
          }

          // Fetch giver details
          try {
            const giverResponse = await fetch(`${API_URL}/users/${exchange.giverId}`);
            if (giverResponse.ok) {
              const giverData = await giverResponse.json();
              details.giver = {
                id: giverData.data.id,
                displayName: giverData.data.displayName,
                avatar: giverData.data.avatar,
                rating: giverData.data.rating,
              };
            }
          } catch (err) {
            console.error('Failed to fetch giver details:', err);
          }

          // Fetch receiver details
          try {
            const receiverResponse = await fetch(`${API_URL}/users/${exchange.receiverId}`);
            if (receiverResponse.ok) {
              const receiverData = await receiverResponse.json();
              details.receiver = {
                id: receiverData.data.id,
                displayName: receiverData.data.displayName,
                avatar: receiverData.data.avatar,
                rating: receiverData.data.rating,
              };
            }
          } catch (err) {
            console.error('Failed to fetch receiver details:', err);
          }

          return details;
        })
      );

      setExchanges(exchangesWithDetails);
    } catch (err: any) {
      setError(err.message || 'Failed to load exchanges');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptExchange = async () => {
    if (!selectedExchange) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/exchanges/${selectedExchange.id}/accept`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduledPickup: scheduledPickup || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to accept exchange');
      }

      setShowAcceptModal(false);
      setScheduledPickup('');
      setSelectedExchange(null);
      fetchExchanges();
      alert('Exchange accepted successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to accept exchange');
    } finally {
      setSubmitting(false);
    }
  };

  const toLocalInputValue = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const setQuickPickup = (type: 'today-pm' | 'tomorrow-am' | 'weekend') => {
    const now = new Date();
    let target = new Date(now);

    if (type === 'today-pm') {
      target.setHours(17, 0, 0, 0);
      if (target < now) {
        target.setDate(target.getDate() + 1);
      }
    } else if (type === 'tomorrow-am') {
      target.setDate(target.getDate() + 1);
      target.setHours(10, 0, 0, 0);
    } else {
      const day = target.getDay(); // 0=Sun
      const daysUntilSat = (6 - day + 7) % 7 || 7;
      target.setDate(target.getDate() + daysUntilSat);
      target.setHours(10, 0, 0, 0);
    }

    setScheduledPickup(toLocalInputValue(target));
  };

  const handleCompleteExchange = async () => {
    if (!selectedExchange) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/exchanges/${selectedExchange.id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ecoPointsAwarded: 10, // Default points
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to complete exchange');
      }

      const data = await response.json();
      setShowCompleteModal(false);
      setSelectedExchange(null);
      fetchExchanges();
      alert(data.message || (data.data?.completed
        ? 'Exchange completed successfully! Eco-points have been awarded.'
        : 'Confirmation recorded. Waiting for the other participant.'));
    } catch (err: any) {
      alert(err.message || 'Failed to complete exchange');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRateExchange = async () => {
    if (!selectedExchange) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/exchanges/${selectedExchange.id}/rate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          review: review || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to rate exchange');
      }

      setShowRatingModal(false);
      setRating(5);
      setReview('');
      setSelectedExchange(null);
      fetchExchanges();
      alert('Rating submitted successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelExchange = async () => {
    if (!selectedExchange) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/exchanges/${selectedExchange.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: cancelReason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to cancel exchange');
      }

      setShowCancelModal(false);
      setCancelReason('');
      setSelectedExchange(null);
      fetchExchanges();
      alert('Exchange cancelled successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to cancel exchange');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'requested':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isGiver = (exchange: Exchange) => user?.id === exchange.giverId;
  const isReceiver = (exchange: Exchange) => user?.id === exchange.receiverId;

  const canAccept = (exchange: Exchange) => 
    isGiver(exchange) && exchange.status === 'requested';

  const canComplete = (exchange: Exchange) => 
    (isGiver(exchange) || isReceiver(exchange)) && exchange.status === 'accepted';

  const canCancel = (exchange: Exchange) => 
    (isGiver(exchange) || isReceiver(exchange)) && 
    (exchange.status === 'requested' || exchange.status === 'accepted');

  const renderExchangeCard = (exchange: ExchangeWithDetails) => {
    const otherUser = isGiver(exchange) ? exchange.receiver : exchange.giver;
    const role = isGiver(exchange) ? 'Giving' : 'Receiving';

    return (
      <div key={exchange.id} className="card hover:shadow-lg transition-shadow">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Item Image */}
          {exchange.item && (
            <Link to={`/items/${exchange.itemId}`} className="flex-shrink-0">
              <img
                src={exchange.item.images[0] || '/placeholder-image.png'}
                alt={exchange.item.title}
                className="w-full md:w-32 h-32 object-cover rounded-lg"
              />
            </Link>
          )}

          {/* Exchange Details */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <Link 
                  to={`/items/${exchange.itemId}`}
                  className="text-lg font-semibold text-gray-900 hover:text-primary-600"
                >
                  {exchange.item?.title || 'Item'}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(exchange.status)}`}>
                    {exchange.status}
                  </span>
                  <span className="text-sm text-gray-600">{role}</span>
                </div>
              </div>
            </div>

            {/* Other User Info */}
            {otherUser && (
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-sm">
                  {otherUser.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="ml-2">
                  <p className="text-sm font-medium text-gray-900">{otherUser.displayName}</p>
                  <div className="flex items-center text-xs text-gray-600">
                    <svg className="w-3 h-3 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {otherUser.rating.toFixed(1)}
                  </div>
                </div>
              </div>
            )}

            {/* Scheduled Pickup */}
            {exchange.scheduledPickup && (
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Scheduled:</span>{' '}
                {new Date(exchange.scheduledPickup).toLocaleString()}
              </p>
            )}

            {/* Handoff Confirmation */}
            {exchange.status === 'accepted' && (
              <div className="text-xs text-gray-600 mb-2">
                <div>
                  <span className="font-medium">Your confirmation:</span>{' '}
                  {isGiver(exchange)
                    ? (exchange.giverConfirmedAt ? 'Confirmed' : 'Pending')
                    : (exchange.receiverConfirmedAt ? 'Confirmed' : 'Pending')}
                </div>
                <div>
                  <span className="font-medium">Other party:</span>{' '}
                  {isGiver(exchange)
                    ? (exchange.receiverConfirmedAt ? 'Confirmed' : 'Pending')
                    : (exchange.giverConfirmedAt ? 'Confirmed' : 'Pending')}
                </div>
              </div>
            )}

            {/* Completed Info */}
            {exchange.status === 'completed' && (
              <div className="text-sm text-gray-600 mb-2">
                <p>
                  <span className="font-medium">Completed:</span>{' '}
                  {exchange.completedAt ? new Date(exchange.completedAt).toLocaleDateString() : 'N/A'}
                </p>
                {exchange.ecoPointsAwarded > 0 && (
                  <p className="text-green-600 font-medium">
                    +{exchange.ecoPointsAwarded} Eco-Points Earned
                  </p>
                )}
              </div>
            )}

            {/* Ratings Display */}
            {exchange.status === 'completed' && (
              <div className="mt-2 space-y-1">
                {isGiver(exchange) && exchange.receiverRating && (
                  <div className="text-sm">
                    <span className="text-gray-600">Your rating: </span>
                    <span className="text-yellow-600 font-medium">
                      {'★'.repeat(exchange.receiverRating.value)}
                    </span>
                    {exchange.receiverRating.review && (
                      <p className="text-gray-600 text-xs mt-1 italic">"{exchange.receiverRating.review}"</p>
                    )}
                  </div>
                )}
                {isReceiver(exchange) && exchange.giverRating && (
                  <div className="text-sm">
                    <span className="text-gray-600">Your rating: </span>
                    <span className="text-yellow-600 font-medium">
                      {'★'.repeat(exchange.giverRating.value)}
                    </span>
                    {exchange.giverRating.review && (
                      <p className="text-gray-600 text-xs mt-1 italic">"{exchange.giverRating.review}"</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              {canAccept(exchange) && (
                <button
                  onClick={() => {
                    setSelectedExchange(exchange);
                    setShowAcceptModal(true);
                  }}
                  className="btn-primary text-sm py-1 px-3"
                >
                  Accept
                </button>
              )}
              {canComplete(exchange) && (
                <button
                  onClick={() => {
                    setSelectedExchange(exchange);
                    setShowCompleteModal(true);
                  }}
                  className="btn-primary text-sm py-1 px-3"
                >
                  Mark Complete
                </button>
              )}
              {activeTab === 'unrated' && exchange.status === 'completed' && (
                <button
                  onClick={() => {
                    setSelectedExchange(exchange);
                    setShowRatingModal(true);
                  }}
                  className="btn-primary text-sm py-1 px-3"
                >
                  Rate Exchange
                </button>
              )}
              {canCancel(exchange) && (
                <button
                  onClick={() => {
                    setSelectedExchange(exchange);
                    setShowCancelModal(true);
                  }}
                  className="btn-secondary text-sm py-1 px-3"
                >
                  Cancel
                </button>
              )}
              <Link
                to={`/items/${exchange.itemId}`}
                className="btn-secondary text-sm py-1 px-3"
              >
                View Item
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Exchanges</h1>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active Exchanges
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('unrated')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'unrated'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Ratings
          </button>
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="card bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      ) : exchanges.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No exchanges found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'active' && "You don't have any active exchanges."}
            {activeTab === 'history' && "You haven't completed any exchanges yet."}
            {activeTab === 'unrated' && "You don't have any exchanges to rate."}
          </p>
          <div className="mt-6">
            <Link to="/items" className="btn-primary">
              Browse Items
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {exchanges.map(renderExchangeCard)}
        </div>
      )}

      {/* Accept Modal */}
      {showAcceptModal && selectedExchange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Accept Exchange Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              Accept the exchange request for "{selectedExchange.item?.title}". You can optionally schedule a pickup time.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scheduled Pickup (Optional)
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  className="px-3 py-1 text-xs rounded-full border border-gray-300 hover:bg-gray-50"
                  onClick={() => setQuickPickup('today-pm')}
                >
                  Today PM
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-xs rounded-full border border-gray-300 hover:bg-gray-50"
                  onClick={() => setQuickPickup('tomorrow-am')}
                >
                  Tomorrow AM
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-xs rounded-full border border-gray-300 hover:bg-gray-50"
                  onClick={() => setQuickPickup('weekend')}
                >
                  Weekend
                </button>
              </div>
              <input
                type="datetime-local"
                value={scheduledPickup}
                onChange={(e) => setScheduledPickup(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAcceptModal(false);
                  setScheduledPickup('');
                  setSelectedExchange(null);
                }}
                className="flex-1 btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptExchange}
                className="flex-1 btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Accepting...' : 'Accept'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && selectedExchange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Confirm Handoff</h3>
            <p className="text-sm text-gray-600 mb-4">
              Confirm that the handoff happened. The exchange completes once both people confirm.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800">
                <span className="font-medium">Eco-Points:</span> You'll earn points once both confirmations are in.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setSelectedExchange(null);
                }}
                className="flex-1 btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteExchange}
                className="flex-1 btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Confirming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedExchange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Rate Exchange</h3>
            <p className="text-sm text-gray-600 mb-4">
              How was your experience with this exchange?
            </p>
            
            {/* Star Rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <svg
                      className={`w-8 h-8 ${
                        star <= rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Review */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review (Optional)
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your experience..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setRating(5);
                  setReview('');
                  setSelectedExchange(null);
                }}
                className="flex-1 btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleRateExchange}
                className="flex-1 btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedExchange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Cancel Exchange</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to cancel this exchange?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for cancellation
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please provide a reason..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                  setSelectedExchange(null);
                }}
                className="flex-1 btn-secondary"
                disabled={submitting}
              >
                Keep Exchange
              </button>
              <button
                onClick={handleCancelExchange}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                disabled={submitting}
              >
                {submitting ? 'Cancelling...' : 'Cancel Exchange'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
