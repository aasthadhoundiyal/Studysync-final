import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';


// Route Guards
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import GuestRoute from '@/components/auth/GuestRoute';

// Layouts
import AppLayout from '@/components/layout/AppLayout';
import AuthLayout from '@/components/layout/AuthLayout';

// Pages
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import CreatePostPage from '@/pages/CreatePostPage';
import SearchPage from '@/pages/SearchPage';
import NotificationsPage from '@/pages/NotificationsPage';
import ProfilePage from '@/pages/ProfilePage';
import SavedPostsPage from '@/pages/SavedPostsPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import PostDetailPage from '@/pages/PostDetailPage';
import AppealsPage from '@/pages/AppealsPage';
import NotFoundPage from '@/pages/NotFoundPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
          {/* Main Application Shell Routes */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/explore" element={<Navigate to="/search" replace />} />
            <Route path="/posts/:id" element={<PostDetailPage />} />
            <Route path="/users/:identifier" element={<ProfilePage />} />

            {/* Authenticated User Routes */}
            <Route
              path="/create"
              element={
                <ProtectedRoute>
                  <CreatePostPage />
                </ProtectedRoute>
              }
            />
            <Route path="/create-post" element={<Navigate to="/create" replace />} />

            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/saved"
              element={
                <ProtectedRoute>
                  <SavedPostsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/bookmarks" element={<Navigate to="/saved" replace />} />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/profile/:identifier" element={<ProfilePage />} />

            <Route
              path="/appeals"
              element={
                <ProtectedRoute>
                  <AppealsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin-only Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/moderation" element={<Navigate to="/admin" replace />} />
            <Route path="/admin/appeals" element={<Navigate to="/admin" replace />} />

            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Authentication Pages (Public Only) */}
          <Route element={<AuthLayout />}>
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              }
            />
            <Route
              path="/register"
              element={
                <GuestRoute>
                  <RegisterPage />
                </GuestRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
  );
}

export default App;
