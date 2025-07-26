import { useState } from "react";
import { useUser } from "../hooks/use-user";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { BuyCredits } from "./buy-credits";
import { CreditCard } from "lucide-react";

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
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-8">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        {/* <TabsTrigger value="credits">Credits</TabsTrigger> */}
      </TabsList>

      <TabsContent value="profile">
        <Card className="w-full mx-auto">
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
              <div className="flex items-center mt-2 text-sm">
                <CreditCard className="h-4 w-4 mr-1" />
                <span>{user.credits || 0} credits</span>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="mb-6 p-4 bg-primary/10 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-primary" />
                <span className="font-medium">Available Credits</span>
              </div>
              <span className="text-xl font-bold">{user.credits || 0}</span>
            </div>

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

            {error && <p className="text-destructive mt-4">{error}</p>}
          </CardContent>

          {isConnectedUser && (
            <CardFooter className="flex justify-end gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
              )}
            </CardFooter>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="credits">
        <Card>
          <CardContent className="pt-6">
            <BuyCredits />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
