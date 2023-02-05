import { pubSub } from "./pubsub";
import {GraphQLUpload, FileUpload } from 'graphql-upload'
import { GraphQLError } from "graphql";
import fs from 'fs';
import {finished} from 'stream/promises';

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
        console.log(file);
        
        const {createReadStream, filename, mimetype, encoding} = await file.upload!;
        console.log({filename, mimetype, encoding});
        const stream = createReadStream();
        const writeStream = fs.createWriteStream('./uploads/' + filename); 
        stream.pipe(writeStream);
        await finished(writeStream);
        newFile = { url: 'http://localost:4000/uploads/' + filename };
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