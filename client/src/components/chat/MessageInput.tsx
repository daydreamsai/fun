import { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface MessageInputProps {
  isLoading: boolean;
  disabled: boolean;
  onSubmit: (message: string) => Promise<void>;
  placeholderText?: string;
}

export function MessageInput({
  isLoading,
  disabled,
  onSubmit,
  placeholderText,
}: MessageInputProps) {
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const msg = new FormData(form).get("message") as string;

    if (!msg.trim()) return;

    form.reset();
    await onSubmit(msg);
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-background flex items-center mt-auto sticky bottom-0 left-0 right-0"
      onSubmit={handleSubmit}
    >
      <motion.input
        type="text"
        name="message"
        placeholder={
          placeholderText ||
          (isLoading ? "Waiting for response..." : "Type your message...")
        }
        className="border flex-1 px-6 py-4 rounded-lg bg-background text-foreground placeholder:text-primary focus:outline-none focus:border-primary"
        disabled={disabled || isLoading}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      />
      <motion.button
        className="bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary h-full w-1/4 max-w-64 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        disabled={disabled || isLoading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.2 }}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Thinking...
          </>
        ) : (
          "Send"
        )}
      </motion.button>
    </motion.form>
  );
}
