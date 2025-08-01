import { FormEvent, MutableRefObject, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface MessageInputProps {
  isLoading: boolean;
  disabled: boolean;
  onSubmit: (message: string) => Promise<void>;
  placeholderText?: string;
  abortControllerRef: MutableRefObject<AbortController | undefined>;
}

export function MessageInput({
  isLoading,
  disabled,
  onSubmit,
  placeholderText,
  abortControllerRef,
}: MessageInputProps) {
  const [isStopping, setIsStopping] = useState(false);

  // Reset the stopping state when loading state changes to false
  if (!isLoading && isStopping) {
    setIsStopping(false);
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const msg = new FormData(form).get("message") as string;
    if (!msg.trim()) return;
    form.reset();
    await onSubmit(msg);
  };

  const handleStop = () => {
    setIsStopping(true);
    abortControllerRef.current?.abort();
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full">
      <Input
        type="text"
        name="message"
        placeholder={
          placeholderText ||
          (isLoading ? "Waiting for response..." : "Type your message...")
        }
        className="border flex-1 px-6 py-4 focus:outline-none focus:border-primary "
        disabled={disabled || isLoading}
      />
      {isLoading ? (
        <Button
          type="button"
          className="h-full w-52 max-w-[35%]"
          onClick={handleStop}
          disabled={isStopping}
        >
          {isStopping ? "Stopped" : "Stop"}
        </Button>
      ) : (
        <Button
          className="h-full w-52 max-w-[35%]"
          disabled={disabled || isLoading}
        >
          Send
        </Button>
      )}
    </form>
  );
}
