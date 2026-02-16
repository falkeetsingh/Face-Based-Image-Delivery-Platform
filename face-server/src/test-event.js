const path = require('path');
const RegisterUser = require('./registerUser.js');
const ProcessEvent = require('./processEvent.js');
const {LoadModels} = require('./config/face-api.js');

async function run(){
    await LoadModels();

    const users = await RegisterUser();
    const eventImage = path.join(__dirname, '..', 'test-data', 'events', 'group.jpeg');

    const matchedUsers = await ProcessEvent(eventImage, users);

    console.log('Matched Users:', matchedUsers);
}

run();