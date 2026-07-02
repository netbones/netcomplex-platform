import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';
import { albums } from './albums';
import { announcements } from './announcements';
import { bookings } from './bookings';
import { contents } from './contents';
import { contentLikes } from './content-likes';
import { conversations } from './conversations';
import { conversationParticipants } from './conversation-participants';
import { events } from './events';
import { eventAttendees } from './event-attendees';
import { groups } from './groups';
import { groupMembers } from './group-members';
import { groupMembershipRequests } from './group-membership-requests';
import { households } from './households';
import { invitations } from './invitations';
import { members } from './members';
import { messages } from './messages';
import { notifications } from './notifications';
import { organizations } from './organizations';
import { premiumSeats } from './premium-seats';
import { profiles } from './profiles';
import { properties } from './properties';
import { propertyListings } from './property-listings';
import { propertyPremiumSeats } from './property-premium-seats';
import { resources } from './resources';
import { serviceBookings } from './service-bookings';
import { soloSeats } from './solo-seats';
import { standardSeats } from './standard-seats';
import { assistSessions } from './assist-sessions';
import { tenantAchievements } from './tenant-achievements';
import { tenantModules } from './tenant-modules';

export const tenantsRelations = relations(tenants, helpers => ({
  owner: helpers.one(users, {
    relationName: 'TenantOwner',
    fields: [tenants.ownerId],
    references: [users.id],
  }),
  Album: helpers.many(albums, { relationName: 'AlbumToTenant' }),
  Announcement: helpers.many(announcements, { relationName: 'AnnouncementToTenant' }),
  Booking: helpers.many(bookings, { relationName: 'BookingToTenant' }),
  Content: helpers.many(contents, { relationName: 'ContentToTenant' }),
  ContentLike: helpers.many(contentLikes, { relationName: 'ContentLikeToTenant' }),
  Conversation: helpers.many(conversations, { relationName: 'ConversationToTenant' }),
  ConversationParticipant: helpers.many(conversationParticipants, {
    relationName: 'ConversationParticipantToTenant',
  }),
  Event: helpers.many(events, { relationName: 'EventToTenant' }),
  EventAttendee: helpers.many(eventAttendees, { relationName: 'EventAttendeeToTenant' }),
  Group: helpers.many(groups, { relationName: 'GroupToTenant' }),
  GroupMember: helpers.many(groupMembers, { relationName: 'GroupMemberToTenant' }),
  GroupMembershipRequest: helpers.many(groupMembershipRequests, {
    relationName: 'GroupMembershipRequestToTenant',
  }),
  Household: helpers.many(households, { relationName: 'HouseholdToTenant' }),
  Invitation: helpers.many(invitations, { relationName: 'InvitationToTenant' }),
  Member: helpers.many(members, { relationName: 'MemberToTenant' }),
  Message: helpers.many(messages, { relationName: 'MessageToTenant' }),
  Notification: helpers.many(notifications, { relationName: 'NotificationToTenant' }),
  Organization: helpers.many(organizations, { relationName: 'OrganizationToTenant' }),
  PremiumSeat: helpers.many(premiumSeats, { relationName: 'PremiumSeatToTenant' }),
  Profile: helpers.many(profiles, { relationName: 'ProfileToTenant' }),
  Property: helpers.many(properties, { relationName: 'PropertyToTenant' }),
  PropertyListing: helpers.many(propertyListings, { relationName: 'PropertyListingToTenant' }),
  PropertyPremiumSeat: helpers.many(propertyPremiumSeats, {
    relationName: 'PropertyPremiumSeatToTenant',
  }),
  Resource: helpers.many(resources, { relationName: 'ResourceToTenant' }),
  ServiceBooking: helpers.many(serviceBookings, { relationName: 'ServiceBookingToTenant' }),
  SoloSeat: helpers.many(soloSeats, { relationName: 'SoloSeatToTenant' }),
  StandardSeat: helpers.many(standardSeats, { relationName: 'StandardSeatToTenant' }),
  assistSessions: helpers.many(assistSessions, { relationName: 'AssistSessionToTenant' }),
  tenantAchievements: helpers.many(tenantAchievements, {
    relationName: 'TenantToTenantAchievement',
  }),
  tenantModules: helpers.many(tenantModules, { relationName: 'TenantToTenantModule' }),
}));
