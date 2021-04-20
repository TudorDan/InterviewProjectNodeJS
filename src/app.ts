import express from 'express';
import IMedic from './models/medic';
import chalk from 'chalk';
import multer from 'multer';
import fs from 'fs';
import * as csv from 'fast-csv';
import path from 'path';
import IMedicHospital from './models/medHospital';
import IMedicWork from './models/medicWork';
import mime from 'mime-types';

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
        if (req.file !== undefined) {
            // remove end of mime.contentType string regarding 'utf' details
            const mmType: string | false = mime.contentType(req.file.mimetype).toString().substring(0, 8);

            if (mmType === 'text/csv') {
                let fileRows: IMedicHospital[] = [];

                // open uploaded file
                fs.createReadStream(path.resolve(req.file.path))
                    .pipe(csv.parse({ headers: true }))
                    .on('error', error => console.error(error))
                    .on("data", function (data: any) {
                        const temp: IMedicHospital = <IMedicHospital>({
                            id: +data.ID,
                            familyName: data[' FamilyName'].substring(1),
                            givenName: data[' GivenName'].substring(1),
                            facilityId: +data[' FacilityId'],
                            systemId: data[' SystemId'].substring(1),
                            nameId: data[' NameId'].substring(1),
                            active: data[' Active'] === ' true' ? true : false
                        });
                        if (fileRows.findIndex(doc => doc.id === temp.id
                            && doc.familyName !== temp.familyName) !== -1) {
                            console.log(chalk.inverse.red('Different names for same id!'));
                        }
                        fileRows.push(temp); // push each row
                    })
                    .on("end", function () {
                        fs.unlinkSync(req.file.path);   // remove temp file
                        //process "fileRows"
                        let medicWork: IMedicWork[] = [];
                        fileRows.forEach((element: IMedicHospital) => {
                            if (element.active) {
                                const docIndex: number = medicWork.findIndex(doc => doc.id === element.id);
                                if (docIndex !== -1) {
                                    medicWork[docIndex].nameId.push(element.nameId);
                                } else {
                                    let hospital: string[] = [];
                                    hospital.push(element.nameId);
                                    const temp2: IMedicWork = <IMedicWork>({
                                        id: element.id,
                                        familyName: element.familyName,
                                        givenName: element.givenName,
                                        nameId: hospital
                                    })
                                    medicWork.push(temp2);
                                }
                            }
                        });
                        console.log(chalk.inverse.green('Medics active in hospitals:'))
                        medicWork.forEach(el => {
                            console.log(`${el.familyName} ${el.givenName}: ${el.nameId}`);
                        });
                    });

                res.sendStatus(201);
            } else {
                res.sendStatus(204);
            }
        } else {
            res.sendStatus(204);
        }
    }
})

app.listen(9999, () => console.log('Server running on port: 9999'));