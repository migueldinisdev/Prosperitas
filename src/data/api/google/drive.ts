import { GoogleDriveError } from "./errors";

const DRIVE_BASE_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

const buildMultipartBody = (
    metadata: Record<string, unknown>,
    content: string
) => {
    const boundary = `prosperitas-${crypto.randomUUID()}`;
    const body = [
        `--${boundary}`,
        "Content-Type: application/json; charset=UTF-8",
        "",
        JSON.stringify(metadata),
        `--${boundary}`,
        "Content-Type: application/json",
        "",
        content,
        `--${boundary}--`,
        "",
    ].join("\r\n");

    return {
        body,
        boundary,
    };
};

const assertOk = async (response: Response) => {
    if (response.ok) {
        return;
    }

    const text = await response.text();
    throw new GoogleDriveError(
        text || response.statusText || "Google Drive request failed.",
        response.status
    );
};

export const findAppDataFile = async (
    accessToken: string,
    fileName: string
): Promise<{ id: string; name: string; modifiedTime: string } | null> => {
    const query = encodeURIComponent(
        `name='${fileName.replace(/'/g, "\\'")}' and trashed=false`
    );
    const url = `${DRIVE_BASE_URL}?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    await assertOk(response);
    const data = (await response.json()) as {
        files?: { id: string; name: string; modifiedTime: string }[];
    };

    return data.files?.[0] ?? null;
};

export const downloadFile = async (
    accessToken: string,
    fileId: string
): Promise<string> => {
    const url = `${DRIVE_BASE_URL}/${fileId}?alt=media`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    await assertOk(response);
    return response.text();
};

export const createAppDataFile = async (
    accessToken: string,
    fileName: string,
    content: string
): Promise<{ id: string }> => {
    const metadata = {
        name: fileName,
        parents: ["appDataFolder"],
    };
    const { body, boundary } = buildMultipartBody(metadata, content);

    const response = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
    });

    await assertOk(response);
    return (await response.json()) as { id: string };
};

export const updateAppDataFile = async (
    accessToken: string,
    fileId: string,
    content: string
): Promise<{ id: string }> => {
    const metadata = {
        mimeType: "application/json",
    };
    const { body, boundary } = buildMultipartBody(metadata, content);

    const response = await fetch(
        `${DRIVE_UPLOAD_URL}/${fileId}?uploadType=multipart`,
        {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": `multipart/related; boundary=${boundary}`,
            },
            body,
        }
    );

    await assertOk(response);
    return (await response.json()) as { id: string };
};
