import { ChangeEvent, useState, useEffect, useRef, memo } from "react";
import TextareaAutosize from "react-textarea-autosize";
import Image from "next/image";

/**
 * ChatInputProps defines the props for the Textarea component.
 * @typedef {Object} ChatInputProps
 * @property {(params: { content: string; images: string[]; action: "send" | "save" }) => void} onSubmit - Callback when user submits or saves input.
 * @property {string} [defaultValue] - Default text value for the textarea.
 * @property {string[]} [defaultImages] - Default images for the input.
 */

/**
 * Props for the Textarea component.
 */
type ChatInputProps = {
  /**
   * Called when the user submits or saves the input.
   * @param {Object} params
   * @param {string} params.content - The text content entered by the user.
   * @param {string[]} params.images - Array of image data URLs.
   * @param {"send"|"save"} params.action - Action type: send or save.
   */
  onSubmit: ({
    content,
    images,
    action,
  }: {
    content: string;
    images: string[];
    action: "send" | "save";
  }) => void;
  /** Default text value for the textarea. */
  defaultValue?: string;
  /** Default images for the input. */
  defaultImages?: string[];
};

/**
 * Textarea is a memoized React component for chat input.
 * It supports autosizing, image paste/drag-drop, keyboard shortcuts, and image preview modal.
 *
 * Features:
 * - Autosizing textarea for chat input
 * - Paste or drag-and-drop images to attach
 * - Keyboard shortcuts: Enter to send, Ctrl+S to save
 * - Image preview and removal
 * - Focus management for improved UX
 *
 * @param {ChatInputProps} props - Component props
 * @returns {JSX.Element}
 */
const Textarea = ({
  onSubmit,
  defaultValue = "",
  defaultImages = [],
}: ChatInputProps) => {
  const [content, setContent] = useState(defaultValue);
  const [images, setImages] = useState<string[]>(defaultImages);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  /**
   * Handles paste events to extract images from clipboard and add them to images state.
   */
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items);
      items.forEach((item) => {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              setImages((prev) => [...prev, ev.target?.result as string]);
            };
            reader.readAsDataURL(file);
          }
        }
      });
    };
    const textarea = ref.current;
    if (textarea) {
      textarea.addEventListener("paste", handlePaste);
    }
    return () => {
      if (textarea) {
        textarea.removeEventListener("paste", handlePaste);
      }
    };
  }, []);

  /**
   * Updates content state when textarea value changes.
   * @param {ChangeEvent<HTMLTextAreaElement>} e
   */
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  /**
   * Handles keyboard shortcuts for sending (Enter) and saving (Ctrl+S) messages.
   * @param {React.KeyboardEvent<HTMLTextAreaElement>} e
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const msg = content.trim();
      if (!msg && images.length === 0) return;
      onSubmit({ content: msg, images, action: "send" });
    }
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      const msg = content.trim();
      if (!msg && images.length === 0) return;
      onSubmit({ content: msg, images, action: "save" });
    }
  };

  /**
   * Focuses the textarea when content is empty, the active element is not a text input,
   * and the textarea is visible in the viewport. Also auto-focuses when textarea enters viewport after scrolling.
   */
  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;

    // Helper to check if textarea is in viewport
    const isInViewport = () => {
      const rect = textarea.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <=
          (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <=
          (window.innerWidth || document.documentElement.clientWidth)
      );
    };

    // Initial focus if in viewport
    if (
      content === "" &&
      !["TEXT", "TEXTAREA"].includes(document.activeElement?.nodeName || "") &&
      isInViewport()
    ) {
      textarea.focus();
    }

    // Listen for scroll and resize to focus when textarea enters viewport
    const handleViewportCheck = () => {
      if (
        content === "" &&
        !["TEXT", "TEXTAREA"].includes(
          document.activeElement?.nodeName || ""
        ) &&
        isInViewport()
      ) {
        textarea.focus();
      }
    };

    window.addEventListener("scroll", handleViewportCheck, true);
    window.addEventListener("resize", handleViewportCheck);

    return () => {
      window.removeEventListener("scroll", handleViewportCheck, true);
      window.removeEventListener("resize", handleViewportCheck);
    };
  }, [content]);

  /**
   * Determines if images have changed from their default state.
   */
  const imagesChanged =
    (defaultImages.length > 0 && defaultImages.length !== images.length) ||
    defaultImages.some((img, idx) => img !== images[idx]);

  /**
   * Determines if text has changed from its default value.
   */
  const textChanged = defaultValue.length > 0 && content !== defaultValue;

  /**
   * Sets the text color based on whether content or images have changed.
   */
  const textColor =
    textChanged || imagesChanged ? "text-[#ffd985]" : "text-[#fff]";

  /**
   * Handles drag over event to indicate active drag state.
   * @param {React.DragEvent<HTMLDivElement>} e
   */
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  /**
   * Handles drag leave event to reset drag state.
   * @param {React.DragEvent<HTMLDivElement>} e
   */
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  /**
   * Handles drop event to extract images from dropped files and add to images state.
   * @param {React.DragEvent<HTMLDivElement>} e
   */
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setImages((prev) => [...prev, ev.target?.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  /**
   * Renders the chat input UI, including textarea, image previews, and modal.
   */
  return (
    <div
      className={`relative border border-neutral-900 rounded-md w-full bg-neutral-950 flex flex-col gap-0 ${
        dragActive ? "ring-2 ring-cyan-500 bg-neutral-900" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Image preview thumbnails */}
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center justify-start pt-2 mx-4">
          {images.map((img, idx) => (
            <div key={idx} className="relative">
              <div
                className="w-16 h-16 relative cursor-pointer"
                onClick={() => setModalImage(img)}
              >
                <Image
                  src={img}
                  alt={`preview-${idx}`}
                  fill
                  style={{
                    objectFit: "cover",
                    borderRadius: "0.5rem",
                    border: "1px solid #27272a",
                  }}
                  className="rounded-md border border-neutral-800"
                  sizes="64px"
                />
              </div>
              <button
                className="absolute top-1 right-1 h-5 w-5 flex justify-center items-center bg-black bg-opacity-60 rounded-full hover:text-red-500"
                onClick={() =>
                  setImages((prev) => prev.filter((_, i) => i !== idx))
                }
                title="Remove image"
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Autosizing textarea for chat input */}
      <TextareaAutosize
        minRows={1}
        placeholder="Type a message..."
        onKeyDown={handleKeyDown}
        onChange={handleInputChange}
        value={content}
        className={`resize-none overflow-hidden outline-none w-full bg-transparent p-4 ${textColor}`}
        ref={ref}
        style={{ border: "none" }}
      />

      {/* Modal for viewing image in large preview */}
      {modalImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
          onClick={() => setModalImage(null)}
        >
          <div
            className="relative flex justify-center items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={modalImage}
              alt="preview"
              width={512}
              height={512}
              style={{
                objectFit: "contain",
                borderRadius: "0.5rem",
                maxWidth: "80vw",
                maxHeight: "80vh",
              }}
              className="rounded-md shadow-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Memoized export of Textarea for performance optimization.
 */
export default memo(Textarea);
