import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './features/auth/LoginPage';
import { VerifyPage } from './features/auth/VerifyPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { UsersPage } from './features/users/UsersPage';
import { UserDetailPage } from './features/users/UserDetailPage';
import { MembershipsPage } from './features/memberships/MembershipsPage';
import { MembershipDetailPage } from './features/memberships/MembershipDetailPage';
import { CataloguePage } from './features/catalogue/CataloguePage';
import { CategoriesPage } from './features/categories/CategoriesPage';
import { PortfoliosPage } from './features/portfolios/PortfoliosPage';
import { PortfolioReviewPage } from './features/portfolios/PortfolioReviewPage';
import { ArchivePage } from './features/archive/ArchivePage';
import { ArchiveReviewPage } from './features/archive/ArchiveReviewPage';
import { EventsPage } from './features/events/EventsPage';
import { EventDetailPage } from './features/events/EventDetailPage';
import { ComingSoon } from './features/common/ComingSoon';
import { NotFound } from './features/common/NotFound';

// Modules that are routed but not yet built — rendered via ComingSoon.
const PLACEHOLDER_ROUTES = [
  'products',
  'orders',
  'finance',
  'payouts',
  'collaborations',
  'reviews',
  'support',
  'app-content',
  'notifications',
  'analytics',
  'admin-users',
  'settings',
];

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public auth routes */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin/verify" element={<VerifyPage />} />

        {/* Protected admin shell */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:userId" element={<UserDetailPage />} />
          <Route path="memberships" element={<MembershipsPage />} />
          <Route path="memberships/:membershipId" element={<MembershipDetailPage />} />
          <Route path="catalogue" element={<CataloguePage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="portfolios" element={<PortfoliosPage />} />
          <Route path="portfolios/:portfolioId" element={<PortfolioReviewPage />} />
          <Route path="archive" element={<ArchivePage />} />
          <Route path="archive/:archiveId" element={<ArchiveReviewPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/:eventId" element={<EventDetailPage />} />
          {PLACEHOLDER_ROUTES.map((path) => (
            <Route key={path} path={path} element={<ComingSoon />} />
          ))}
        </Route>

        {/* Root + fallback */}
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
