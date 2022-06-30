import { Client } from 'twitter.js';
import {Command} from "./command/command";

require('dotenv').config()

const client = new Client({ events: ['FILTERED_TWEET_CREATE'] });

type Commands = {
    [key: string]: Command;
}

type CommandStructure = {
    command: string,
    arguments: string[],
}

const commands: Commands = {
    'ping': require('./command/ping').Ping,
}

function getParts(text: string): CommandStructure|null {
    console.debug('Breaking text into parts', text);
    let textParts = text.split(' ');
    let mentions = 0;
    if (!textParts) {
        return null;
    }

    for (let index in textParts) {
        const part = textParts.shift();
        if (part?.startsWith('@')) {
            // mention..
            if ('@tedcrypto_' === textParts[index]) {
                mentions++;
            }
        }
    }

    if (mentions === 0) {
        console.log('No mentions found!');
    }

    let command = textParts.shift();
    if (!command) {
        console.error('No command found!');
        return null;
    }

    return {'command': command, 'arguments': textParts};
}

async function main() {
    console.log('Starting up...');

    await client.login({
        consumerKey: process.env['TWITTER_CONSUMER_KEY'] ?? '',
        consumerSecret: process.env['TWITTER_CONSUMER_SECRET'] ?? '',
        accessToken: process.env['TWITTER_TOKEN_IDENTIFIER'] ?? '',
        accessTokenSecret: process.env['TWITTER_TOKEN_SECRET'] ?? '',
        bearerToken: process.env['TWITTER_BEARER_TOKEN'] ?? '',
    })

    let rules:any = [];
    (await client.filteredStreamRules.fetch([])).map(rule => {
        rules.push(rule.value);
    });

    if (!rules.includes('@tedcrypto_')) {
        console.log('Creating rule...');
        await client.filteredStreamRules.create({ value: '@tedcrypto_' });
    } else {
        console.log('Rules already created!');
    }

    client.on('filteredTweetCreate', async tweet => {
        try {
            const parts = getParts(tweet.text);
            if (!parts) {
                console.log('No parts found!');
                return;
            }

            console.log('Command: ' + parts.command, 'Arguments: ' + parts.arguments);
            if (!commands.hasOwnProperty(parts.command)) {
                console.log('Command not found!', parts.command);
            }

            await commands[parts.command]?.run(client, tweet, parts.arguments);
        } catch (error) {
            console.error(error);
        }
    });
}

main()