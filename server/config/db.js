import { MongoClient } from "mongodb";

let db;
const connectToDb = (cb) => {
    MongoClient.connect('mongodb://0.0.0.0:27017/Users').then(client => {
        db = client.db();
        return cb();
    }).catch(err => {
       return cb(err)
   })
}
const getDb = () => {
    return db;
}

export {connectToDb, getDb};