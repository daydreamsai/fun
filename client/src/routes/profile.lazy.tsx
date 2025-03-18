import { createLazyFileRoute } from "@tanstack/react-router";
import { UserProfile } from "@/components/UserProfile";

export const Route = createLazyFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      <UserProfile />
    </div>
  );
}
