TESTS

1. ## Desktop tests results:

- **Visit /dashboard → HomeLayer renders (Urgency/Today/Activity zones) + MyHomeSpace**

**Result**: I see Today (nothing scheduled for today) & Recent Activity (no recent activity) for the Zones + for the 'My Home Space' I see Property Details (No property linked to your profile), Household Members (No Household Members found) and My Profile (shows name, phone, email)

**Notes**: How are we displaying the Today activity? (If nothing scheduled we should offer suggestions?), How are we generating the activity log? User is linked to a property 183 Pagoda Rd, but we not seeing the property, so we should check why we not seeing the property.

Household Members should show User as member, if he or she is a resident in addition to being the property owner. Profile should show the allocated unit183@soralia.org address in addition to the signup email. We should review exactly how the internal addressing system is going to work, or defer to another Plan?

- **Click Services in sidebar → /dashboard/services shows maintenance + service widgets**
  **Result**: we see the requisite widgets, including My Services, Service Inquiries, Maintenance Requests, and Notifications. IN addition we see Community Events, which is an activity that should be under MyHomeSpace. The notifications widget is a usefull additional widget, BUT notifications should be part of the activity section in MyHomeSpace, with notifications bubbling up to the user without requiring a widget, this will be the most frequently visited section of the dashboard. Review how notifications will be implemented as activity (distinct from messaging)

- **Click Community → /dashboard/community shows events + content widgets**
  **Result**:I see My Content, Community Graph, Media Gallery (displays but with 'widget not found'), My Albums (displays loading albums, if no albums exist, should prompt user to create an album), My BookShelf + Premium Portfolio, Agent-Dashboard widget and Agent Activity Widget. These premium features don't seem to align with Community. Move Premium Portfolio to a separate section under Property Details for premium users. Agent Dashboard should rather be under Services. Agent Activity should be immediately seen under Activity section in Home (no widget) see activity review.
  We need to consider how Activity is going to percolate and bubble up into the activity section in a meaningful way.

- **Click Messages → /dashboard/messages shows messages + notifications widgets + "Manage Announcements" link (admin only)**
  **Result**:We see Overview (widget not found)
  I had to add the Messages widget, and can't seem to add the Notifications Widget, (does it exist, is it registered correctly?).
  We should consider how the messages space is designed, we probably need it to be closer to the Home Activity Zones design. Not everything leads itself to being a widget (nice to have a widget, but first lock down the core functionality) and this should also be considered as part of our general review.

In terminal I see:

```bash
GET /api/messages?unread=true 400 in 915ms
RangeError: Invalid time value
at Date1.toISOString (<anonymous>)
GET /api/bookings?date=today 500 in 971ms
GET /api/announcements?priority=urgent 200 in 1285ms
RangeError: Invalid time value
at Date1.toISOString (<anonymous>)
```

- **Click Admin → icon grid sub-launcher appears, click Users → admin-user widget renders**

**Result**: Admin icon is not showing even though my user is ADMIN. Same with Users icon.
So can't test this functionality.

- **Collapse sidebar to icon-only → icons still clickable, labels hidden**

**Result**:All good, however we do see i18n issues so we have spaces.home, spaces.services, spaces.community, spaces.messages.

- **Add Widget modal filters by current space**

**Result**: We don't see any filters, a search would be nice to call up the exact activity, space or widget.

2.  ## Mobile tests (use browser devtools responsive mode):

- **Bottom nav bar visible with 5 space icons**
  **Result**: Pass

- **Tap each space → navigates to correct URL**
  **Result**: Pass

- **Widget grid renders as stacked cards**
  **Result**: Pass

- **HomeLayer renders in single-column**

**Result**: Pass

3. **Backward compat test:**

- Set NEXT_PUBLIC_FOCUS_SPACES to empty/false
- Visit /dashboard → old tab UI renders
  **Result**: Pass

4. **Role tests**:

- As resident: Admin space hidden, non-admin widgets only
  **Result** Pass
- As admin: All spaces visible, admin widgets render
  **Result**: Fail

Investigate why ADMIN is failing.
