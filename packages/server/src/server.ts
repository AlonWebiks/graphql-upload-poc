import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import https from 'https';
import cors from 'cors';
import bodyParser from 'body-parser';
import typeDefs from './typedefs';
import resolvers from './resolvers';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { SubscriptionServer } from "subscriptions-transport-ws";
import { execute, subscribe } from "graphql";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { graphqlUploadExpress } from 'graphql-upload';
dotenv.config();
const subscriptionPath = process.env.SUBSCRIPTION_PATH || '/graphql';
const graphqlPath = process.env.GRAPHQL_PATH || '/graphql';
interface MyContext {
    token?: String;
}

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();
app.use(
    cors<cors.CorsRequest>({allowedHeaders: ['*'], origin: '*'}),
    bodyParser.json(),
);

// console.log(__dirname);
console.log('SSL', process.env.SSL);
console.log('subscription protocol', process.env.SUBSCRIPTION_PROTOCOL);

const httpsServer = process.env.SSL === 'true' ? https.createServer({
    cert: fs.readFileSync(path.resolve(__dirname, '../certs/server.crt')),
    key: fs.readFileSync(path.resolve(__dirname, '../certs/server.key')),
    ca: fs.readFileSync(path.resolve(__dirname, '../certs/rootCACert.pem')),
},
    app) :
    http.createServer(app);


let drainServer = async () => {

}

if (process.env.SUBSCRIPTION_PROTOCOL === 'graphql-ws') {
    const wsServer = new WebSocketServer({
        server: httpsServer,
        path: subscriptionPath,
    });

    const serverCleanup = useServer({ schema }, wsServer);
    drainServer = async () => { await serverCleanup.dispose() }


} else {
    const subscriptionServer = SubscriptionServer.create(
        {
            schema,
            execute,
            subscribe
        },
        { server: httpsServer, path: subscriptionPath }
    );
    drainServer = async () => { subscriptionServer.close() }
}




const server = new ApolloServer<MyContext>({
    schema,
    csrfPrevention: true,
    plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer: httpsServer }),
        {
            async serverWillStart() {
                return { drainServer };
            },
        },
    ],
});




export const start = async () => {
    await server.start();
    app.use(
        graphqlPath,
        graphqlUploadExpress(),
        expressMiddleware(server, {
            context: async ({ req }) => ({ token: req.headers.token }),
        }),
    );
    await new Promise<void>((resolve) => httpsServer.listen({ port: process.env.PORT }, resolve));
    console.log(`🚀 Server ready at ${process.env.SSL === 'true' ? 'https' : 'http'}://localhost:${process.env.PORT}${graphqlPath}`);
}