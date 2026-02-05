import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Auth0Provider } from './contexts/Auth0Provider';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Home from './pages/Home';
import Items from './pages/Items';
import ItemDetail from './pages/ItemDetail';
import PostItem from './pages/PostItem';
import Exchanges from './pages/Exchanges';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Auth0Callback from './pages/Auth0Callback';
import Points from './pages/Points';

function App() {
  return (
    <BrowserRouter>
      <Auth0Provider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="items" element={<Items />} />
              <Route path="items/:id" element={<ItemDetail />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="callback" element={<Auth0Callback />} />
            
            {/* Protected Routes */}
            <Route
              path="post-item"
              element={
                <ProtectedRoute requireVerified>
                  <PostItem />
                </ProtectedRoute>
              }
            />
            <Route
              path="exchanges"
              element={
                <ProtectedRoute>
                  <Exchanges />
                </ProtectedRoute>
              }
            />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="points"
              element={
                <ProtectedRoute>
                  <Points />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
      </Auth0Provider>
    </BrowserRouter>
  );
}

export default App;
