import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
  ErrorComponent as TanStackErrorComponent,
} from "@tanstack/react-router";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { WalletConnect } from "@/components/WalletConnect";
import { WalletContextProvider } from "@/context/WalletContext";
import { TokenGate } from "@/components/TokenGate";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Custom error component that passes the error prop correctly
const CustomErrorComponent = ({ error }: { error: Error }) => {
  return <TanStackErrorComponent error={error} />;
};

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  // Add error boundary to handle routing errors
  errorComponent: CustomErrorComponent,

  component: () => {
    const { queryClient } = Route.useRouteContext();

    return (
      <>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <WalletContextProvider>
              <TokenGate>
                <SidebarProvider className="font-body">
                  <AppSidebar className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" />
                  <SidebarInset className="bg-transparent bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] relative h-svh overflow-hidden">
                    <header className="sticky top-0 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 justify-between pr-4 z-10">
                      <div className="flex items-center gap-2 px-4">
                        <ModeToggle />
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                          orientation="vertical"
                          className="mr-2 h-4"
                        />
                        <Breadcrumb>
                          <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                              <BreadcrumbLink href="#">
                                <Link to="/">Home</Link>
                              </BreadcrumbLink>
                            </BreadcrumbItem>
                          </BreadcrumbList>
                        </Breadcrumb>
                      </div>
                      <WalletConnect />
                    </header>
                    <Outlet />
                  </SidebarInset>
                </SidebarProvider>
              </TokenGate>
            </WalletContextProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </>
    );
  },
});
