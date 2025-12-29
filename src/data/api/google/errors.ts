export class GoogleAuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "GoogleAuthError";
    }
}

export class GoogleDriveError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "GoogleDriveError";
        this.status = status;
    }
}

export class NoGoogleDriveSaveError extends Error {
    constructor(message = "No Google Drive save found.") {
        super(message);
        this.name = "NoGoogleDriveSaveError";
    }
}
