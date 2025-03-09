const express = require('express');
const dotenv = require('dotenv')
dotenv.config({path:'./api/server/env.env'});
const Pusher = require('pusher');
const {databaseConnect, getUser, sendRequest, getUsernames, getRequests, addFriend, getConnections,
            getFriends, removeRequest, register} = require('./db');
const fs = require('fs');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const cryptoKey = process.env.CRYPTO_KEY
const crypto = require('crypto-js')
const app = express();
const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true
})

let db;
async function getChatMessages(_, {input}){
    const searchUs = crypto.SHA256(input.usName).toString();
    const searchRe = crypto.SHA256(input.reName).toString();
    const result = await db.collection('ChatMessage').find({
        senderName: {$in: [searchUs, searchRe]},
        receiverName: {$in: [searchRe, searchUs]}
    }).toArray();

    return result.map(ele=>{
        ele.text = crypto.AES.decrypt(ele.text, cryptoKey).toString(crypto.enc.Utf8);
        if(ele.senderName == searchUs){
            ele.senderName = input.usName;
            ele.receiverName = input.reName;
        }
        else{
            ele.senderName = input.reName;
            ele.receiverName = input.usName;
        }
        return ele
    });
}

async function addChat(_, {input}){
    const searchSe = crypto.SHA256(input.senderName).toString();
    const searchRe = crypto.SHA256(input.receiverName).toString();
    const tempInput = Object.assign({}, input);
    input.text = crypto.AES.encrypt(input.text, cryptoKey).toString();
    input.senderName = searchSe;
    input.receiverName = searchRe;
    const result = await db.collection('Users').findOne({search: searchSe}, {projection: {chats: 1, _id: 0}});
    await db.collection('ChatMessage').insertOne(input);
    await pusher.trigger(
        crypto.AES.decrypt(result.chats[searchRe], cryptoKey).toString(crypto.enc.Utf8), 
        "new-message",
        {GetNewMessages: tempInput}
    )
    return tempInput;
}

const resolvers = {
    Query:{
        Users: getUser,
        getUsernames: getUsernames,
        GetRequests: getRequests,
        GetChatMessages: getChatMessages,
        GetConnections: getConnections,
        GetFriends: getFriends
    },
    Mutation:{
        Register: register,
        Chats: addChat,
        SendRequest: sendRequest,
        AddFriend: addFriend,
        RemoveRequest: removeRequest
    }
}

const {ApolloServer} = require('apollo-server-express');
const { createServer } = require('http');

async function startServer() {
    const typeDefs = fs.readFileSync(require.resolve('./qlschema.graphql')).toString('utf-8')

    const schema = makeExecutableSchema({ typeDefs, resolvers });

    const apolloServer = new ApolloServer({
        schema,
        subscriptions: {
          path: '/graphql',
        },
    });
    // Connect to the database
    db = databaseConnect();
    const httpServer = createServer(app);

    await apolloServer.start();
    apolloServer.applyMiddleware({ app, path: '/graphql' });
    const port = process.env.PORT || 4000
    httpServer.listen(port, () => {
        console.log('Server is running on http://localhost:4000');
    });
}

// Start the server
startServer().catch((err) => {
    console.error('Error starting the server:', err);
});

module.exports = app;
