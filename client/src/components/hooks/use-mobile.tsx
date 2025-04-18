import * as React from "react";

// Define the breakpoint for mobile devices
const MOBILE_BREAKPOINT = "(max-width: 768px)"; // You can adjust this value based on your design needs (e.g., 'md:' in Tailwind)

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT);

    // Initial check
    setIsMobile(mediaQuery.matches);

    // Listener for changes
    const handleResize = () => {
      setIsMobile(mediaQuery.matches);
    };

    // Add listener using the recommended addEventListener method
    mediaQuery.addEventListener("change", handleResize);

    // Cleanup listener on component unmount
    return () => mediaQuery.removeEventListener("change", handleResize);
  }, []); // Empty dependency array ensures this effect runs only once on mount

  return isMobile;
}
