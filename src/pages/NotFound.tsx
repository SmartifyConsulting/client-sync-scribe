import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Home, LifeBuoy } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <Logo size="lg" className="mx-auto mb-6" />
        <p className="text-7xl sm:text-8xl font-bold text-primary leading-none mb-2">
          404
        </p>
        <h1 className="page-title mb-3">
          {t('notFound.title')}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-8">
          {t('notFound.description')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="min-h-12">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              {t('notFound.backToHome')}
            </Link>
          </Button>
          <Button asChild variant="outline" className="min-h-12">
            <a href="mailto:support@holarchealth.com">
              <LifeBuoy className="h-4 w-4 mr-2" />
              {t('notFound.contactSupport')}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
