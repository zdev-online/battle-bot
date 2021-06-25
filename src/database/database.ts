import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Config from '../config/config';

const config = Config;
const { database } = config;

(async () => {
    try {
        await mongoose.connect(database.url, database.options);
    } catch (e) {
        console.error(`Ошибка подключения к базе данных: ${e.message}`);
    }
})();

export default mongoose;