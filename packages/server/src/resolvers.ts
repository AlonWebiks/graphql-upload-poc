import { pubSub } from "./pubsub";
import {GraphQLUpload, FileUpload } from 'graphql-upload'
import { GraphQLError } from "graphql";
import fs from 'fs';
import {finished} from 'stream/promises';
import { uploadFile } from "./s3";

interface File {
    url: string;
} 

interface FileInput {
    url?: string | null;
    upload?: Promise<FileUpload>
} 


const files: File[] = [];

async function createFile(file: FileInput): Promise<File> {
    if ((file.url == undefined) === (file.upload == undefined)) {
        throw new GraphQLError("file input invalid");
    }
    let newFile: File;
    if (file.upload != undefined) {
        const {createReadStream, filename, mimetype, encoding} = await file.upload!;
        console.log({filename, mimetype, encoding});
        const stream = createReadStream();
        const url = await uploadFile({stream, filename});
        console.log('uploaded file url: ' + url);
        newFile = { url };
    } else {
        newFile = { url: file.url! };
    }
    files.push(newFile);
    pubSub.publish("file_created", newFile);
    return newFile;
}

const resolvers = {
    Query: {
        files: () => files,
    },
    Mutation: {
        createFile: (root: any, { file }: { file: FileInput }) => createFile(file),
    },
    Subscription: {
        fileCreated: {
            resolve: (payload: File) => payload,
            subscribe: () => pubSub.asyncIterator("file_created")
        }
    },
    Upload: GraphQLUpload 
}

export default resolvers;