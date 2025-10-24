import { useNavigate } from "react-router-dom";
import PageState from "../components/PageState";
import { Button } from "../components/ui/Button";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <PageState
        title="We couldn’t find that page"
        description="The link you followed may be broken or the page may have been removed."
        variant="info"
        action={
          <Button onClick={() => navigate("/dashboard")}>Go back to your dashboard</Button>
        }
      />
    </div>
  );
}
