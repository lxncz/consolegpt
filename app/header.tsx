import { useEffect, useState } from "react";

import { settingsStore } from "./settingsStore";
import { completionTaskStore } from "./completionTaskStore";

type HeaderProps = {
  onNewChatRequest?: () => void;
};

const Header = ({ onNewChatRequest }: HeaderProps) => {
  const [settings, setSettings] = useState(settingsStore.get());
  const [activeTasks, setActiveTasks] = useState(completionTaskStore.get());

  useEffect(() => {
    const unsubSettings = settingsStore.subscribe(setSettings);
    const unsubTasks = completionTaskStore.subscribe(setActiveTasks);

    return () => {
      unsubSettings();
      unsubTasks();
    };
  }, []);

  const handleModelSelect = (val: string) => {
    settingsStore.set({ ...settings, model: val });
  };

  const handleApiKeyInput = (val: string) => {
    settingsStore.set({ ...settings, apiKey: val });
  };

  const handleNewChatRequest = () => {
    console.log(onNewChatRequest);
    onNewChatRequest?.();
  };

  return (
    <header
      style={{
        background:
          "linear-gradient(90deg, rgb(255 255 255 / 10%), rgb(255 255 255 / 5%))",
        backdropFilter: "blur(10px)",
      }}
      className="z-10 flex p-2 w-full sticky top-0 gap-2 text-sm bg-neutral-900 rounded-b-lg"
    >
      <button
        className="font-bold text-white hover:text-neutral-300 px-2"
        onClick={handleNewChatRequest}
      >
        New Chat
      </button>

      <label className="text-white h-fit">
        <span className="text-zinc-500">API Key </span>
        <input
          type="password"
          className="bg-inherit w-16"
          value={settings.apiKey}
          onChange={(e) => handleApiKeyInput(e.target.value)}
        />
      </label>

      <label className="text-white h-fit">
        <span className="text-zinc-500">Model </span>
        <input
          type="text"
          className="bg-inherit w-16"
          value={settings.model}
          onChange={(e) => handleModelSelect(e.target.value)}
        />
      </label>

      {activeTasks.length > 0 && (
        <label className="ml-auto text-white flex justify-center items-center gap-1">
          {activeTasks.length}
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
              className="animate-spin"
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
        </label>
      )}
    </header>
  );
};

export default Header;
