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
  const [links, setLinks] = useState<string[]>([])

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
    const newLinks = res.data.files.map(({url}: {url: string}) => url);
    setLinks(links => Array.from(new Set([...links, ...newLinks])))
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
    }).subscribe(msg => {
      console.log(msg);
      
      const link = msg.data.fileCreated.url;
      setLinks(links => Array.from(new Set([...links, link])))
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

  const downloadFile = async (link: string) => {
      const a = document.createElement('a');
      a.setAttribute('href', link);
      a.setAttribute('download', 'file');
      document.body.appendChild(a);
      a.click();
      a.remove();
  }

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
        {links.map(link => <a key={link} className="App-link" style={{fontSize: 10}} href={link} target="_blank" rel="noreferrer" download>download {link.substring(link.length-10)}</a>)}
      </header>
    </div>
  );
}

export default App;
