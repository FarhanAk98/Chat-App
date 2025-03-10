const cryptoKey = process.env.CRYPTO_KEY
const {MongoClient} = require('mongodb');
const random = require('random-key');
const Pusher = require('pusher');
const crypto = require('crypto-js')
let db;

function databaseConnect(){
    const client = new MongoClient(process.env.DB_URL);
    client.connect();
    db = client.db();
    console.log("Database Connected");
    return db;
}

async function getUser(_, {input}){
    const search = crypto.SHA256(input.name).toString();
    const user = await db.collection('Users').findOne({search: search});
    if(!user)
        return null;
    const password = crypto.AES.decrypt(user.password, cryptoKey).toString(crypto.enc.Utf8)
    const name = crypto.AES.decrypt(user.name, cryptoKey).toString(crypto.enc.Utf8)
    if(name == input.name && password == input.password){
        return crypto.AES.decrypt(user.name, cryptoKey).toString(crypto.enc.Utf8)
    }
    return null;
}

async function register(_, {input}){
    const user = {
        search: crypto.SHA256(input.name).toString(),
        name: crypto.AES.encrypt(input.name, cryptoKey).toString(),
        password: crypto.AES.encrypt(input.password, cryptoKey).toString(),
        chats: {},
        requests: []
    }

    await db.collection('Users').insertOne(user);
}

async function getUsernames(_, {input}){
    const names = await db.collection('Users').distinct('name');
    let decryptedNames = [];
    names.forEach((n) => {
        const name = crypto.AES.decrypt(n, cryptoKey).toString(crypto.enc.Utf8);
        const regex = new RegExp(input, "i");
        if(regex.test(name))
            decryptedNames.push(name);
    })
    return decryptedNames;
}

async function sendRequest(_, {input}){
    const search = crypto.SHA256(input.reName).toString();
    const searchUs = crypto.SHA256(input.usName).toString();
    await db.collection('Users').findOneAndUpdate({search: search}, {$addToSet: {requests: searchUs}})
}

async function getRequests(_, {name}){
    const search = crypto.SHA256(name).toString();
    const result = await db.collection('Users').findOne({search: search}, {projection: {requests: 1, _id: 0}});
    const names = await db.collection('Users').distinct("name", {search: {$in: result.requests}})
    let decryptesRequests = [];
    names.forEach(r=>{
        const request = crypto.AES.decrypt(r, cryptoKey).toString(crypto.enc.Utf8);
        decryptesRequests.push(request)
    })
    return decryptesRequests;
}

async function addFriend(_, {input}){
    const chatKey = random.generateBase30(10);
    const encryptedKey = crypto.AES.encrypt(chatKey, cryptoKey).toString();

    const searchUs = crypto.SHA256(input.usName).toString();

    const searchRe = crypto.SHA256(input.reName).toString();

    await db.collection('Users').updateOne({search: searchUs}, {
        $set: {[`chats.${searchRe}`] : encryptedKey},
        $pull: {requests: searchRe}
    })

    await db.collection('Users').updateOne({search: searchRe}, {
        $set: {[`chats.${searchUs}`] : encryptedKey},
        $pull: {requests: searchUs}
    })
}

async function getFriends(_, {name}){
    const search = crypto.SHA256(name).toString();
    const result = await db.collection('Users').findOne({search: search}, {projection: {chats: 1, _id: 0}});
    const names = Object.keys(result.chats).map(async(ele)=>{
        const n = await db.collection('Users').findOne({search: ele}, {projection: {name: 1, _id: 0}})
        return crypto.AES.decrypt(n.name, cryptoKey).toString(crypto.enc.Utf8);
    })
    return names;
}

async function removeRequest(_, {input}){
    await db.collection('Users').updateOne({name: input.usName}, {$pull: {requests: input.reName}});
}

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

module.exports = {databaseConnect, getUser, sendRequest, getUsernames, getChatMessages,
                    getRequests, addFriend, getFriends, removeRequest, register};
