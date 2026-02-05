import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface AchievementSummary {
  userId: string;
  ecoPoints: number;
  level: string;
  totalExchanges: number;
  itemsPosted: number;
  rating: number;
  unlockedBadges: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    ecoPointsReward: number;
    iconUrl?: string;
  }>;
  inProgressBadges: Array<{
    badge: {
      id: string;
      name: string;
      description: string;
      category: string;
      ecoPointsReward: number;
      iconUrl?: string;
    };
    progress: number;
  }>;
}

interface Transaction {
  points: number;
  reason: string;
  timestamp: string;
}

export default function Points() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AchievementSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('accessToken');
        const [achRes, txRes] = await Promise.all([
          fetch(`${API_URL}/points/achievements`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_URL}/points/transactions`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (!achRes.ok) throw new Error('Failed to load achievements');
        if (!txRes.ok) throw new Error('Failed to load transactions');

        const achData = await achRes.json();
        const txData = await txRes.json();
        setSummary(achData);
        setTransactions(txData.transactions || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load points data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="card bg-red-50 border border-red-200 text-red-700">
          {error || 'No data found'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Eco-Points</h1>
        <div className="text-sm text-gray-500">
          {user?.displayName || user?.email}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="text-sm text-gray-500">Eco-Points</div>
          <div className="text-2xl font-bold text-gray-900">{summary.ecoPoints}</div>
          <div className="text-xs text-gray-500 mt-1">Level: {summary.level}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Exchanges</div>
          <div className="text-2xl font-bold text-gray-900">{summary.totalExchanges}</div>
          <div className="text-xs text-gray-500 mt-1">Rating: {summary.rating}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Items Posted</div>
          <div className="text-2xl font-bold text-gray-900">{summary.itemsPosted}</div>
          <div className="text-xs text-gray-500 mt-1">Badges: {summary.unlockedBadges.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Unlocked Badges</h3>
          {summary.unlockedBadges.length === 0 ? (
            <div className="text-sm text-gray-500">No badges unlocked yet.</div>
          ) : (
            <div className="space-y-3">
              {summary.unlockedBadges.map((badge) => (
                <div key={badge.id} className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                    ★
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{badge.name}</div>
                    <div className="text-xs text-gray-500">{badge.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Transactions</h3>
          {transactions.length === 0 ? (
            <div className="text-sm text-gray-500">No transactions yet.</div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 10).map((tx, idx) => (
                <div key={`${tx.timestamp}-${idx}`} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="text-gray-900">{tx.reason}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(tx.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="font-semibold text-green-600">+{tx.points}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
