export const churchFunnel = {
  eyebrow: "FOR CHURCHES PLANNING THEIR NEXT STEP",
  title: "Plan the right LED wall for your church.",
  description:
    "Get a clear direction for your stage, your team, and your investment—starting with a conversation about your space.",
  budgetNote: "For churches planning an LED wall project with a budget of $30,000 or more.",
  videoTitle: "A closer look at what’s possible.",
  videoDescription:
    "Our church LED wall walkthrough will live here. It will cover real installations, the equipment behind the screen, and how Axis helps your team get ready.",
  videoUrl: "",
  videoPlaceholder: "AXIS CHURCH LED WALL WALKTHROUGH",
  videoPlaceholderDetail: "Video coming soon · Explore the process below",
  steps: [
    {
      title: "Tell us about your project",
      text: "Share your church, goals, budget, and timeline so we can understand where you’re starting.",
    },
    {
      title: "Talk through your space",
      text: "We’ll discuss your stage, installation options, and what your team needs to make a decision.",
    },
    {
      title: "See your design and proposal",
      text: "Once we confirm the fit, we’ll use your space and measurements to develop a custom design and proposal.",
    },
    {
      title: "Move forward with a plan",
      text: "Review the scope together, then coordinate installation, team training, and support.",
    },
  ],
  roles: [
    "Pastor / leadership",
    "Production / technical director",
    "Worship leader",
    "Facilities / operations",
    "Volunteer / team member",
    "Other",
  ],
  budgets: ["Under $30,000", "$30,000–$50,000", "$50,000–$75,000", "$75,000+", "Not sure yet"],
  timelines: [
    "Within 3 months",
    "3–6 months",
    "6–12 months",
    "More than 12 months",
    "Exploring / no date yet",
  ],
  involvement: [
    "I approve the purchase",
    "I recommend options to leadership",
    "I’m gathering information for our team",
  ],
  formTitle: "Let’s see if your project is a fit.",
  formIntro: "A few details help us make your consultation specific to your church.",
  belowBudgetTitle: "Start by exploring your options.",
  belowBudgetText:
    "This consultation path is for projects with a planned budget of $30,000 or more. If your budget is smaller or still being discussed, you can request general information instead.",
  privacy:
    "We’ll use these details to respond to your project inquiry and arrange your consultation.",
};

export const quizCopy = {
  intro: "See how an LED wall could work in your church. Then tell us what you have in mind.",
  videoPlaceholder: "Video coming soon · Your walkthrough will appear here",
  cta: "I’m ready to plan my wall",
  ctaNote: "A few questions about your project. Designed for budgets of $30,000+.",
  budgetHelp: "Choose an approximate total project budget. This is a planning number, not a quote.",
  budgetUnknown: "I’m not sure yet",
  continue: "Continue",
  back: "Back",
  reviewTitle: "Ready to take the next step?",
  reviewHelp:
    "Check your answers before sending. We’ll review your project and contact you to arrange a consultation.",
  submit: "Send my project details",
  successTitle: "Your project is with the Axis team.",
  successText:
    "We’ll review your answers and contact you at the details you provided to arrange a consultation. No appointment has been booked yet.",
};
export const churchQuestions = [
  {
    id: "goal",
    title: "What would you like to do with your stage?",
    help: "Start with the main reason you’re exploring an LED wall.",
    kind: "choice",
    options: [
      "Replace our projector or screens",
      "Upgrade our current LED wall",
      "Build a new stage or space",
      "Add an LED wall for the first time",
    ],
  },
  {
    id: "budget",
    title: "What investment are you planning for?",
    help: quizCopy.budgetHelp,
    kind: "budget",
  },
  {
    id: "timeline",
    title: "When would you like it installed?",
    help: "An estimate is fine.",
    kind: "choice",
    options: churchFunnel.timelines,
  },
  {
    id: "role",
    title: "What’s your role at the church?",
    help: "This helps us understand your perspective.",
    kind: "choice",
    options: churchFunnel.roles,
  },
  {
    id: "involvement",
    title: "How are you involved in the decision?",
    help: "You don’t need to be the final decision-maker.",
    kind: "choice",
    options: churchFunnel.involvement,
  },
  {
    id: "church_name",
    title: "What’s the name of your church?",
    kind: "text",
    maxLength: 150,
    autoComplete: "organization",
  },
  {
    id: "city",
    title: "What city is your church in?",
    kind: "text",
    maxLength: 100,
    autoComplete: "address-level2",
  },
  { id: "state", title: "Which state is your church in?", kind: "state" },
  {
    id: "project",
    title: "Tell us a little about your space.",
    help: "Your current screens, approximate stage size, and what you want to improve.",
    kind: "textarea",
    maxLength: 1800,
  },
  {
    id: "photo",
    title: "Have a photo of your stage?",
    help: "Optional. A wide view helps us understand your space. JPG, PNG, or WebP, up to 8 MB.",
    kind: "photo",
  },
  { id: "name", title: "What’s your name?", kind: "text", maxLength: 100, autoComplete: "name" },
  {
    id: "email",
    title: "Where should we email you?",
    help: "We’ll use this to follow up about your project.",
    kind: "email",
    maxLength: 254,
    autoComplete: "email",
  },
  {
    id: "phone",
    title: "What’s the best number to reach you?",
    help: "For following up about your project and arranging your consultation.",
    kind: "tel",
    maxLength: 40,
    autoComplete: "tel",
  },
] as const;
