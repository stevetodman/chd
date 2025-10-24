import { useNavigate } from "react-router-dom";
import PageState from "../components/PageState";
import { Button } from "../components/ui/Button";
import { useSessionStore } from "../lib/auth";

export default function NotFound() {
  const navigate = useNavigate();
  const { session } = useSessionStore();
  const destination = session ? "/dashboard" : "/login";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <PageState
        title="Page not found"
        description="The page you were looking for doesn't exist or has moved."
        variant="empty"
        action={
          <Button type="button" onClick={() => navigate(destination)}>
            {session ? "Go to dashboard" : "Go to sign in"}
          </Button>
        }
      />
    </div>
  );
}
