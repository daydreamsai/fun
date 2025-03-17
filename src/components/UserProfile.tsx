import { useState } from "react";
import { useUser } from "../hooks/useUser";
import { UserUpdate } from "../store/userStore";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function UserProfile() {
  const { user, isLoading, error, updateUser, isConnectedUser } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserUpdate>({
    display_name: user?.display_name || "",
    email: user?.email || "",
    avatar_url: user?.avatar_url || "",
  });

  if (!user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>
            Connect your wallet to view your profile
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUser(formData);
    setIsEditing(false);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return user.id.slice(0, 2);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage
            src={user.avatar_url || undefined}
            alt={user.display_name || user.id}
          />
          <AvatarFallback>{getInitials(user.display_name)}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle>
            {user.display_name || user.id.slice(0, 10) + "..."}
          </CardTitle>
          <CardDescription className="break-all">{user.id}</CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        {isEditing && isConnectedUser ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                name="display_name"
                value={formData.display_name || ""}
                onChange={handleInputChange}
                placeholder="Enter your display name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email || ""}
                onChange={handleInputChange}
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar_url">Avatar URL</Label>
              <Input
                id="avatar_url"
                name="avatar_url"
                value={formData.avatar_url || ""}
                onChange={handleInputChange}
                placeholder="Enter avatar URL"
              />
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Display Name</p>
              <p>{user.display_name || "Not set"}</p>
            </div>

            <div>
              <p className="text-sm font-medium">Email</p>
              <p>{user.email || "Not set"}</p>
            </div>

            <div>
              <p className="text-sm font-medium">Last Login</p>
              <p>
                {user.last_login
                  ? new Date(user.last_login).toLocaleString()
                  : "Unknown"}
              </p>
            </div>
          </div>
        )}

        {error && <p className="text-red-500 mt-4">{error}</p>}
      </CardContent>

      {isConnectedUser && (
        <CardFooter className="flex justify-end gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
