import React, { useEffect, useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import { ApolloClient, gql, InMemoryCache, split } from "@apollo/client";
import { WebSocketLink } from "@apollo/client/link/ws";
import { createUploadLink } from "apollo-upload-client";
import { getMainDefinition } from "@apollo/client/utilities";
import { SubscriptionClient } from "subscriptions-transport-ws";

const uploadLink = createUploadLink({
  uri: "http://localhost:4000/graphql",
  headers: { "Apollo-Require-Preflight": "true" },
});
const subscriptionClient = new SubscriptionClient(
  "ws://localhost:4000/graphql",
  {
    reconnect: true,
    connectionParams: {
      // Additional params
    },
  }
);

const wsLink = new WebSocketLink(subscriptionClient);

const link = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  uploadLink
);

const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});

function App() {
  const [file, setFile] = useState<File>();
  const [uploading, setUploading] = useState(false);

  const getFiles = async () => {
    const res = await apolloClient.query({
      query: gql`
        query {
          files {
            url
          }
        }
      `,
    });
    console.log(res);
  };

  const subscribeToFiles = () => {
    const sub = apolloClient.subscribe({
      query: gql`
        subscription fileCreated {
          fileCreated {
            url
          }
        }
      `
    }).subscribe(data => {
      console.log(data);
    });
    return sub;
  };

  const uploadFile = async () => {
    setUploading(true);
    try {
      await apolloClient.mutate({
        mutation: gql`
          mutation createFile($file: FileInput!) {
            createFile(file: $file) {
              url
            }
          }
        `,
        variables: {
          file: {
            upload: file,
          },
        },
      });
    } catch (err) {
      setUploading(false);
      console.error(err);
    }
    setUploading(false);
  };

  useEffect(() => {
    getFiles();
    const subscription = subscribeToFiles();
    return () => subscription.unsubscribe();
  }, []);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFile(file);
  };
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <input type="file" onChange={onFileChange} />
        <button onClick={uploadFile}>UPLOAD {file?.name}</button>
        {uploading && <div>Uploading file</div>}
      </header>
    </div>
  );
}

export default App;
