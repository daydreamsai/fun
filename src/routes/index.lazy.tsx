import { createLazyFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAgent } from "@/hooks/use-agent";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
  hover: {
    scale: 1.03,
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10,
    },
  },
};

const buttonVariants = {
  hover: {
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10,
    },
  },
  tap: {
    scale: 0.95,
  },
};

export const Route = createLazyFileRoute("/")({
  component: Index,
});

function Index() {
  const agent = useAgent();
  const isMobile = useIsMobile();

  const {
    data: chats,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["agent:chats"],
    queryFn: async () => {
      const contexts = await agent.getContexts();
      return contexts.filter((ctx) => ctx.type === "chat");
    },
  });

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4"
      >
        Loading game sessions...
      </motion.div>
    );
  }

  if (isError) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 text-red-500"
      >
        Error: {error.message}
      </motion.div>
    );
  }

  // Function to get a display name for the chat
  const getChatDisplayName = (chatId: string) => {
    // For now, just return "Gigaverse 1" for all chats
    return "Gigaverse " + chatId;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 max-w-7xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8 mt-8">
        <motion.h1
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="text-3xl font-bold"
        >
          <img src="/Daydreams.svg" className="h-16" />
        </motion.h1>
        <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
          <Button asChild variant="outline">
            <Link to="/chats/$chatId" params={{ chatId: `new-${Date.now()}` }}>
              <PlusCircle size={20} />
              <span>Start New Game</span>
            </Link>
          </Button>
        </motion.div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-3"} gap-6`}
      >
        {chats?.map((chat, index) => (
          <motion.div
            key={chat.id}
            variants={itemVariants}
            whileHover="hover"
            custom={index}
          >
            <Link
              to="/chats/$chatId"
              params={{ chatId: chat.args.chatId }}
              className="block rounded-xl border hover:border-primary transition-colors overflow-hidden shadow-sm"
            >
              {/* Image space */}
              <div className="h-48 bg-gray-200 relative overflow-hidden">
                <motion.img
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  src="/giga.jpeg"
                  alt="Game Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-xl mb-1">
                  {getChatDisplayName(chat.args.chatId)}
                </h2>
                <p className="text-sm text-gray-500">
                  Last played: {new Date().toLocaleDateString()}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}

        {chats?.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-full text-center py-16 border rounded-xl"
          >
            <h3 className="text-xl font-medium mb-2">No game sessions yet</h3>
            <p className="mb-6">Start your first Gigaverse adventure!</p>
            <motion.div
              whileHover="hover"
              whileTap="tap"
              variants={buttonVariants}
            >
              <Button asChild>
                <Link
                  to="/chats/$chatId"
                  params={{ chatId: `new-${Date.now()}` }}
                >
                  <PlusCircle size={20} />
                  <span>Start New Game</span>
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
