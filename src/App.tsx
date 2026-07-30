import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { UsersPage } from './features/users/UsersPage';
import { UserDetailPage } from './features/users/UserDetailPage';
import { CategoriesPage } from './features/categories/CategoriesPage';
import { PortfolioReviewPage } from './features/portfolios/PortfolioReviewPage';
import { ArchivePage } from './features/archive/ArchivePage';
import { EventsPage } from './features/events/EventsPage';
import { EventDetailPage } from './features/events/EventDetailPage';
import { ProductsPage } from './features/products/ProductsPage';
import { ProductDetailPage } from './features/products/ProductDetailPage';
import { OrdersPage } from './features/orders/OrdersPage';
import { OrderDetailPage } from './features/orders/OrderDetailPage';
import { CollaborationsPage } from './features/collaborations/CollaborationsPage';
import { CollaborationDetailPage } from './features/collaborations/CollaborationDetailPage';
import { CollaborationSettingsPage } from './features/collaborations/CollaborationSettingsPage';
import { ReviewsPage } from './features/reviews/ReviewsPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';
import { TransactionDetailPage } from './features/transactions/TransactionDetailPage';
import { CommissionsPayoutsPage } from './features/commissions/CommissionsPayoutsPage';
import { PayoutDetailPage } from './features/commissions/PayoutDetailPage';
import { BannersPage } from './features/appcontent/BannersPage';
import { AdminUsersPage } from './features/adminusers/AdminUsersPage';
import { AdminUserDetailPage } from './features/adminusers/AdminUserDetailPage';
import { NotFound } from './features/common/NotFound';
import { useAuth } from './context/AuthContext';
import { useParams, useLocation, useSearchParams } from 'react-router-dom';

// Old Settings route: Super Admin → Admin Users, everyone else → Dashboard.
function SettingsRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'super_admin' ? '/admin/admin-users' : '/admin/dashboard'} replace />;
}

// Old merged-module list route → Users (catalogue/portfolios tabs → creator filter).
function UsersProfilesRedirect() {
  const [sp] = useSearchParams();
  const tab = sp.get('tab');
  const to = tab === 'catalogue' || tab === 'portfolios' ? '/admin/users?accountType=creator' : '/admin/users';
  return <Navigate to={to} replace />;
}

// Old detail routes → the connected Users detail / read-only portfolio.
function DetailRedirect({ kind, param }: { kind: 'user' | 'portfolio'; param: 'userId' | 'portfolioId' }) {
  const p = useParams();
  const { search } = useLocation();
  const base = kind === 'user' ? '/admin/users' : '/admin/portfolios';
  return <Navigate to={`${base}/${p[param]}${search}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public auth routes */}
        <Route path="/admin/login" element={<LoginPage />} />
        {/* OTP removed — old verify URL now returns to login. */}
        <Route path="/admin/verify" element={<Navigate to="/admin/login" replace />} />

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
          {/* Users is the single user / profile module */}
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:userId" element={<UserDetailPage />} />
          {/* Read-only creator portfolio, opened from a User's Portfolio tab */}
          <Route path="portfolios/:portfolioId" element={<PortfolioReviewPage />} />

          {/* Old merged / separate routes → Users */}
          <Route path="users-profiles" element={<UsersProfilesRedirect />} />
          <Route path="users-profiles/user/:userId" element={<DetailRedirect kind="user" param="userId" />} />
          <Route path="users-profiles/portfolio/:portfolioId" element={<DetailRedirect kind="portfolio" param="portfolioId" />} />
          <Route path="users-profiles/catalogue/:portfolioId" element={<DetailRedirect kind="portfolio" param="portfolioId" />} />
          <Route path="catalogue" element={<Navigate to="/admin/users?accountType=creator" replace />} />
          <Route path="portfolios" element={<Navigate to="/admin/users?accountType=creator" replace />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="archive" element={<ArchivePage />} />
          <Route path="archive/:archiveId" element={<Navigate to="/admin/archive" replace />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/:eventId" element={<EventDetailPage />} />
          <Route path="event-categories" element={<Navigate to="/admin/events?tab=categories" replace />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:productId" element={<ProductDetailPage />} />
          <Route path="product-categories" element={<Navigate to="/admin/products?tab=categories" replace />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:orderId" element={<OrderDetailPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="transactions/:transactionId" element={<TransactionDetailPage />} />
          <Route path="commissions-payouts" element={<CommissionsPayoutsPage />} />
          <Route path="commissions-payouts/:payoutId" element={<PayoutDetailPage />} />
          <Route path="collaborations" element={<CollaborationsPage />} />
          <Route path="collaborations/:collaborationId" element={<CollaborationDetailPage />} />
          <Route path="collaboration-settings" element={<CollaborationSettingsPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="reviews-testimonials" element={<Navigate to="/admin/reviews" replace />} />
          <Route path="banners" element={<BannersPage />} />
          <Route path="content-management" element={<Navigate to="/admin/banners" replace />} />
          <Route path="app-content" element={<Navigate to="/admin/banners" replace />} />
          <Route path="admin-users" element={<AdminUsersPage />} />
          <Route path="admin-users/:adminId" element={<AdminUserDetailPage />} />
          <Route path="settings" element={<SettingsRedirect />} />

          {/* Retired modules — safely redirect old URLs */}
          <Route path="memberships" element={<Navigate to="/admin/users" replace />} />
          <Route path="memberships/:membershipId" element={<Navigate to="/admin/users" replace />} />
          <Route path="support" element={<Navigate to="/admin/users" replace />} />
          <Route path="audit-log" element={<Navigate to="/admin/users" replace />} />
        </Route>

        {/* Root + fallback */}
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
