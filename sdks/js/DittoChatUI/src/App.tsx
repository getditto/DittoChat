import React from "react";
import { Ditto } from "@dittolive/ditto";
import {
  DittoProvider,
  useDitto,
  useOnlinePlaygroundIdentity,
} from "@dittolive/react-ditto";
import DittoChatUI from "./DittoChatUI";

const DittoChatUIWrapper = () => {
  const ditto = useDitto("testing");
  return (
    <DittoChatUI
      // @ts-expect-error
      ditto={ditto?.ditto as Ditto}
      // userId="43e9419a-f5ef-486e-912f-5ac8a318b9a9"
      userId="690342270008f55100255f92"
      userCollectionKey="users"
    />
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
