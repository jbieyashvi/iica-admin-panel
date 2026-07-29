import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './features/auth/LoginPage';
import { VerifyPage } from './features/auth/VerifyPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { UsersPage } from './features/users/UsersPage';
import { UserDetailPage } from './features/users/UserDetailPage';
import { CataloguePage } from './features/catalogue/CataloguePage';
import { CategoriesPage } from './features/categories/CategoriesPage';
import { PortfoliosPage } from './features/portfolios/PortfoliosPage';
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
import { BannersPage } from './features/appcontent/BannersPage';
import { ComingSoon } from './features/common/ComingSoon';
import { NotFound } from './features/common/NotFound';

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
          <Route path="catalogue" element={<CataloguePage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="portfolios" element={<PortfoliosPage />} />
          <Route path="portfolios/:portfolioId" element={<PortfolioReviewPage />} />
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
          <Route path="collaborations" element={<CollaborationsPage />} />
          <Route path="collaborations/:collaborationId" element={<CollaborationDetailPage />} />
          <Route path="collaboration-settings" element={<CollaborationSettingsPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="reviews-testimonials" element={<Navigate to="/admin/reviews" replace />} />
          <Route path="content-management" element={<BannersPage />} />
          <Route path="app-content" element={<Navigate to="/admin/content-management" replace />} />
          <Route path="settings" element={<ComingSoon />} />

          {/* Retired modules — safely redirect old URLs to Users */}
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
