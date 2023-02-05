import { gql } from "apollo-server-core";

export default gql`
    scalar Upload
    
    type File {
        url: String!
    }
    
    input FileInput {
        url: String
        upload: Upload
    }

    type Query {
        files: [File!]!
    }

    type Mutation {
        createFile(file: FileInput!): File!
    }

    type Subscription {
        fileCreated: File!
    }
`