import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, LifeBuoy } from "lucide-react";
import holarcLogoAsset from "@/assets/holarc-health-logo.png.asset.json";
const holarcLogo = holarcLogoAsset.url;

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <img
          src={holarcLogo}
          alt="Holarc Health"
          className="mx-auto h-14 w-auto mb-6"
        />
        <p className="text-7xl sm:text-8xl font-bold text-primary leading-none mb-2">
          404
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">
          Page not found
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has moved. Let's get you
          back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="min-h-12">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="min-h-12">
            <a href="mailto:support@holarchealth.com">
              <LifeBuoy className="h-4 w-4 mr-2" />
              Contact Support
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
