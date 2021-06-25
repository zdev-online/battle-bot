import fs from 'fs';
import path from 'path';

interface Config {
    token: string,
    user_token: string,
    database: {
        url: string
        options: {
            useCreateIndex: boolean,
            useFindAndModify: boolean,
            useNewUrlParser: boolean,
            useUnifiedTopology: boolean
        }
    }
    startStuff: number[],
    timeout: number,
    debug: boolean,
    startMessage: string
}

const defaultConfig = {
    token: "",
    user_token: "",
    database: {
        url: "",
        options: {
            useCreateIndex: true,
            useFindAndModify: true,
            useNewUrlParser: true,
            useUnifiedTopology: true
        }
    },
    startStuff: [],
    timeout: 10,
    debug: false,
    startMessage: 'Чтобы я работал корректно - выдайте мне права администратора!'
}

if(!fs.existsSync(path.resolve(__dirname, './', 'config.json'))){
    fs.writeFileSync(path.resolve(__dirname, './', 'config.json'), JSON.stringify(defaultConfig, null, 4), {encoding: 'utf-8'});
}

export default ((): Config => JSON.parse(fs.readFileSync(path.resolve(__dirname, './', 'config.json'), { encoding: 'utf-8' } )))();