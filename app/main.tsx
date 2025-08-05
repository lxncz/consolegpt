import { useRef } from "react";

import Header from "./header";
import MemoMessage from "./message";

const Main = () => {
  const mainViewRef = useRef(null);
  const deselectMsgRef = useRef<(() => void) | undefined>(undefined);

  const handleOnNewChatRequest = () => {
    deselectMsgRef.current?.();
  };

  return (
    <main
      className="bg-black fixed flex flex-col-reverse h-full w-full items-center overflow-y-scroll "
      ref={mainViewRef}
    >
      <div className="mb-auto" />
      <div className="w-full max-w-screen-lg pb-40">
        <Header onNewChatRequest={handleOnNewChatRequest} />
        <MemoMessage
          id={"#0000"}
          initialContent={[
            {
              role: "developer",
              content: "Format rules: Use ```lang notation if you need to display code",
            },
          ]}
          containerRef={mainViewRef}
          deselectMsgRef={deselectMsgRef}
        />
      </div>
    </main>
  );
};

export default Main;
