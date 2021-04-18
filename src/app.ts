import express from 'express';
import IMedic from './models/medic';
import chalk from 'chalk';

const app = express();

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

// in memory medic Ids
let medicIds: string[] = [];

app.get('/', (req, res) => {
    res.send('Hello, Burebista!');
})

app.post('/', (req, res) => {
    const medic: IMedic = req.body;

    if (medicIds.includes(medic.id)) {
        console.log(chalk.inverse.red('Suspicious request: resource id was introduced before!'))
    } else if (!medic.id) {
        console.log(chalk.inverse.red('Missing id!'));
    } else if (medic.resourceType !== 'Practitioner') {
        console.log(chalk.inverse.red('resourceType is not Practitioner!'));
        medicIds.push(medic.id);
    } else if (medic.active) {
        console.log(chalk.inverse.blueBright('name'));
        console.log(medic.name);
        console.log(chalk.inverse.blueBright('facility'));
        console.log(medic.facility);
        medicIds.push(medic.id);
    }

    res.send('Your request was processed');
})

app.listen(9999, () => console.log('Server running on port: 9999'));