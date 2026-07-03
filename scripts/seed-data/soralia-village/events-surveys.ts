import type {
  EventInput,
  SurveyInput,
  SurveyQuestionInput,
  SurveyResponseInput,
  CompetitionInput,
} from '../types';

export const events: EventInput[] = [
  {
    id: 'event-plant-swap',
    title: 'Monthly Plant Swap',
    description:
      'Exchange plants, seeds, and cuttings with fellow gardeners. Bring at least one plant to swap. All skill levels welcome. Refreshments provided.',
    date: new Date('2026-05-25T10:00:00+02:00'),
    location: 'Community Garden',
    organizer: 'Sarah Mitchell',
    image: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800&q=80',
    isPublic: true,
  },
  {
    id: 'event-morning-yoga',
    title: 'Morning Yoga in the Park',
    description:
      'Free yoga session for all levels. Bring your own mat. Suitable for beginners and experienced practitioners. Led by certified instructor Priya Naidoo.',
    date: new Date('2026-05-20T07:00:00+02:00'),
    location: 'Community Park',
    organizer: 'Priya Naidoo',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    isPublic: true,
  },
  {
    id: 'event-book-club-meeting',
    title: 'Book Club: "The Promise" by Damon Galgut',
    description:
      'Monthly book discussion. This month we are reading The Promise by Damon Galgut, winner of the Booker Prize. New members always welcome.',
    date: new Date('2026-05-28T18:30:00+02:00'),
    location: 'Community Hall',
    organizer: 'Emma Williams',
    isPublic: true,
  },
  {
    id: 'event-agm-2026',
    title: 'Annual General Meeting 2026',
    description:
      'Annual General Meeting of the Soralia Village Homeowners Association. Agenda includes financial report, board elections, and community updates. All owners must attend.',
    date: new Date('2026-06-15T19:00:00+02:00'),
    location: 'Community Hall',
    organizer: 'Board of Directors',
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80',
    isPublic: true,
  },
  {
    id: 'event-aloe-photography-workshop',
    title: 'Aloe Photography Workshop',
    description:
      'Learn how to capture stunning photos of our iconic aloe plants. Professional photographer Michael Chen will share tips on composition, lighting, and macro photography techniques.',
    date: new Date('2026-05-30T08:00:00+02:00'),
    location: 'Soralia Nature Reserve',
    organizer: 'Michael Chen',
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&q=80',
    isPublic: true,
  },
  {
    id: 'event-community-braai',
    title: 'Community Braai & Social',
    description:
      'Join your neighbours for a relaxed community braai. Bring your own meat and drinks. Sides and desserts provided by the social committee. Entertainment and activities for children.',
    date: new Date('2026-06-07T16:00:00+02:00'),
    location: 'Community Park',
    organizer: 'Social Committee',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
    isPublic: true,
  },
  {
    id: 'event-cleanup-day',
    title: 'Community Cleanup Day',
    description:
      'Help keep Soralia beautiful! Join us for a community cleanup of common areas, trails, and the wetland. Gloves and bags provided. Refreshments and thank-you braai afterwards.',
    date: new Date('2026-06-14T08:00:00+02:00'),
    location: 'Meeting Point: Community Hall',
    organizer: 'David van der Merwe',
    isPublic: true,
  },
];

export const surveys: SurveyInput[] = [
  {
    id: 'survey-community-priorities',
    title: 'Community Priorities Survey 2026',
    description:
      "Help us understand what matters most to you as a resident. Your feedback will guide the board's priorities and budget allocation for the coming year.",
    type: 'INTERNAL',
    status: 'ACTIVE',
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-06-30'),
  },
  {
    id: 'survey-facility-feedback',
    title: 'Community Hall Facility Feedback',
    description:
      'Now that the hall renovation is complete, we would love your feedback on the upgraded facilities and any suggestions for further improvements.',
    type: 'INTERNAL',
    status: 'ACTIVE',
    startDate: new Date('2026-04-10'),
    endDate: new Date('2026-05-31'),
  },
  {
    id: 'survey-event-interest',
    title: '2026 Event Interest Poll',
    description:
      'Which events would you like to see more of? Vote for your favourites and suggest new ideas for community activities.',
    type: 'INTERNAL',
    status: 'CLOSED',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-02-28'),
  },
];

export const surveyQuestions: SurveyQuestionInput[] = [
  {
    id: 'q-priorities-1',
    surveyId: 'survey-community-priorities',
    text: 'Which area should the board prioritise in 2026?',
    type: 'SINGLE_CHOICE',
    options: [
      'Road maintenance',
      'Security upgrades',
      'Landscaping',
      'Community facilities',
      'Conservation projects',
    ],
    required: true,
    order: 1,
  },
  {
    id: 'q-priorities-2',
    surveyId: 'survey-community-priorities',
    text: 'How satisfied are you with the current state of common areas?',
    type: 'RATING',
    options: ['1', '2', '3', '4', '5'],
    required: true,
    order: 2,
  },
  {
    id: 'q-priorities-3',
    surveyId: 'survey-community-priorities',
    text: 'Would you support an increase in levies to fund additional security?',
    type: 'YES_NO',
    options: ['Yes', 'No'],
    required: true,
    order: 3,
  },
  {
    id: 'q-priorities-4',
    surveyId: 'survey-community-priorities',
    text: 'What other suggestions do you have for improving our community?',
    type: 'TEXT',
    options: [],
    required: false,
    order: 4,
  },
  {
    id: 'q-facility-1',
    surveyId: 'survey-facility-feedback',
    text: 'How would you rate the renovated community hall?',
    type: 'RATING',
    options: ['1', '2', '3', '4', '5'],
    required: true,
    order: 1,
  },
  {
    id: 'q-facility-2',
    surveyId: 'survey-facility-feedback',
    text: 'Which improvements do you find most valuable?',
    type: 'MULTIPLE_CHOICE',
    options: ['Modern kitchen', 'Improved lighting', 'Wheelchair access', 'Restrooms', 'Parking'],
    required: true,
    order: 2,
  },
  {
    id: 'q-facility-3',
    surveyId: 'survey-facility-feedback',
    text: 'Any additional suggestions for the hall?',
    type: 'TEXT',
    options: [],
    required: false,
    order: 3,
  },
  {
    id: 'q-events-1',
    surveyId: 'survey-event-interest',
    text: 'Which events would you like to see more frequently?',
    type: 'MULTIPLE_CHOICE',
    options: [
      'Plant swaps',
      'Yoga sessions',
      'Book clubs',
      'Community braais',
      'Photography walks',
      'Kids activities',
      'Fitness classes',
    ],
    required: true,
    order: 1,
  },
  {
    id: 'q-events-2',
    surveyId: 'survey-event-interest',
    text: 'What day of the week works best for community events?',
    type: 'SINGLE_CHOICE',
    options: [
      'Weekday mornings',
      'Weekday evenings',
      'Saturday mornings',
      'Saturday afternoons',
      'Sunday mornings',
    ],
    required: true,
    order: 2,
  },
];

export const surveyResponses: SurveyResponseInput[] = [
  {
    id: 'resp-priorities-1',
    surveyId: 'survey-community-priorities',
    userId: 'user-john-smith',
    answers: {
      'q-priorities-1': 'Landscaping',
      'q-priorities-2': '4',
      'q-priorities-3': 'Yes',
      'q-priorities-4': 'More indigenous planting along the main entrance road.',
    },
  },
  {
    id: 'resp-priorities-2',
    surveyId: 'survey-community-priorities',
    userId: 'user-sarah-mitchell',
    answers: {
      'q-priorities-1': 'Security upgrades',
      'q-priorities-2': '3',
      'q-priorities-3': 'Yes',
      'q-priorities-4': '',
    },
  },
  {
    id: 'resp-priorities-3',
    surveyId: 'survey-community-priorities',
    userId: 'user-michael-chen',
    answers: {
      'q-priorities-1': 'Conservation projects',
      'q-priorities-2': '5',
      'q-priorities-3': 'No',
      'q-priorities-4': 'Great job on the wetland restoration! Keep it up.',
    },
  },
  {
    id: 'resp-facility-1',
    surveyId: 'survey-facility-feedback',
    userId: 'user-emma-williams',
    answers: {
      'q-facility-1': '5',
      'q-facility-2': ['Modern kitchen', 'Wheelchair access', 'Restrooms'],
      'q-facility-3': 'Would love to see a projector installed for movie nights.',
    },
  },
  {
    id: 'resp-facility-2',
    surveyId: 'survey-facility-feedback',
    userId: 'user-anna-patel',
    answers: {
      'q-facility-1': '4',
      'q-facility-2': ['Improved lighting', 'Restrooms'],
      'q-facility-3': '',
    },
  },
  {
    id: 'resp-events-1',
    surveyId: 'survey-event-interest',
    userId: 'user-john-smith',
    answers: {
      'q-events-1': ['Plant swaps', 'Community braais'],
      'q-events-2': 'Saturday mornings',
    },
  },
  {
    id: 'resp-events-2',
    surveyId: 'survey-event-interest',
    userId: 'user-priya-naidoo',
    answers: {
      'q-events-1': ['Yoga sessions', 'Fitness classes', 'Kids activities'],
      'q-events-2': 'Weekday mornings',
    },
  },
  {
    id: 'resp-events-3',
    surveyId: 'survey-event-interest',
    userId: 'user-marcus-johnson',
    answers: {
      'q-events-1': ['Photography walks', 'Community braais', 'Fitness classes'],
      'q-events-2': 'Saturday afternoons',
    },
  },
];

export const competitions: CompetitionInput[] = [
  {
    id: 'comp-aloe-wonderland',
    title: 'Aloe in Wonderland',
    description:
      'Calling all photographers! Capture the beauty of our iconic aloe plants in bloom and stand a chance to win amazing prizes. We are looking for stunning shots that showcase the unique character of aloes in their natural habitat. Whether you are a professional or an amateur with a smartphone, everyone is welcome to enter.',
    rules:
      '1. Photos must feature aloe species photographed within Soralia Village or the nature reserve.\n2. Maximum 3 entries per person.\n3. Photos must be your own original work.\n4. Submit in JPEG or PNG format, minimum 2000px on the longest side.\n5. Include the aloe species name and location where possible.\n6. Entries must be submitted by the closing date.\n7. Winners will be selected by a panel of judges including a professional photographer and a botanist.',
    prizeInfo:
      "🥇 First Prize: R2,500 cash + featured on community website\n🥈 Second Prize: R1,500 cash\n🥉 Third Prize: R750 cash\n🏅 People's Choice: R500 voucher for local nursery",
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-07-31'),
    status: 'ACTIVE',
    type: 'PHOTO',
    winnersCount: 3,
    entryCount: 12,
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&q=80',
  },
  {
    id: 'comp-garden-pride',
    title: 'Garden Pride 2026',
    description:
      'Show off your best garden! Enter our annual Garden Pride competition and inspire your neighbours with your green thumb. Categories include Best Indigenous Garden, Best Water-Wise Garden, and Best Container Garden.',
    rules:
      '1. Gardens must be within Soralia Village property boundaries.\n2. Submit 3-5 photos of your garden.\n3. Include a brief description of your garden design and plant selections.\n4. Gardens will be judged on creativity, sustainability, and visual appeal.\n5. Shortlisted gardens may be visited by judges for final assessment.',
    prizeInfo:
      '🥇 Best Overall: R3,000 garden centre voucher + trophy\n🥈 Best Indigenous Garden: R1,500 voucher\n🥉 Best Water-Wise Garden: R1,000 voucher\n🌺 Best Container Garden: R500 voucher',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-09-30'),
    status: 'DRAFT',
    type: 'PHOTO',
    winnersCount: 4,
    entryCount: 0,
    image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80',
  },
];
