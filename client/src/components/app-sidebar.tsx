import * as React from "react";
import {
  Bot,
  MessageSquare,
  History,
  Settings,
  Twitter,
  Github,
  Brain,
} from "lucide-react";
import { NavMain } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAgentStore } from "@/store/agentStore";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

// This is sample data.
const data = {
  user: {
    name: "sleever",
    email: "m@sleever.ai",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "sleever",
      logo: Bot,
      plan: "Enterprise",
    },
  ],
  navMain: [
    // {
    //   title: "Home",
    //   url: "/",
    //   icon: Bot,
    //   isActive: true,
    // },

    // {
    //   title: "Agents",
    //   url: "#",
    //   icon: Bot,
    //   isActive: true,
    //   items: [
    //     {
    //       title: "My Agents",
    //       url: "#",
    //     },
    //     {
    //       title: "Create Agent",
    //       url: "#",
    //     },
    //     {
    //       title: "Settings",
    //       url: "#",
    //     },
    //   ],
    // },
    {
      title: "Chats",
      url: "#",
      icon: MessageSquare,
      items: [
        // {
        //   title: "New",
        //   url: "/chats/new",
        //   icon: Bookmark,
        // },
        {
          title: "Recent Chats",
          url: "#",
          icon: History,
          component: ChatHistoryList,
        },
      ],
    },
    // {
    //   title: "Workbench",
    //   url: "/workbench",
    //   icon: Wrench,
    //   isActive: true,
    // },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      isActive: true,
    },
  ],
  projects: [],
};

// Create a new ChatHistory component
function ChatHistoryList() {
  const agent = useAgentStore((state) => state.agent);
  const queryClient = useQueryClient();

  // Add a state to track if we've attempted to initialize
  const [initAttempted, setInitAttempted] = useState(false);

  // Try to initialize the agent if needed
  useEffect(() => {
    const initializeAgent = async () => {
      try {
        // Check if the agent is already initialized
        await agent.getContexts();
        setInitAttempted(true);
      } catch (error) {
        console.log("Agent not initialized yet, starting...");
        try {
          await agent.start();
          // Refetch chats after initialization
          queryClient.invalidateQueries({ queryKey: ["agent:chats"] });
        } catch (initError) {
          console.error("Failed to initialize agent:", initError);
        } finally {
          setInitAttempted(true);
        }
      }
    };

    if (!initAttempted) {
      initializeAgent();
    }
  }, [agent, initAttempted, queryClient]);

  const chats = useQuery({
    queryKey: ["agent:chats"],
    queryFn: async () => {
      try {
        const contexts = await agent.getContexts();
        console.log("contexts", contexts);
        return contexts.filter((ctx) => ctx.type === "gigaverse");
      } catch (error) {
        console.error("Error fetching contexts:", error);
        return [];
      }
    },
    // Only run the query if we've attempted to initialize
    enabled: initAttempted,
    // Retry failed queries
    retry: 3,
    // Refetch on window focus
    refetchOnWindowFocus: true,
  });

  if (!initAttempted || chats.isLoading) {
    return <div className="px-4 py-2 text-sm">Loading chats...</div>;
  }

  if (chats.isError) {
    return (
      <div className="px-4 py-2 text-sm text-red-500">
        Error loading chats
        <Button
          variant="ghost"
          size="sm"
          onClick={() => chats.refetch()}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!chats.data || chats.data.length === 0) {
    return (
      <div className="px-4 py-2 text-sm text-muted-foreground">
        No chats found
      </div>
    );
  }

  return (
    <div>
      {chats?.data.map((chat: any) => (
        <SidebarMenuSubItem key={chat.key}>
          <SidebarMenuSubButton asChild>
            <Link to={"/games/gigaverse/$chatId"} params={{ chatId: chat.key }}>
              <div className="font-medium truncate">{chat.key}</div>
            </Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      ))}
    </div>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="bg-secondary group-[[data-state=expanded]]:bg-inherit"
              asChild
            >
              <Link to="/" className="size-8">
                <Brain className="data group-[[data-state=expanded]]:hidden"></Brain>
                <img src="/Daydreams-white.svg" className="h-6 text-white" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col space-y-2 mt-4">
          <SidebarMenuSubButton asChild>
            <a
              href="https://twitter.com/daydreamsagents"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Twitter className="w-4 h-4" />
              <span className="text-xs">Twitter</span>
            </a>
          </SidebarMenuSubButton>
          <SidebarMenuSubButton asChild>
            <a
              href="https://discord.gg/rt8ajxQvXh"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 127.14 96.36"
                className="w-4 h-4 fill-current"
              >
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
              </svg>
              <span className="text-xs">Discord</span>
            </a>
          </SidebarMenuSubButton>
          <SidebarMenuSubButton asChild>
            <a
              href="https://github.com/daydreamsai/daydreams"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="w-4 h-4" />
              <span className="text-xs">Github</span>
            </a>
          </SidebarMenuSubButton>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
