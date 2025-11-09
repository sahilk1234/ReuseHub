import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Give Your Items a Second Life
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Join our community-based waste exchange network. Connect with neighbors,
            reduce waste, and earn eco-points while making a positive environmental impact.
          </p>
          <div className="flex justify-center space-x-4">
            <Link to="/register" className="btn-primary text-lg px-8 py-3">
              Get Started
            </Link>
            <Link to="/items" className="btn-secondary text-lg px-8 py-3">
              Browse Items
            </Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2">Post Items</h3>
            <p className="text-gray-600">
              Upload photos and descriptions of items you no longer need
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">🤝</div>
            <h3 className="text-xl font-semibold mb-2">Connect Locally</h3>
            <p className="text-gray-600">
              AI-powered matching connects you with nearby people who need your items
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">🌱</div>
            <h3 className="text-xl font-semibold mb-2">Earn Rewards</h3>
            <p className="text-gray-600">
              Gain eco-points, unlock achievements, and climb the community leaderboard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
