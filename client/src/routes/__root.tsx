import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import {
  createRootRouteWithContext,
  Outlet,
  ErrorComponent as TanStackErrorComponent,
} from "@tanstack/react-router";
import { AbstractWalletProvider } from "@abstract-foundation/agw-react";
import { abstract } from "viem/chains"; // Use abstract for mainnet

import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { QueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
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
}>()({
  // Add error boundary to handle routing errors
  errorComponent: CustomErrorComponent,

  component: function Root() {

    return (
      <>
        <ThemeProvider>
          {/* <TokenGate> */}
          <AbstractWalletProvider chain={abstract}>
            <SidebarProvider className="font-body">
              <AppSidebar className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" />
              <SidebarInset className="bg-transparent bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] relative h-svh flex">
                <div className="flex flex-col flex-1">
                  <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 justify-between z-10">
                    <div className="flex items-center gap-2 px-4">
                      <SidebarTrigger className="-ml-1" />
                      <Separator orientation="vertical" className="h-4" />
                      <ModeToggle />
                    </div>
                  </header>
                  <ErrorBoundary FallbackComponent={CustomErrorComponent}>
                    <Outlet />
                  </ErrorBoundary>
                </div>
              </SidebarInset>
            </SidebarProvider>
          </AbstractWalletProvider>
          {/* </TokenGate> */}
        </ThemeProvider>
      </>
    );
  },
});
