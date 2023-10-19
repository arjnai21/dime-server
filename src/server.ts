import express, { Express, Request, Response } from 'express';
import { Pool, types } from 'pg';

require('dotenv').config()
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
    registrationTimestamp: Date;
    isMerchant: boolean;

}

const app: Express = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
const port = 3000;
const pgPool = new Pool({ ssl: { rejectUnauthorized: false } }); // TODO look into what this reject unauthorized thing does. connecting doesnt work without it

// TODO validate this
async function createUser(user: User) {
    const result = await pgPool.query("INSERT INTO users(username, phone_number, email_address, profile_picture_link, balance, registration_timestamp, is_merchant) VALUES($1, $2, $3, $4, $5, $6, $7)",
        [user.username, user.phoneNumber, user.emailAddress, user.profilePictureLink, user.balance, user.registrationTimestamp, user.isMerchant]);
}


app.post("/createUser", async (req: Request, res: Response) => {
    await createUser(req.body);
    res.status(200).json({
        success: true,
    })
});

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, this is Express + TypeScript');
});

app.listen(port, () => {
    console.log(`[Server]: I am running at http://localhost:${port}`);
});
