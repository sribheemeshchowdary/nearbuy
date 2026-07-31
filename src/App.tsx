import { useState, useEffect, useCallback, lazy, Suspense, type ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SearchProvider } from "@/contexts/SearchContext";
import Header from "@/components/Header";
import ScrollToTop from "@/components/ScrollToTop";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import PageLoader from "@/components/PageLoader";
import ErrorBoundary from "@/components/ErrorBoundary";
import AutoPageReload from "@/components/AutoPageReload";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";

/**
 * A live deployment can replace hashed route chunks while someone still has
 * the previous app open. Recover once by reloading the current URL so the
 * browser receives the new index and matching chunks.
 */
const lazyWithRefresh = <T extends ComponentType>(
  importer: () => Promise<{ default: T }>,
  routeKey: string,
) => lazy(async () => {
  const retryKey = `nearbuy_lazy_retry:${routeKey}`;
  try {
    const module = await importer();
    sessionStorage.removeItem(retryKey);
    return module;
  } catch (error) {
    if (!sessionStorage.getItem(retryKey)) {
      sessionStorage.setItem(retryKey, "1");
      window.location.reload();
      return new Promise<never>(() => {});
    }
    sessionStorage.removeItem(retryKey);
    throw error;
  }
});

// Home stays eager for an instant landing; everything else is code-split
// so the initial bundle stays small and the app opens fast.
import Index from "./pages/Index";
const AddListing = lazyWithRefresh(() => import("./pages/AddListing"), "add-listing");
const Admin = lazyWithRefresh(() => import("./pages/Admin"), "admin");
const BusinessDashboard = lazyWithRefresh(() => import("./pages/BusinessDashboard"), "dashboard");
const BusinessDetail = lazyWithRefresh(() => import("./pages/BusinessDetail"), "business-detail");
const CityCategory = lazyWithRefresh(() => import("./pages/CityCategory"), "city-category");
const NotFound = lazyWithRefresh(() => import("./pages/NotFound"), "not-found");
const GenerateSitemap = lazyWithRefresh(() => import("./pages/GenerateSitemap"), "sitemap");
const SignUp = lazyWithRefresh(() => import("./pages/SignUp"), "signup");
const About = lazyWithRefresh(() => import("./pages/About"), "about");
const Contact = lazyWithRefresh(() => import("./pages/Contact"), "contact");
const Terms = lazyWithRefresh(() => import("./pages/Terms"), "terms");
const Privacy = lazyWithRefresh(() => import("./pages/Privacy"), "privacy");

const queryClient = new QueryClient();
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "");
const AppContent = () => {
  const location = useLocation();
  useSmoothScroll();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isAdminPage = location.pathname === "/admin";
  const isDashboardPage = location.pathname === "/dashboard";
  const isSignupPage = ["/signup", "/login"].includes(location.pathname);
  const isAddListingPage = location.pathname === "/add-listing";
  const hideHeader = isAdminPage || isDashboardPage || isSignupPage || isAddListingPage || (location.pathname === "/" && isMobile);
  const hideFooter = isAdminPage || isDashboardPage || ["/signup", "/login"].includes(location.pathname) || (location.pathname === "/" && isMobile);
  const [showMap, setShowMap] = useState(false);
  const [detectLocationFn, setDetectLocationFn] = useState<(() => void) | null>(null);

  const registerDetectLocation = useCallback((fn: () => void) => {
    setDetectLocationFn(() => fn);
  }, []);

  return (
    <>
      {/* One global, self-cleaning refresh cycle covers every router page. */}
      <AutoPageReload />
      <ScrollToTop />
      {!hideHeader && (
        <Header
          showMap={showMap}
          onToggleMap={() => setShowMap(prev => !prev)}
          onDetectLocation={detectLocationFn ?? undefined}
        />
      )}
      <AnimatePresence mode="wait">
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={
            <PageTransition>
              <Index
                showMap={showMap}
                setShowMap={setShowMap}
                registerDetectLocation={registerDetectLocation}
              />
            </PageTransition>
          } />
          <Route path="/:areaSlug/:categorySlug/:businessSlug" element={<PageTransition><BusinessDetail /></PageTransition>} />
          <Route path="/add-listing" element={<PageTransition><AddListing /></PageTransition>} />
          <Route path="/dashboard" element={<PageTransition><BusinessDashboard /></PageTransition>} />
          <Route path="/admin" element={<PageTransition><Admin /></PageTransition>} />

          <Route path="/login" element={<PageTransition><SignUp /></PageTransition>} />
          <Route path="/signup" element={<PageTransition><SignUp /></PageTransition>} />
          <Route path="/about" element={<PageTransition><About /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
          <Route path="/generate-sitemap" element={<PageTransition><GenerateSitemap /></PageTransition>} />
          <Route path="/:citySlug" element={<PageTransition><CityCategory /></PageTransition>} />
          <Route path="/:citySlug/:categorySlug" element={<PageTransition><CityCategory /></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </AnimatePresence>
      {!hideFooter && <Footer />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={routerBasename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <SearchProvider>
            <AppContent />
          </SearchProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
