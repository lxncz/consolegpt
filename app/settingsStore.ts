import { createAtom, storage } from "./utils";

const createSettingsStore = () => {
  type SettingsStore = {
    model?: string;
    apiKey?: string;
  };

  const store = storage<SettingsStore>("settings");

  const atom = createAtom<SettingsStore>({
    model: 'gpt-4o',
    ...store.get(),
  });

  return {
    set: (data: SettingsStore) => {
      store.set(data);
      atom.set(() => data);
    },
    get: atom.get,
    subscribe: atom.subscribe,
  };
};

const settingsStore = createSettingsStore();

export { settingsStore };
