import { createLazyFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAgentStore } from "@/store/agentStore";
import { useEffect, useState } from "react";

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
  const agent = useAgentStore((state) => state.agent);

  const [gigaverseChats, setGigaverseChats] = useState([]);
  const [ponzilandChats, setPonzilandChats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchChats() {
      console.log("fetching chats");
      setIsLoading(true);
      try {
        const contexts = await agent.getContexts();

        setGigaverseChats(
          contexts.filter((ctx) => ctx.type === "gigaverse") as any
        );
        setPonzilandChats(
          contexts.filter((ctx) => ctx.type === "ponziland") as any
        );
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching chats:", error);
        setIsLoading(false);
      }
    }

    fetchChats();
  }, [agent]);

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

  // Upcoming games to tease
  const upcomingGames = [
    {
      id: "eternum",
      name: "Eternum",
      description: "An onchain 4x game or epic conquest",
      image: "/eternum.png",
    },
    {
      id: "space-explorer",
      name: "Loot Survivor",
      description: "The OG onchain roguelike",
      image: "/skulls.png",
    },
  ];

  return (
    <div className="overflow-y-scroll">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-6 w-full mx-auto max-w-7xl"
      >
        <div className="flex items-center justify-between mb-8 mt-8">
          <motion.h1
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="text-3xl font-bold"
          >
            <img src="/Daydreams.svg" className="h-12" />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className=" text-gray-500 mt-2 font-normal"
            >
              agentic-automation for your web3 games
            </motion.p>
          </motion.h1>
        </div>

        {/* Gigaverse Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Play Gigaverse</h2>
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`}
          >
            {gigaverseChats?.length > 0 ? (
              gigaverseChats.map((chat: any, index: number) => (
                <motion.div
                  key={chat.key}
                  variants={itemVariants}
                  whileHover="hover"
                  custom={index}
                >
                  <Link
                    to="/games/gigaverse/$chatId"
                    params={{ chatId: chat.key }}
                    className="block bg-background border border-primary/20 hover:border-primary transition-colors overflow-hidden shadow-sm"
                  >
                    <div className="h-48 relative overflow-hidden">
                      <motion.img
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.3 }}
                        src="/giga.jpeg"
                        alt="Gigaverse Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-xl mb-1">{chat.key}</h3>
                    </div>
                  </Link>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="col-span-full text-center py-16 border"
              >
                <h3 className="text-xl font-medium mb-2">
                  No game sessions yet
                </h3>
                <p className="mb-6">Start your first Gigaverse adventure!</p>
                <motion.div
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                >
                  <Button asChild variant="outline">
                    <Link
                      to="/games/gigaverse/$chatId"
                      params={{ chatId: `gigaverse-1` }}
                    >
                      <PlusCircle size={20} className="mr-2" />
                      <span>Start New Game</span>
                    </Link>
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </motion.section>

        {/* Ponziland Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Play Ponziland</h2>
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`}
          >
            {ponzilandChats?.length > 0 ? (
              ponzilandChats.map((chat: any, index: number) => (
                <motion.div
                  key={chat.key}
                  variants={itemVariants}
                  whileHover="hover"
                  custom={index}
                >
                  <Link
                    to="/games/ponziland/$chatId"
                    params={{ chatId: chat.key }}
                    className="block bg-background border border-primary/20 hover:border-primary transition-colors overflow-hidden shadow-sm"
                  >
                    <div className="h-48 relative overflow-hidden">
                      <motion.img
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.3 }}
                        src="/ponzi.jpeg"
                        alt="Ponziland Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-xl mb-1">{chat.key}</h3>
                    </div>
                  </Link>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="col-span-full text-center py-16 border"
              >
                <h3 className="text-xl font-medium mb-2">
                  No game sessions yet
                </h3>
                <p className="mb-6">Start your first Ponziland adventure!</p>
                <motion.div
                  whileHover="hover"
                  whileTap="tap"
                  variants={buttonVariants}
                >
                  <Button asChild variant="outline">
                    <Link
                      to="/games/ponziland/$chatId"
                      params={{ chatId: `ponziland-1` }}
                    >
                      <PlusCircle size={20} className="mr-2" />
                      <span>Start New Game</span>
                    </Link>
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </motion.section>

        {/* Upcoming Games Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6">Upcoming Agent Games</h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`}
          >
            {upcomingGames.map((game, index) => (
              <motion.div
                key={game.id}
                variants={itemVariants}
                whileHover="hover"
                custom={index}
                className="relative"
              >
                <div className="block bg-background border">
                  <div className="h-48 bg-gray-200 relative overflow-hidden opacity-60">
                    <img
                      src={game.image}
                      alt={game.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <span className="text-white font-semibold px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-xl mb-1">{game.name}</h3>
                    <p className="text-sm text-gray-500">{game.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      </motion.div>
    </div>
  );
}
