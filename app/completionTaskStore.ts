import { createAtom } from "./utils";

import OpenAI from "openai";

type ChatCompletionOptions = {
  messages?: Array<{ role: "user" | "assistant" | "developer"; content: string }>;
  model?: string;
};

type ChatCompletion = (props: {
  opts: ChatCompletionOptions;
  apiKey?: string;
  signal?: AbortSignal;
  onText: (text: string) => void;
}) => Promise<string>;

const chatCompletion: ChatCompletion = async ({ opts, apiKey, onText, signal }) => {
  return new Promise((resolve, reject) => {
    if (!apiKey) {
      return reject(new Error("API key is required"));
    }

    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    openai.chat.completions
      .create(
        {
          model: opts.model || "gpt-4o",
          messages: opts.messages || [],
          stream: true,
        },
        { signal }
      )
      .then(async (stream) => {
        let result = "";
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            result += content;
            onText(result);
          }
        }

        resolve(result);
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          resolve("");
        } else {
          reject(error);
        }
      });
  });
};

const createCompletionTaskStore = () => {
  type CompletionTask = {
    id: string;
    result: ReturnType<typeof createAtom<string>>;
    abort: () => void;
  };

  const atom = createAtom<CompletionTask[]>([]);

  const storeTask = (task: CompletionTask) => atom.set((prev) => [...prev, task]);
  const removeTask = (id: string) => atom.set((prev) => [...prev].filter((task) => task.id !== id));

  type newTaskProps = {
    id: string;
    apiKey?: string;
    opts: ChatCompletionOptions;
    onText?: (text: string) => void;
    onDone?: (text: string) => void;
    onError?: (error: unknown) => void;
  };

  const newTask = ({ id, apiKey, opts, onText, onDone, onError }: newTaskProps) => {
    const result = createAtom("");

    const abortController = new AbortController();

    chatCompletion({
      opts,
      apiKey,
      signal: abortController.signal,
      onText: (text) => {
        result.set(() => text);
        onText?.(text);
      },
    })
      .then((text) => {
        result.set(() => text);
        onDone?.(text);
        removeTask(id);
      })
      .catch((error) => {
        result.set((current) => current);
        onError?.(error);
        removeTask(id);
      });

    storeTask({
      id,
      result,
      abort: () => abortController.abort(),
    });
  };

  return {
    newTask,
    get: atom.get,
    subscribe: atom.subscribe,
  };
};

const completionTaskStore = createCompletionTaskStore();

export { completionTaskStore };