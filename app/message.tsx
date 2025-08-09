import {
  RefObject,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { nanoid } from "nanoid";

import Markdown from "./markdown";
import Textarea from "./textarea";

import { completionTaskStore } from "./completionTaskStore";
import { settingsStore } from "./settingsStore";

import { storage } from "./utils";

type MsgStore = {
  weight?: number;
  content?: string;
  messages?: string[];
  select?: string | null;
  meta?: { model?: string; error?: string };
  role: "user" | "assistant";
  id: string;
};

type MessageProps = {
  id: string;
  initialContent: {
    role: "user" | "assistant" | "developer";
    content: string;
  }[];
  containerRef: RefObject<HTMLElement | null>;
  onWeightChange?: () => void;
  deselectMsgRef?: RefObject<(() => void) | undefined>;
};

const newMessageCompletion = ({
  msgId,
  messages,
}: {
  msgId: string;
  messages: Parameters<
    typeof completionTaskStore.newTask
  >[0]["opts"]["messages"];
}) => {
  const { apiKey, model } = settingsStore.get();

  const msgStore = storage<MsgStore>(msgId);

  const msg = { ...msgStore.get(), meta: { model } };

  msgStore.set(msg);

  return completionTaskStore.newTask({
    id: msgId,
    apiKey,
    opts: {
      model,
      messages,
    },
    onText: (text) =>
      msgStore.set({ ...msg, content: (msg.content || "") + text + " " }),
    onError: (error) => {
      const freshMsg = msgStore.get();
      msgStore.set({
        ...freshMsg,
        meta: { ...freshMsg.meta, error: JSON.stringify(error) },
      });
    },
  });
};

const Message = ({
  id,
  initialContent,
  containerRef,
  onWeightChange,
  deselectMsgRef,
}: MessageProps) => {
  const [parentMsg, setParentMsg] = useState(storage<MsgStore>(id).get());

  const childMsgs =
    parentMsg.messages?.map((_id) => ({
      ...storage<MsgStore>(_id).get(),
      task: completionTaskStore.get().find((task) => task.id === _id),
    })) || [];

  const weight = childMsgs.reduce((p, c) => p + 1 + (c.weight || 0), 0);

  const selectedMsg = childMsgs.find((msg) => msg.id === parentMsg?.select);

  const defaultChildRole = parentMsg?.role === "user" ? "assistant" : "user";

  const [isEditing, setIsEditing] = useState(defaultChildRole === "user");

  const refresh = useCallback(
    () => setParentMsg(storage<MsgStore>(id).get()),
    [id]
  );

  useLayoutEffect(() => {
    if (weight !== parentMsg.weight) {
      storage<MsgStore>(id).set({ ...parentMsg, weight });
      onWeightChange?.();
      refresh();
    }
  });

  const selectedMemoProps = useMemo(() => {
    if (!selectedMsg?.id) return;

    return {
      key: nanoid(5),
      data: {
        id: selectedMsg.id,
        role: selectedMsg.role,
        content: selectedMsg.content,
      },
      initialContent: [
        ...initialContent,
        ...(selectedMsg.role && selectedMsg.content
          ? [{ role: selectedMsg.role, content: selectedMsg.content }]
          : []),
      ],
      onWeightChange: () => refresh(),
    };
  }, [
    initialContent,
    selectedMsg?.id,
    selectedMsg?.content,
    selectedMsg?.role,
    refresh,
  ]);

  const ref = useRef<HTMLDivElement>(null);
  const prevPosRef = useRef<number | undefined>(null);
  const getCurrentPos = () => ref.current?.getBoundingClientRect().top;

  useEffect(() => {
    if (typeof prevPosRef.current !== "number") return;
    containerRef.current?.scrollTo({
      top:
        containerRef.current.scrollTop +
        ((getCurrentPos() || 0) - prevPosRef.current),
    });
    prevPosRef.current = undefined;
  });

  useEffect(() => {
    const inProgressTasks =
      completionTaskStore
        .get()
        .filter((task) => parentMsg?.messages?.includes(task.id)) || [];
    const unsubs = inProgressTasks.map((task) =>
      task.result.subscribe(refresh)
    );
    return () => unsubs.forEach((unsub) => unsub());
  });

  const newBranch = ({
    content,
    fillContent,
    addAnswer,
  }: {
    content?: string;
    fillContent?: boolean;
    addAnswer?: boolean;
  }) => {
    prevPosRef.current = -99999;

    const msgId = `#${nanoid(4)}`;

    let msg: MsgStore = {
      id: msgId,
      role: selectedMsg?.role || defaultChildRole,
      content,
    };

    if (addAnswer && content && msg.role === "user") {
      const childMsgId = `#${nanoid(4)}`;

      storage<MsgStore>(childMsgId).set({
        id: childMsgId,
        role: "assistant",
      });

      msg = {
        ...msg,
        messages: [childMsgId],
        select: childMsgId,
      };

      newMessageCompletion({
        msgId: childMsgId,
        messages: [...initialContent, { role: msg.role, content }],
      });
    }

    storage<MsgStore>(msgId).set(msg);

    if (fillContent && !addAnswer && msg.role === "assistant") {
      newMessageCompletion({ msgId, messages: initialContent });
    }

    storage<MsgStore>(id).set({
      ...parentMsg,
      messages: [msgId, ...(parentMsg.messages || [])],
      select: msgId,
    });

    refresh();
  };

  const editSelect = (content: string) => {
    if (!selectedMsg) return;

    prevPosRef.current = getCurrentPos();

    storage<MsgStore>(selectedMsg.id).set({
      ...selectedMsg,
      content,
    });

    refresh();
  };

  const handleItemDelete = (msgId: string) => {
    prevPosRef.current = getCurrentPos();

    const messages = parentMsg.messages || [];

    const deletedChatIndex = messages.indexOf(msgId);

    const newMsgs = messages.filter((_id) => _id !== msgId);
    const newSelected =
      parentMsg.select === msgId
        ? newMsgs[deletedChatIndex] || newMsgs[0] || null
        : parentMsg.select;

    storage<MsgStore>(id).set({
      ...parentMsg,
      select: newSelected,
      messages: newMsgs,
    });

    refresh();

    const recDel = (_id: string) => {
      const { messages } = storage<MsgStore>(_id).get();

      localStorage.removeItem(_id);

      completionTaskStore
        .get()
        .find((task) => task.id === _id)
        ?.abort();

      if (!messages) return;

      for (const msg of messages) {
        recDel(msg);
      }
    };

    recDel(msgId);
  };

  const handleItemClick = (msgId: string) => {
    prevPosRef.current = getCurrentPos();

    storage<MsgStore>(id).set({
      ...parentMsg,
      select: msgId,
    });

    refresh();
  };

  if (deselectMsgRef) {
    deselectMsgRef.current = () => handleItemClick("");
  }

  const style = {
    user: {
      previewTextColor: "text-cyan-500",
    },
    assistant: {
      previewTextColor: "text-rose-500",
    },
  }[selectedMsg?.role || defaultChildRole];

  return (
    <>
      <div
        className={`gap-2 text-white p-2 flex flex-col w-full max-w-screen-lg mt-3 rounded-md select-none`}
        ref={ref}
      >
        <div className="flex items-end">
          <div className="w-full overflow-hidden">
            {childMsgs.map((msgData) => {
              const bold = selectedMsg?.id === msgData.id;

              const weightText = msgData.weight ? `[${msgData.weight}] ` : "";
              const metaText = msgData?.meta?.model?.concat(" : ") || "";
              const contentText = msgData.content?.slice(0, 200) || "...";

              return (
                <div
                  className={` cursor-pointer w-fit max-w-full flex bg-inherit `}
                  key={msgData.id}
                >
                  <span
                    className={`truncate ${
                      bold
                        ? `font-bold ${style.previewTextColor}`
                        : "text-neutral-400"
                    }`}
                    onClick={() => handleItemClick(msgData.id)}
                  >
                    {`${weightText}${metaText}${contentText}`}
                  </span>
                  <button
                    title="Delete"
                    className="h-6 w-6 flex-shrink-0 flex justify-center items-center hover:text-red-500"
                    onClick={() => handleItemDelete(msgData.id)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
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
              );
            })}
          </div>

          {selectedMsg?.role === "assistant" && (
            <>
              <button
                className={`h-6 w-6 flex-shrink-0 flex justify-center items-center hover:text-red-500 ${
                  isEditing && "text-red-500"
                }`}
                onClick={() => {
                  prevPosRef.current = getCurrentPos();
                  setIsEditing(!isEditing);
                }}
                title="Toggle editing"
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
                  <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                  <path d="m15 5 4 4" />
                </svg>
              </button>
              <button
                className="h-6 w-6 flex-shrink-0 flex justify-center items-center hover:text-red-500"
                onClick={() => newBranch({ fillContent: true })}
                title="Roll another response"
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
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
              </button>
            </>
          )}
        </div>

        {isEditing ? (
          <Textarea
            onSubmit={({ content, action }) => {
              switch (action) {
                case "send":
                  newBranch({ content, addAnswer: true });
                  break;
                case "save":
                  editSelect(content);
                  break;
              }
            }}
            defaultValue={selectedMemoProps?.data.content}
            key={selectedMemoProps?.key}
          />
        ) : (
          <article
            className={`border border-neutral-900 select-text bg-black rounded-md leading-6 p-4 prose prose-invert max-w-none prose-code:before:content-none prose-code:after:content-none prose-pre:my-[1.5em] prose-pre:bg-[#101010]`}
          >
            <Markdown text={selectedMemoProps?.data.content} />
          </article>
        )}

        {selectedMsg?.meta?.error && (
          <span className="m-auto">{"Error: " + selectedMsg.meta.error}</span>
        )}

        {selectedMsg?.task && (
          <button
            className="m-auto font-bold"
            onClick={() => selectedMsg.task?.abort()}
          >
            Stop response
          </button>
        )}
      </div>

      {selectedMemoProps && !selectedMsg?.task && (
        <MemoMessage
          key={selectedMemoProps.key}
          id={selectedMemoProps.data.id}
          initialContent={selectedMemoProps.initialContent}
          onWeightChange={selectedMemoProps.onWeightChange}
          containerRef={containerRef}
        />
      )}
    </>
  );
};

const MemoMessage = memo(Message);

export default MemoMessage;
