import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSettingsStore } from "@/store/settingsStore";
import {
  useAbstractClient,
  useLoginWithAbstract,
} from "@abstract-foundation/agw-react";
import { http } from "@daydreamsai/core";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useAccount } from "wagmi";

const API_BASE = "https://gigaverse.io/api";

function useGigaverseLogin() {
  const settings = useSettingsStore();
  const { data: abstractClient } = useAbstractClient();
  return useMutation({
    mutationKey: ["gigaverse:auth"],
    mutationFn: async ({ address }: { address: string }) => {
      const timestamp = Date.now();

      const message = `Login to Gigaverse at ${timestamp}`;
      const signature = await abstractClient!.signMessage({ message });

      const response = await http.post.json<{ jwt: string }>(
        `${API_BASE}/user/auth`,
        {
          address: address,
          message,
          signature,
          timestamp,
        }
      );

      return response;
    },
    onSuccess({ jwt }, { address }) {
      settings.setApiKey("gigaverseToken", jwt);
      settings.setAbstractAddress(address);
    },
  });
}

export function GigaverseAuth() {
  const settings = useSettingsStore();
  const { address, status } = useAccount();
  const { login, logout } = useLoginWithAbstract();

  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({
    gigaverseToken: false,
  });

  const toggleVisibility = (field: string) => {
    setVisibleFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const gigaverseLogin = useGigaverseLogin();

  return (
    <div className="space-y-2 max-h-full overflow-auto">
      <Label>Gigaverse Authentication</Label>
      <div className="flex flex-col space-y-3">
        {status === "connected" ? (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Connected with Abstract Wallet:
              </p>
              <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
                <span className="font-mono text-sm truncate">{address}</span>
              </div>
            </div>
            {settings.gigaverseToken && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Gigaverse Token:
                </p>
                <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
                  <span className="font-mono text-sm truncate">
                    {visibleFields.gigaverseToken
                      ? settings.gigaverseToken
                      : settings.gigaverseToken.substring(0, 10) +
                        "..." +
                        settings.gigaverseToken.substring(
                          settings.gigaverseToken.length - 5
                        )}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleVisibility("gigaverseToken")}
                    className="text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={
                      visibleFields.gigaverseToken
                        ? "Hide Gigaverse Token"
                        : "Show Gigaverse Token"
                    }
                  >
                    {visibleFields.gigaverseToken ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => logout()}>
                Disconnect
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  gigaverseLogin.mutate({
                    address,
                  });
                }}
                variant="outline"
              >
                {settings.gigaverseToken ? "Refresh Token" : "Get Token"}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => login()}>Connect with Abstract</Button>
        )}
      </div>
    </div>
  );
}
