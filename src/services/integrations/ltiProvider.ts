import { apiClient } from '../core/client';

export interface LtiLaunchContext {
  courseId: string;
  userId: string;
  roles: string[];
  launchPresentationLocale?: string;
  launchId?: string;
  messageType?: string;
  deepLinking?: boolean;
}

export const LtiProvider = {
  /**
   * Validate LTI Launch Token (OIDC)
   * Typically handled backend-side, but frontend needs to initiate/handle redirect
   */
  async validateLaunch(idToken: string, state?: string): Promise<LtiLaunchContext> {
    return apiClient.post<LtiLaunchContext>('/api/lti/launch', {
      id_token: idToken,
      ...(state ? { state } : {})
    });
  },

  /**
   * Get Deep Linking Content items
   * Allows teachers to select Teachmo content to embed in LMS
   */
  async getDeepLinkingPayload(contentItems: any[], launchId: string): Promise<string> {
    return apiClient.post<string>('/api/lti/deep-linking', {
      launchId,
      items: contentItems
    });
  }
};
