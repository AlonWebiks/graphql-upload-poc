import AWS from 'aws-sdk';
import { Stream, PassThrough, Writable } from 'stream';
import { v4 } from 'uuid';

// AWS.config = new AWS.Config();
// AWS.config.update({
// });

const client = new AWS.S3({
    endpoint: 'http://localhost:9000',
    sslEnabled: false,
    s3ForcePathStyle: true,
    credentials: {
        accessKeyId: "admin",
        secretAccessKey: "adminpass"
    },
});

interface UploadInput {
    stream: Stream;
    filename: string;
}

export const uploadFile = async ({ stream, filename }: UploadInput) => {
    const pass = new PassThrough();
    stream.pipe(pass);
    try {

        const res = await client.upload({
            Bucket: "upload-poc",
            Key: `${v4()}/${filename}`,
            Body: pass,


        }).promise();
        return res.Location.replace('9000/upload-poc', '4000/files');
    } catch (err) {
        console.error(err);
        throw err;
    }
}
export const downloadFile = (key: string, stream: Writable) => {
        const readStream = client.getObject({
            Bucket: "upload-poc",
            Key: key,
            
        }).createReadStream();
        readStream.pipe(stream);
}
