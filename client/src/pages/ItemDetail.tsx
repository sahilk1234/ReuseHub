import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

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
  dimensions?: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  pickupInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

interface ItemOwner {
  id: string;
  displayName: string;
  avatar?: string;
  rating: number;
  totalExchanges: number;
  isVerified: boolean;
}

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [item, setItem] = useState<Item | null>(null);
  const [owner, setOwner] = useState<ItemOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [interestMessage, setInterestMessage] = useState("");
  const [submittingInterest, setSubmittingInterest] = useState(false);

  useEffect(() => {
    if (id) {
      fetchItemDetails();
    }
  }, [id]);

  const fetchItemDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/items/${id}`);

      if (!response.ok) {
        throw new Error("Item not found");
      }

      const data = await response.json();
      setItem(data.data);

      // Fetch owner details
      const ownerResponse = await fetch(`${API_URL}/users/${data.data.userId}`);
      if (ownerResponse.ok) {
        const ownerData = await ownerResponse.json();
        setOwner(ownerData.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load item details");
    } finally {
      setLoading(false);
    }
  };

  const handleExpressInterest = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/items/${id}` } });
      return;
    }

    setSubmittingInterest(true);

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/exchanges`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: id,
          message: interestMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to express interest"
        );
      }

      setShowInterestModal(false);
      setInterestMessage("");
      alert("Interest expressed successfully! The owner will be notified.");
    } catch (err: any) {
      alert(err.message || "Failed to express interest");
    } finally {
      setSubmittingInterest(false);
    }
  };

  const getConditionBadgeColor = (condition: string) => {
    switch (condition) {
      case "new":
        return "bg-green-100 text-green-800";
      case "like-new":
        return "bg-blue-100 text-blue-800";
      case "good":
        return "bg-yellow-100 text-yellow-800";
      case "fair":
        return "bg-orange-100 text-orange-800";
      case "poor":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "exchanged":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card bg-red-50 border border-red-200 text-red-700">
          {error || "Item not found"}
        </div>
        <Link
          to="/items"
          className="mt-4 inline-block text-primary-600 hover:text-primary-700"
        >
          ← Back to items
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === item.userId;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <Link to="/items" className="text-primary-600 hover:text-primary-700">
          ← Back to items
        </Link>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div>
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
            <img
              src={item.images[selectedImage] || "/placeholder-image.png"}
              alt={item.title}
              className="w-full h-96 object-cover"
            />
          </div>

          {item.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {item.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === index
                      ? "border-primary-600"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${item.title} ${index + 1}`}
                    className="w-full h-20 object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Item Details */}
        <div>
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {item.title}
                </h1>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${getConditionBadgeColor(
                      item.condition
                    )}`}
                  >
                    {item.condition}
                  </span>
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadgeColor(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Category and Tags */}
            {(item.category || item.tags.length > 0) && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                {item.category && (
                  <div className="mb-2">
                    <span className="text-sm text-gray-600">Category: </span>
                    <span className="text-sm font-medium text-gray-900">
                      {item.category}
                    </span>
                  </div>
                )}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Description
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {item.description}
              </p>
            </div>

            {/* Dimensions */}
            {item.dimensions && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Dimensions
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Size: </span>
                    <span className="text-gray-900">
                      {item.dimensions.length} × {item.dimensions.width} ×{" "}
                      {item.dimensions.height} cm
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Weight: </span>
                    <span className="text-gray-900">
                      {item.dimensions.weight} kg
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Location */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Location
              </h2>
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-gray-400 mr-2 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-gray-700">{item.location.address}</span>
              </div>
            </div>

            {/* Pickup Instructions */}
            {item.pickupInstructions && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Pickup Instructions
                </h2>
                <p className="text-gray-700">{item.pickupInstructions}</p>
              </div>
            )}

            {/* Owner Info */}
            {owner && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Posted by
                </h2>
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-lg">
                    {owner.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">
                        {owner.displayName}
                      </span>
                      {owner.isVerified && (
                        <svg
                          className="w-5 h-5 text-primary-600 ml-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="flex items-center">
                        <svg
                          className="w-4 h-4 text-yellow-400 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {typeof owner.rating === "number"
                          ? owner.rating.toFixed(1)
                          : ""}
                      </span>
                      <span className="mx-2">•</span>
                      <span>{owner.totalExchanges} exchanges</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!isOwner && item.status === "available" && (
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowInterestModal(true)}
                  className="flex-1 btn-primary"
                >
                  Express Interest
                </button>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="flex-1 btn-secondary"
                >
                  Contact Owner
                </button>
              </div>
            )}

            {isOwner && (
              <div className="flex space-x-3">
                <Link
                  to={`/items/${id}/edit`}
                  className="flex-1 btn-secondary text-center"
                >
                  Edit Item
                </Link>
                <button className="flex-1 btn-primary">Manage Requests</button>
              </div>
            )}

            {item.status !== "available" && !isOwner && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-gray-600">
                  This item is no longer available
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interest Modal */}
      {showInterestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Express Interest
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Send a message to the owner to express your interest in this item.
            </p>
            <textarea
              value={interestMessage}
              onChange={(e) => setInterestMessage(e.target.value)}
              placeholder="Hi, I'm interested in this item..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-4"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setShowInterestModal(false)}
                className="flex-1 btn-secondary"
                disabled={submittingInterest}
              >
                Cancel
              </button>
              <button
                onClick={handleExpressInterest}
                className="flex-1 btn-primary"
                disabled={submittingInterest}
              >
                {submittingInterest ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && owner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Contact Owner
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Owner:</p>
              <p className="font-medium text-gray-900">{owner.displayName}</p>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              To protect user privacy, please use the "Express Interest" feature
              to initiate contact. The owner will be notified and can respond
              through the platform.
            </p>
            <button
              onClick={() => setShowContactModal(false)}
              className="w-full btn-primary"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
