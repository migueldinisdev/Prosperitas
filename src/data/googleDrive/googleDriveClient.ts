export interface DriveFileMetadata {
    id: string;
    modifiedTime?: string;
    name?: string;
}

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export const assertGoogleClientId = (): void => {
    if (!GOOGLE_CLIENT_ID) {
        throw new Error(
            "Missing Google OAuth client ID. Set VITE_GOOGLE_CLIENT_ID in your environment."
        );
    }
};

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

const throwForStatus = async (response: Response): Promise<void> => {
    if (!response.ok) {
        const message = await response.text();
        console.error("[GoogleDriveClient] HTTP error", response.status, message || response.statusText);
        const error = new Error(message || response.statusText) as Error & {
            status?: number;
        };
        error.status = response.status;
        throw error;
    }
};

const createMultipartBody = (
    metadata: Record<string, unknown>,
    mimeType: string,
    content: string,
    boundary: string
): string => {
    return [
        `--${boundary}`,
        "Content-Type: application/json; charset=UTF-8",
        "",
        JSON.stringify(metadata),
        `--${boundary}`,
        `Content-Type: ${mimeType}`,
        "",
        content,
        `--${boundary}--`,
        "",
    ].join("\r\n");
};

export const findFileInAppData = async (
    accessToken: string,
    fileName: string
): Promise<DriveFileMetadata | null> => {
    console.debug("[GoogleDriveClient] findFileInAppData", { fileName });
    const query = encodeURIComponent(
        `name='${fileName}' and trashed=false`
    );
    const response = await fetch(
        `${DRIVE_API_BASE}/files?q=${query}&spaces=appDataFolder&fields=files(id,name,modifiedTime)`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );
    await throwForStatus(response);
    const data = (await response.json()) as {
        files?: DriveFileMetadata[];
    };
    console.debug("[GoogleDriveClient] findFileInAppData result", data.files?.[0] ?? null);
    return data.files?.[0] ?? null;
};

export const downloadFile = async (
    accessToken: string,
    fileId: string
): Promise<string> => {
    console.debug("[GoogleDriveClient] downloadFile", { fileId });
    const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );
    await throwForStatus(response);
    const text = await response.text();
    console.debug("[GoogleDriveClient] downloadFile size=", text.length);
    return text;
};

export const createFileInAppData = async (
    accessToken: string,
    fileName: string,
    mimeType: string,
    content: string
): Promise<DriveFileMetadata> => {
    console.debug("[GoogleDriveClient] createFileInAppData", { fileName, size: content.length });
    const boundary = `prosperitas_${Date.now()}`;
    const metadata = { name: fileName, parents: ["appDataFolder"] };
    const body = createMultipartBody(metadata, mimeType, content, boundary);
    const response = await fetch(
        `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,modifiedTime`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": `multipart/related; boundary=${boundary}`,
            },
            body,
        }
    );
    await throwForStatus(response);
    const result = (await response.json()) as DriveFileMetadata;
    console.debug("[GoogleDriveClient] createFileInAppData result", result);
    return result;
};

export const updateFile = async (
    accessToken: string,
    fileId: string,
    mimeType: string,
    content: string
): Promise<DriveFileMetadata> => {
    console.debug("[GoogleDriveClient] updateFile", { fileId, size: content.length });
    const boundary = `prosperitas_${Date.now()}`;
    const metadata = {};
    const body = createMultipartBody(metadata, mimeType, content, boundary);
    const response = await fetch(
        `${DRIVE_UPLOAD_BASE}/files/${fileId}?uploadType=multipart&fields=id,modifiedTime`,
        {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": `multipart/related; boundary=${boundary}`,
            },
            body,
        }
    );
    await throwForStatus(response);
    const result = (await response.json()) as DriveFileMetadata;
    console.debug("[GoogleDriveClient] updateFile result", result);
    return result;
};
