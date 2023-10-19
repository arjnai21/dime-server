import express, { Express, Request, Response } from 'express';
import { Pool, types } from 'pg';

require('dotenv').config()
types.setTypeParser(1700, function (val) { // parses numerics in postgres as floats automatically
    return parseFloat(val);
});
/* current data model
users:
- id
- username
- phone_number
- email_address
- whatever bank account information i need
- profile picture (probably a link to where it is in s3)
- balance ??? technically just the sum of transactions so I don't know
- registration_timestamp
- is_merchant (true or false)

transactions:
- id
- sender_id
- recipient_id
- amount
- from_location ("BALANCE OR ACCOUNT") ??? maybe
- timestamp


*/

interface User {
    username: string;
    phoneNumber: string;
    emailAddress: string;
    profilePictureLink: string;
    balance: number;
    isMerchant: boolean;

}

interface UserTransaction { // this model forces usernames to be unique
    senderUsername: string;
    recipientUsername: string;
    amount: number;
}

const app: Express = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
const port = 3000;
const pgPool = new Pool({ ssl: { rejectUnauthorized: false } }); // TODO look into what this reject unauthorized thing does. connecting doesnt work without it

// TODO validate this and do some error handling/retrying
async function createUser(user: User) {
    const result = await pgPool.query("INSERT INTO users(username, phone_number, email_address, profile_picture_link, balance, registration_timestamp, is_merchant) VALUES($1, $2, $3, $4, $5, $6, $7)",
        [user.username, user.phoneNumber, user.emailAddress, user.profilePictureLink, user.balance, new Date().toISOString(), user.isMerchant]);
}

// TODO validate this and do some error handling/retrying. also there might be a better way to do this
async function sendMoney(transaction: UserTransaction) {
    let senderId, recipientId, senderBalance;

    // get sender and receiver data
    const usersData = await pgPool.query("SELECT id, username, balance from users WHERE username=$1 OR username=$2", [transaction.senderUsername, transaction.recipientUsername]);
    if (usersData.rows[0].username === transaction.senderUsername) { // sender will either be the first result or the second
        senderId = usersData.rows[0].id;
        senderBalance = usersData.rows[0].id;
        recipientId = usersData.rows[1].id;
    }
    else {
        senderId = usersData.rows[1].id;
        senderBalance = usersData.rows[1].id;
        recipientId = usersData.rows[0].id;
    }

    // make sure sender has enough money
    if (senderBalance < transaction.amount) {
        return [-1, "INSUFFICIENT_FUNDS"];
    }

    // write transaction to transactions table. TODO do both of these in a transaction
    let result = await pgPool.query("INSERT INTO transactions(sender_id, recipient_id, amount, timestamp) VALUES($1, $2, $3, $4)", [senderId, recipientId, transaction.amount, new Date().toISOString()]);



    // decrement sender balance and increment recipient balance
    result = await pgPool.query("UPDATE users SET balance = CASE WHEN id = $2 THEN balance - $1 WHEN id = $3 THEN balance + $1 ELSE balance END WHERE id = $2 OR id=$3; ", [transaction.amount, senderId, recipientId]);
}


app.post("/createUser", async (req: Request, res: Response) => {
    await createUser(req.body);
    res.status(200).json({
        success: true,
    })
});

// TODO VERY IMPORTANT Need to verify that this request comes from the actual username it says it does. Otherwise anyone can hit this endpoint to send money to themselves
app.post("/sendMoney", async (req: Request, res: Response) => {
    await sendMoney(req.body);
    res.status(200).json({
        success: true,
    })
});


app.get('/', (req: Request, res: Response) => {
    res.send('Hello, this is Dime');
});

app.listen(port, () => {
    console.log(`[Server]: I am running at http://localhost:${port}`);
});
