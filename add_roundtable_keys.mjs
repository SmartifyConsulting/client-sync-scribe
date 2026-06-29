import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const newKeys = {
    "roundTables": {
        "title": "Round Table",
        "online": "online",
        "newTopic": "New Topic",
        "subject": "Subject",
        "describeCaseForTeam": "Describe the case for the team...",
        "cancel": "Cancel",
        "post": "Post",
        "noTopicsYet": "No round table topics yet.",
        "liveDiscussion": "Live discussion",
        "reply": "Reply...",
        "deleteTopic": "Delete topic",
        "topicCreated": "Topic created",
        "topicCreatedDescription": "Other doctors will be notified.",
        "error": "Error"
    }
};

const localeDir = path.join(__dirname, 'src/i18n/locales');
const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
    const filePath = path.join(localeDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    const data = JSON.parse(content);
    if (!data.roundTables) data.roundTables = {};
    Object.assign(data.roundTables, newKeys.roundTables);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
    console.log(`Updated ${file}`);
});

console.log('✓ All locale files updated with roundTables keys');
