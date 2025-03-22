import { useEffect, useRef, RefObject } from "react";

interface UseAutoScrollOptions {
  // If true, auto-scrolling will be enabled
  enabled?: boolean;
  // Threshold in pixels to determine if user is near bottom
  threshold?: number;
  // Scroll behavior (smooth or auto)
  behavior?: ScrollBehavior;
  // Debounce time for scroll events in ms
  scrollResetDelay?: number;
  // Whether this is the first load of messages
  isInitialLoad?: boolean;
}

/**
 * Hook to manage auto-scrolling behavior in chat/message interfaces
 * Automatically scrolls to bottom when messages change unless user has scrolled up
 */
export function useAutoScroll<T extends HTMLElement = HTMLDivElement>(
  dependencies: any[] = [],
  options: UseAutoScrollOptions = {}
): RefObject<T> {
  const {
    enabled = true,
    threshold = 150,
    behavior = "smooth",
    scrollResetDelay = 500,
  } = options;

  const containerRef = useRef<T>(null);
  const userHasScrolled = useRef(false);
  const isNearBottomRef = useRef(true);
  const messagesCountRef = useRef(0);

  // Handler to check if user is near bottom
  const checkIfNearBottom = () => {
    const container = containerRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    isNearBottomRef.current = distanceFromBottom <= threshold;
    return isNearBottomRef.current;
  };

  // Handler for user scroll events
  const handleScroll = () => {
    const wasNearBottom = isNearBottomRef.current;
    const isNearBottom = checkIfNearBottom();

    // Only set userHasScrolled if they scrolled up from the bottom
    if (wasNearBottom && !isNearBottom) {
      userHasScrolled.current = true;

      // Reset the flag after a delay
      setTimeout(() => {
        // Only reset if they've scrolled back to the bottom
        if (checkIfNearBottom()) {
          userHasScrolled.current = false;
        }
      }, scrollResetDelay);
    } else if (isNearBottom) {
      // If user scrolled to bottom manually, reset the flag
      userHasScrolled.current = false;
    }
  };

  // Helper function for scrolling to bottom with multiple strategies
  const scrollToBottom = (scrollBehavior: ScrollBehavior = behavior) => {
    const container = containerRef.current;
    if (!container) return;

    // Try multiple approaches to ensure the scroll works
    // 1. Standard scrollTo method
    container.scrollTo({
      top: container.scrollHeight,
      behavior: scrollBehavior,
    });

    // 2. Use RAF to ensure layout calculations are complete
    requestAnimationFrame(() => {
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: scrollBehavior,
        });
      }
    });

    // 3. Force scroll with a delay for animations
    setTimeout(() => {
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "auto", // Force immediate scroll
        });
      }
    }, 150);
  };

  // Effect to scroll to bottom when dependencies change
  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    // Check if messages count has increased
    const depsMessageCount = dependencies[0]?.length || 0;
    const hasNewMessages = depsMessageCount > messagesCountRef.current;
    messagesCountRef.current = depsMessageCount;

    // Scroll to bottom if:
    // 1. User hasn't scrolled up manually, OR
    // 2. User is already near bottom, OR
    // 3. New messages have been added
    if (!userHasScrolled.current || isNearBottomRef.current || hasNewMessages) {
      // Force immediate scroll for new messages
      const effectiveBehavior = hasNewMessages ? "auto" : behavior;

      // For new messages, use multiple scroll attempts with delays
      if (hasNewMessages) {
        // Immediate attempt
        scrollToBottom("auto");

        // Wait for DOM updates and try again
        setTimeout(() => scrollToBottom("auto"), 50);

        // One more attempt after animations should have completed
        setTimeout(() => scrollToBottom("auto"), 300);
      } else {
        // Normal scroll behavior for other dependency changes
        scrollToBottom(effectiveBehavior);
      }
    }
  }, [...dependencies, enabled]);

  // Effect to add scroll event listeners
  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [enabled]);

  // Make the scrollToBottom function available to the component
  (containerRef as any).scrollToBottom = scrollToBottom;

  return containerRef;
}
