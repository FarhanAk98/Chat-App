const express = require('express');
const dotenv = require('dotenv')
dotenv.config({path:'./api/server/env.env'});
const Pusher = require('pusher');
const {databaseConnect, getUser, sendRequest, getUsernames, getRequests, addFriend, getChatMessages,
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

async function getConnections(_, {input}){
    const search = crypto.SHA256(input.name).toString();
    const result = await db.collection('Users').findOne({search: search}, {projection: {chats: 1, _id: 0}});
    return Object.values(result.chats).map(ele=>{
        const conn = crypto.AES.decrypt(ele, cryptoKey).toString(crypto.enc.Utf8)
        const auth = pusher.authenticate(input.socket, conn)
        if(!auth.auth){
            return ["false", conn]
        }
        return ["true", conn]
    })
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

async function startServer() {
    const typeDefs = fs.readFileSync(require.resolve('./qlschema.graphql')).toString('utf-8')

    const schema = makeExecutableSchema({ typeDefs, resolvers });

    const apolloServer = new ApolloServer({
        schema,
        subscriptions: {
          path: '/graphql',
        },
    });
    db = databaseConnect();

    await apolloServer.start();
    apolloServer.applyMiddleware({ app, path: '/graphql' });
}

startServer()

module.exports = app;
