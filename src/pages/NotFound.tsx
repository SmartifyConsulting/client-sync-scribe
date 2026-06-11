// src/pages/NotFound.tsx
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <img src="/logo.png" alt="Holarc Health" className="h-10 mb-8" />
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold text-teal-700 mb-2">404</div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">Page not found</h1>
        <p className="text-gray-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-800 transition-colors"
          >
            Go to Dashboard
          </Link>
          <a
            href="mailto:support@holarchealth.com"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
