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
  if (!host || !username || !remotePath) throw new Error('missing_sftp_config');

  const password = params.secrets?.[params.sourceId]?.sftpPassword;
  if (!password) throw new Error('missing_sftp_password');

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
