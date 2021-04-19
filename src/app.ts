import express from 'express';
import IMedic from './models/medic';
import chalk from 'chalk';
import multer from 'multer';
import fs from 'fs';
import * as csv from 'fast-csv';
import path from 'path';

const app = express();

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

// in memory medic Ids
let medicIds: string[] = [];

// CSV file storage
const upload = multer({ dest: './uploads' });

app.get('/', (req, res) => {
    res.send('Hello, Burebista!');
})

app.post('/', upload.single('file'), (req, res) => {
    if (req.is('json') || req.is('*/json')) {
        const medic: IMedic = req.body;

        if (medicIds.includes(medic.id)) {
            console.log(chalk.inverse.red('Suspicious request: resource id was introduced before!'));
            res.sendStatus(403);
        } else if (!medic.id) {
            console.log(chalk.inverse.red('Missing id!'));
            res.sendStatus(400);
        } else if (medic.resourceType !== 'Practitioner') {
            console.log(chalk.inverse.red('resourceType is not Practitioner!'));
            medicIds.push(medic.id);
            res.sendStatus(400);
        } else if (medic.active) {
            console.log(chalk.inverse.blueBright('name'));
            console.log(medic.name[0].text);
            console.log(chalk.inverse.blueBright('facility'));
            medic.facility.forEach(el => {
                console.log(el.name);
            });
            medicIds.push(medic.id);
            res.sendStatus(201);
        }
    } else {
        let fileRows: any = [];

        // open uploaded file
        fs.createReadStream(path.resolve(req.file.path))
            .pipe(csv.parse({ headers: true }))
            .on('error', error => console.error(error))
            .on("data", function (data: any) {
                fileRows.push(data); // push each row
            })
            .on("end", function () {
                fs.unlinkSync(req.file.path);   // remove temp file
                //process "fileRows"
                console.log(fileRows);
            });

        res.sendStatus(201);
    }
})

app.listen(9999, () => console.log('Server running on port: 9999'));