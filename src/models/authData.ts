interface IAuthData {
    authenticated: boolean;
    iss: string;
    facility: string[];
    roles: string[];
}

export default IAuthData;