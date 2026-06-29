import { Link } from "@tanstack/react-router";
import { Button } from "../../components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">The page you are looking for is not available.</p>
        <Button className="mt-6" variant="primary">
          <Link to="/workspace/machines">Back to workspace</Link>
        </Button>
      </div>
    </div>
  );
}
