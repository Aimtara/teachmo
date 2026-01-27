import SftpClient from 'ssh2-sftp-client';
import { DirectorySourceSecrets } from './secrets';

type SftpSourceConfig = {
  host?: string;
  port?: number;
  username?: string;
  remotePath?: string;
};

export async function fetchSftpSource(params: {
  sourceId: string;
  config: SftpSourceConfig;
  secrets: DirectorySourceSecrets;
}) {
  const { host, port = 22, username, remotePath } = params.config || {};
  const missingConfigFields: string[] = [];
  if (!host) missingConfigFields.push('host');
  if (!username) missingConfigFields.push('username');
  if (!remotePath) missingConfigFields.push('remotePath');
  if (missingConfigFields.length > 0) {
    throw new Error(`missing_sftp_config: missing ${missingConfigFields.join(', ')}`);
  }

  const password = params.secrets?.[params.sourceId]?.sftpPassword;
  if (!password) {
    throw new Error(`missing_sftp_password: missing sftpPassword secret for sourceId=${params.sourceId}`);
  }

  const client = new SftpClient();

  try {
    await client.connect({
      host,
      port: Number(port) || 22,
      username,
      password,
    });

    const fileBuffer = await client.get(remotePath);
    const csvText = Buffer.isBuffer(fileBuffer) ? fileBuffer.toString('utf-8') : String(fileBuffer);

    return { csvText, sourceRef: `${host}${remotePath}` };
  } finally {
    await client.end();
  }
}
