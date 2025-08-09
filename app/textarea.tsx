import { ChangeEvent, useState, useEffect, useRef, memo } from "react";
import TextareaAutosize from "react-textarea-autosize";

type ChatInputProps = {
  onSubmit: ({
    content,
    action,
  }: {
    content: string;
    action: "send" | "save";
  }) => void;
  defaultValue?: string;
};

const Textarea = ({ onSubmit, defaultValue = "" }: ChatInputProps) => {
  const [content, setContent] = useState(defaultValue);
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      const msg = content.trim();

      if (!msg) return;

      onSubmit({ content: msg, action: "send" });
    }

    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();

      const msg = content.trim();

      if (!msg) return;

      onSubmit({ content: msg, action: "save" });
    }
  };

  useEffect(() => {
    if (
      content === "" &&
      !["TEXT", "TEXTAREA"].includes(document.activeElement?.nodeName || "")
    ) {
      ref.current?.focus();
    }
  }, [content]);

  const textColor =
    defaultValue.length > 0 && content !== defaultValue
      ? "text-[#ffd985]"
      : "text-[#fff]";

  return (
    <>
      <TextareaAutosize
        minRows={1}
        placeholder="Type a message..."
        onKeyDown={handleKeyDown}
        onChange={handleInputChange}
        value={content}
        className={`border border-neutral-900 rounded-md w-full resize-none overflow-hidden bg-neutral-950 outline-none p-4 ${textColor}`}
        ref={ref}
      />
    </>
  );
};

export default memo(Textarea);
