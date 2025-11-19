import "@dittolive/ditto-chat-ui/dist/ditto-chat-ui.css";

import { Ditto } from "@dittolive/ditto";
import {
  DittoProvider,
  useDitto,
  useOnlinePlaygroundIdentity,
  usePendingCursorOperation,
} from "@dittolive/react-ditto";
import DittoChatUI from "@dittolive/ditto-chat-ui";
import { useEffect, useState } from "react";

const DittoChatUIWrapper = () => {
  const ditto = useDitto("testing");
  const [userId, setUserId] = useState("");
  const { documents: users } = usePendingCursorOperation({
    collection: "users",
  });

  useEffect(() => {
    console.log({ userId });
  }, [userId]);

  return userId ? (
    <DittoChatUI
      // @ts-expect-error
      ditto={ditto?.ditto as Ditto}
      theme="auto"
      userId={userId}
      userCollectionKey="users"
    />
  ) : (
    <div>
      <p style={{ textAlign: "center", fontSize: "24px", margin: "1rem" }}>
        Login User
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          alignItems: "center",
          minWidth: "100%",
        }}
      >
        {users.map((user) => (
          <button
            style={{
              background: "#ff4d00",
              color: "#fff",
              width: "200px",
              height: "50px",
              padding: "10px",
              borderRadius: "20px",
            }}
            onClick={() => setUserId(user.value._id)}
          >
            {user.value.name}
          </button>
        ))}
      </div>
    </div>
  );
};

function App() {
  const { create } = useOnlinePlaygroundIdentity();
  return (
    <DittoProvider
      setup={async () => {
        const ditto = new Ditto(
          create({
            appID: String(import.meta.env.VITE_APP_DITTO_APP_ID),
            token: String(import.meta.env.VITE_APP_DITTO_APP_TOKEN),
            enableDittoCloudSync: false,
            customAuthURL: String(import.meta.env.VITE_APP_DITTO_AUTH_URL),
          }),
          "testing",
        );
        ditto.updateTransportConfig((config) => {
          config.connect.websocketURLs.push(
            String(import.meta.env.VITE_APP_DITTO_WEB_SOCKET),
          );
        });
        await ditto.store.execute("ALTER SYSTEM SET DQL_STRICT_MODE = false");
        await ditto.disableSyncWithV3();
        ditto.startSync();
        return ditto;
      }}
      /* initOptions={initOptions} */
    >
      {({ loading, error }) => {
        if (loading) return <p>Loading</p>;
        if (error) return <p>{error.message}</p>;
        return <DittoChatUIWrapper />;
      }}
    </DittoProvider>
  );
}

export default App;
