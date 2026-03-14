import { apiClient } from '@/services/core/client';

type EntityBridge = {
  list: (...args: unknown[]) => Promise<unknown>;
  filter: (...args: unknown[]) => Promise<unknown>;
  get: (...args: unknown[]) => Promise<unknown>;
  create: (...args: unknown[]) => Promise<unknown>;
  update: (...args: unknown[]) => Promise<unknown>;
  delete: (...args: unknown[]) => Promise<unknown>;
};

const entity = (name: string): EntityBridge => ({
  list: (...args: unknown[]) => apiClient.entity.list(name, ...args),
  filter: (...args: unknown[]) => apiClient.entity.filter(name, ...args),
  get: (...args: unknown[]) => apiClient.entity.get(name, ...args),
  create: (...args: unknown[]) => apiClient.entity.create(name, ...args),
  update: (...args: unknown[]) => apiClient.entity.update(name, ...args),
  delete: (...args: unknown[]) => apiClient.entity.delete(name, ...args)
});

export const Child = entity('Child');

export const ParentingTip = entity('ParentingTip');

export const Activity = entity('Activity');

export const LocalEvent = entity('LocalEvent');

export const LibraryResource = entity('LibraryResource');

export const UserBookmark = entity('UserBookmark');

export const UserActivity = entity('UserActivity');

export const Achievement = entity('Achievement');

export const UserAchievement = entity('UserAchievement');

export const Product = entity('Product');

export const Post = entity('Post');

export const Comment = entity('Comment');

export const Like = entity('Like');

export const Follow = entity('Follow');

export const Pod = entity('Pod');

export const PodMember = entity('PodMember');

export const Invitation = entity('Invitation');

export const EventFeedback = entity('EventFeedback');

export const EventAttendance = entity('EventAttendance');

export const Kudo = entity('Kudo');

export const CalendarEvent = entity('CalendarEvent');

export const PollVote = entity('PollVote');

export const PodChallenge = entity('PodChallenge');

export const ContactImport = entity('ContactImport');

export const SkillTrack = entity('SkillTrack');

export const ChildSkillTrack = entity('ChildSkillTrack');

export const JoinRequest = entity('JoinRequest');

export const JournalEntry = entity('JournalEntry');

export const UserMessage = entity('UserMessage');

export const UserConversation = entity('UserConversation');

export const Student = entity('Student');

export const Course = entity('Course');

export const Enrollment = entity('Enrollment');

export const Assignment = entity('Assignment');

export const School = entity('School');

export const District = entity('District');

export const StudentParentLink = entity('StudentParentLink');

export const TeacherClassAssignment = entity('TeacherClassAssignment');

export const Announcement = entity('Announcement');

export const SchoolEvent = entity('SchoolEvent');

export const EventRSVP = entity('EventRSVP');

export const Notification = entity('Notification');

export const InAppNotification = entity('InAppNotification');

export const CommunityVisibility = entity('CommunityVisibility');

export const UserProfile = entity('UserProfile');

export const SchoolDirectory = entity('SchoolDirectory');

export const SchoolParticipationRequest = entity('SchoolParticipationRequest');

export const Partner = entity('Partner');

export const PartnerEvent = entity('PartnerEvent');

export const PartnerResource = entity('PartnerResource');

export const PartnerOffer = entity('PartnerOffer');

export const UserOfferSave = entity('UserOfferSave');

export const ModerationReport = entity('ModerationReport');

export const CommunityGuideline = entity('CommunityGuideline');

export const ModerationAction = entity('ModerationAction');

export const Conversation = entity('Conversation');

export const ConversationMember = entity('ConversationMember');

export const Message = entity('Message');

export const MessageReaction = entity('MessageReaction');

export const Translation = entity('Translation');

export const Poll = entity('Poll');

export const Task = entity('Task');

export const FeatureFlag = entity('FeatureFlag');

export const AIConversation = entity('AIConversation');

export const AccessibilityPreference = entity('AccessibilityPreference');

export const PTADocument = entity('PTADocument');

export const SponsorshipPartner = entity('SponsorshipPartner');

export const ReferralCode = entity('ReferralCode');

export const PrivacyRequest = entity('PrivacyRequest');

export const AssignmentTopic = entity('AssignmentTopic');

export const Short = entity('Short');

export const ShortExposure = entity('ShortExposure');

export const ShortTemplate = entity('ShortTemplate');

export const ShortScene = entity('ShortScene');

export const ShortRenderJob = entity('ShortRenderJob');

export const ShortFeedback = entity('ShortFeedback');

export const ShortWatchEvent = entity('ShortWatchEvent');

export const SchoolResource = entity('SchoolResource');

export const ImportLog = entity('ImportLog');

export const CurriculumStandard = entity('CurriculumStandard');

export const UserContent = entity('UserContent');

export const Mentorship = entity('Mentorship');

export const MentorProfile = entity('MentorProfile');

export const Challenge = entity('Challenge');

export const ChallengeParticipation = entity('ChallengeParticipation');

export const Workshop = entity('Workshop');

export const WorkshopRegistration = entity('WorkshopRegistration');

export const LicenseAllocation = entity('LicenseAllocation');

export const UserLicense = entity('UserLicense');

export const UserFeedback = entity('UserFeedback');

export const PageVisit = entity('PageVisit');

export const UserNotificationSetting = entity('UserNotificationSetting');

export const PointTransaction = entity('PointTransaction');

export const RewardItem = entity('RewardItem');

export const UserRedemption = entity('UserRedemption');

export const Leaderboard = entity('Leaderboard');

export const AuditLog = entity('AuditLog');

export const WeeklyBrief = entity('WeeklyBrief');



// auth sdk:
export const User = apiClient.auth;
