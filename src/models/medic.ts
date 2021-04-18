import IFamily from './family';
import IFacility from './facility';

interface IMedic {
    resourceType: string;
    id: string;
    name: IFamily[];
    facility: IFacility[];
    active: boolean;
}

export default IMedic;