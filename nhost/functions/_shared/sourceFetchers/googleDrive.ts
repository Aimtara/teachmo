import { google } from 'googleapis';
import { sha256 } from '../directoryImportCore';
import { DirectorySourceSecrets } from './secrets';

export class GoogleDriveFetchError extends Error {
  reason: string;
  status?: number;

  constructor(reason: string, message?: string, status?: number) {
    super(message || reason);
    this.reason = reason;
    this.status = status;
  }
}

type GoogleDriveConfig = {
  fileId?: string;
  supportsAllDrives?: boolean;
  forceExportCsv?: boolean;
};

type GoogleDriveSecrets = {
  googleServiceAccountJson?: string;
};

function parseServiceAccount(raw: string) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new GoogleDriveFetchError('gdrive_auth_failed', 'Invalid service account JSON');
  }
}

function mapGoogleError(err: any, defaultReason = 'gdrive_fetch_failed') {
  const status = err?.code || err?.response?.status;
  if (status === 401) return new GoogleDriveFetchError('gdrive_auth_failed', err?.message, status);
  if (status === 403) return new GoogleDriveFetchError('gdrive_permission_denied', err?.message, status);
  if (status === 404) return new GoogleDriveFetchError('gdrive_file_not_found', err?.message, status);
  if (err instanceof GoogleDriveFetchError) return err;
  return new GoogleDriveFetchError(defaultReason, err?.message, status);
}

export async function fetchCsvFromGoogleDrive(params: {
  sourceId: string;
  config: GoogleDriveConfig;
  secrets: DirectorySourceSecrets;
}) {
  const { sourceId, config, secrets } = params;
  const fileId = String(config?.fileId ?? '').trim();
  const supportsAllDrives = Boolean(config?.supportsAllDrives ?? true);
  const forceExportCsv = Boolean(config?.forceExportCsv);

  if (!fileId) {
    throw new GoogleDriveFetchError('gdrive_file_not_found', 'fileId is required');
  }

  const sourceSecrets: GoogleDriveSecrets = secrets?.[sourceId] ?? {};
  const saRaw = sourceSecrets.googleServiceAccountJson || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saRaw) throw new GoogleDriveFetchError('gdrive_auth_failed', 'Missing Google service account JSON');

  const sa = parseServiceAccount(saRaw);
  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  const drive = google.drive({ version: 'v3', auth });

  try {
    const meta = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType,modifiedTime,md5Checksum',
      supportsAllDrives,
    });

    const name = meta.data.name || fileId;
    const mimeType = meta.data.mimeType || '';
    const modifiedTime = meta.data.modifiedTime || '';

    let csvText = '';
    if (forceExportCsv || mimeType === 'application/vnd.google-apps.spreadsheet') {
      try {
        const exported = await drive.files.export(
          { fileId, mimeType: 'text/csv' },
          { responseType: 'text' as any }
        );
        csvText = String((exported as any).data ?? '');
      } catch (err: any) {
        throw mapGoogleError(err, 'gdrive_export_failed');
      }
    } else {
      const downloaded = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives },
        { responseType: 'text' as any }
      );
      csvText = String((downloaded as any).data ?? '');
    }

    const sourceHash = sha256(`${sourceId}::${fileId}::${modifiedTime}::${csvText}`);

    return {
      csvText,
      sourceRef: `google_drive:${name}`,
      sourceHash,
      meta: {
        fileId,
        name,
        mimeType,
        modifiedTime,
        md5: meta.data.md5Checksum,
      },
    };
  } catch (err: any) {
    throw mapGoogleError(err);
  }
}
