import express from 'express';
import IMedic from './models/medic';
import chalk from 'chalk';
import multer from 'multer';
import fs from 'fs';
import * as csv from 'fast-csv';
import path from 'path';
import IMedicCSV from './models/medicCSV';
import IMedicFacility from './models/medicFacility';
import mime from 'mime-types';
import IAuthData from './models/authData';
import verifyToken from './utils/verifyToken';

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

app.post('/', verifyToken, upload.single('file'), (req: any, res) => {
    const authData: IAuthData = JSON.parse(Buffer.from(req.token, 'base64').toString());

    if (!authData.roles.includes('Admin') && !authData.roles.includes('Practitioner')) {
        console.log(chalk.inverse.red('Unauthorized user role!'));
        res.sendStatus(401);
    } else {
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
                    if (authData.facility.includes(el.value)) {
                        console.log(el.name);
                    }
                });
                medicIds.push(medic.id);
                res.sendStatus(201);
            }
        } else {
            if (req.file !== undefined) {
                // remove end of mime.contentType string regarding 'utf' details
                const mmType: string | false = mime.contentType(req.file.mimetype).toString().substring(0, 8);

                if (mmType === 'text/csv') {
                    let fileRows: IMedicCSV[] = [];

                    // open uploaded file
                    fs.createReadStream(path.resolve(req.file.path))
                        .pipe(csv.parse({ headers: true }))
                        .on('error', error => console.error(error))
                        .on("data", function (data: any) {
                            const temp: IMedicCSV = <IMedicCSV>({
                                id: +data.ID,
                                familyName: data[' FamilyName'].substring(1),
                                givenName: data[' GivenName'].substring(1),
                                facilityId: data[' FacilityId'].substring(1),
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
                            let medicFacility: IMedicFacility[] = [];
                            fileRows.forEach((row: IMedicCSV) => {
                                if (row.active) {
                                    const docIndex: number = medicFacility.findIndex(doc => doc.id === row.id);
                                    if (docIndex !== -1) {
                                        if (authData.facility.includes(row.facilityId)) {
                                            medicFacility[docIndex].facilityNameId.push(row.nameId);
                                        }
                                    } else {
                                        if (authData.facility.includes(row.facilityId)) {
                                            let hospital: string[] = [];
                                            hospital.push(row.nameId);
                                            const tempMedicFacility: IMedicFacility = <IMedicFacility>({
                                                id: row.id,
                                                familyName: row.familyName,
                                                givenName: row.givenName,
                                                facilityNameId: hospital
                                            })
                                            medicFacility.push(tempMedicFacility);
                                        }
                                    }
                                }
                            });
                            console.log(chalk.inverse.green('Medics active in hospitals:'))
                            medicFacility.forEach(el => {
                                console.log(`${el.familyName} ${el.givenName}: ${el.facilityNameId}`);
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
    }
})

app.listen(9999, () => console.log('Server running on port: 9999'));