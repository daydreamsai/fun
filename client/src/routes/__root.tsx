import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import {
  createRootRouteWithContext,
  Outlet,
  ErrorComponent as TanStackErrorComponent,
  useRouterState,
} from "@tanstack/react-router";

import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { WalletContextProvider } from "@/context/WalletContext";
import { QueryClient } from "@tanstack/react-query";
import { ReactElement, useState } from "react";
import { Button } from "@/components/ui/button";
import { PanelRight } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/components/hooks/use-mobile";
import { WalletConnect } from "@/components/WalletConnect";
import { TokenGate } from "@/components/TokenGate";
// // Custom error component that passes the error prop correctly
const CustomErrorComponent = ({ error }: { error: Error }) => {
  console.log({ error });
  return (
    <div className="w-96 border-l">
      <TanStackErrorComponent error={error} />
    </div>
  );
};

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  sidebar?: ReactElement;
}>()({
  // Add error boundary to handle routing errors
  errorComponent: CustomErrorComponent,

  component: function Root() {
    const matches = useRouterState({ select: (s) => s.matches });
    const sidebar = [...matches].reverse().find((d) => d.context.sidebar);
    const [isRightSidebarOpen, setIsMobileSidebarOpen] = useState(true);
    const isMobile = useIsMobile();

    return (
      <>
        <ThemeProvider>
          <WalletContextProvider>
            {/* <TokenGate> */}
            <SidebarProvider className="font-body">
              <AppSidebar className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" />
              <SidebarInset className="bg-transparent bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] relative h-svh overflow-hidden">
                <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 border-b border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 justify-between z-10">
                  <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="h-4" />
                    <ModeToggle />
                  </div>
                  <div className="ml-auto pr-4 flex items-center gap-2">
                    {/* Sidebar Toggle Button (Mobile) */}
                    <WalletConnect />
                    <Separator orientation="vertical" className="h-4" />
                    {sidebar?.context.sidebar && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setIsMobileSidebarOpen((t) => !t)}
                      >
                        <PanelRight />
                      </Button>
                    )}
                  </div>
                </header>
                <ErrorBoundary FallbackComponent={CustomErrorComponent}>
                  <Outlet />
                </ErrorBoundary>
              </SidebarInset>
              {sidebar?.context.sidebar && (
                <ErrorBoundary FallbackComponent={CustomErrorComponent}>
                  {isMobile ? (
                    <Sheet
                      open={isRightSidebarOpen}
                      onOpenChange={setIsMobileSidebarOpen}
                    >
                      <SheetContent
                        className="p-0 max-w-96 [&>button]:hidden"
                        side="right"
                      >
                        {sidebar?.context.sidebar}
                      </SheetContent>
                    </Sheet>
                  ) : (
                    isRightSidebarOpen && sidebar?.context.sidebar
                  )}
                </ErrorBoundary>
              )}
            </SidebarProvider>
            {/* </TokenGate> */}
          </WalletContextProvider>
        </ThemeProvider>
      </>
    );
  },
});
