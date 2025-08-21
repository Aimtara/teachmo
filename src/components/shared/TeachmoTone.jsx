// Teachmo's adaptive tone and response system
export const TEACHMO_TONE = {
  // Warm openers based on context
  WARM_OPENERS: {
    general: [
      "Hi there! 👋",
      "Hey parent! 🌟", 
      "Hope you're doing well! ✨",
      "Great to see you! 💫"
    ],
    morning: [
      "Good morning, superhero! ☀️",
      "Morning! Ready to tackle the day? 🌅",
      "Hope your morning is off to a good start! ☕"
    ],
    stressed: [
      "I can sense you might be having a tough moment. 🤗",
      "Taking a deep breath with you right now... 💙",
      "You're doing an incredible job, even when it doesn't feel like it. 🫂"
    ],
    celebration: [
      "Way to go! 🎉",
      "That's amazing! 🌟",
      "You're absolutely crushing it! 💪"
    ]
  },

  // Empowering phrases
  EMPOWERING_PHRASES: [
    "You've got this! 💪",
    "Trust your instincts—they're spot on! ✨",
    "Every parent has been there, and you're handling it beautifully! 🌟",
    "This too shall pass, and you're stronger than you know! 💙",
    "Your love and effort make all the difference! ❤️"
  ],

  // Adaptive language based on parent state
  ADAPTIVE_RESPONSES: {
    frustrated: {
      tone: "gentle",
      phrases: [
        "That sounds really challenging.",
        "I hear you, and your feelings are completely valid.",
        "Parenting can be so tough sometimes.",
        "You're not alone in feeling this way."
      ]
    },
    overwhelmed: {
      tone: "calming",
      phrases: [
        "Let's take this one small step at a time.",
        "You don't have to figure it all out right now.",
        "It's okay to ask for help when you need it.",
        "Focus on just the next right thing."
      ]
    },
    confident: {
      tone: "celebratory",
      phrases: [
        "Look at you go!",
        "Your confidence is inspiring!",
        "You're really getting the hang of this!",
        "Keep up that amazing energy!"
      ]
    }
  }
};

export const generateWarmOpener = (context = 'general', parentMood = null) => {
  let openerType = context;
  
  if (parentMood === 'stressed' || parentMood === 'overwhelmed') {
    openerType = 'stressed';
  } else if (parentMood === 'happy' || parentMood === 'energized') {
    openerType = 'celebration';
  }
  
  const openers = TEACHMO_TONE.WARM_OPENERS[openerType] || TEACHMO_TONE.WARM_OPENERS.general;
  return openers[Math.floor(Math.random() * openers.length)];
};

export const getAdaptiveResponse = (parentState) => {
  const responses = TEACHMO_TONE.ADAPTIVE_RESPONSES[parentState];
  if (responses) {
    return responses.phrases[Math.floor(Math.random() * responses.phrases.length)];
  }
  return TEACHMO_TONE.EMPOWERING_PHRASES[Math.floor(Math.random() * TEACHMO_TONE.EMPOWERING_PHRASES.length)];
};

export const FALLBACK_RESPONSES = {
  general: [
    "I'm sorry, I don't have that exact answer—can I offer a quick breathing exercise or a simple check-in question?",
    "Hmm, I wish I had the perfect answer for that! How about we start with what feels most manageable right now?",
    "That's a great question! While I think about it, would a moment of mindfulness help?"
  ],
  
  technical_error: [
    "Hmm, Teachmo's on a coffee break! ☕ Try again in a moment?",
    "Oops! Something got tangled in my digital brain. Give me a quick sec to reboot! 🔄",
    "Well, that's embarrassing! Even AI parents have off moments. Let's try that again! 😅",
    "Looks like I need a moment to gather my thoughts! 🤔 How about we try a different approach?",
    "Technical hiccup on my end! Don't worry—I've got backup plans ready! 🌟"
  ],
  
  emotional_escalation: [
    "I can hear how hard this is for you right now. 💙",
    "Your feelings are so valid, and I'm here with you through this. 🤗",
    "Sometimes the best thing we can do is just breathe together for a moment."
  ],

  rate_limit: [
    "Hmm, Teachmo's on a coffee break! ☕ I've prepared some great suggestions for you while the AI recharges.",
    "Looks like I'm getting a lot of love today! 😅 Here are some curated recommendations while I catch my breath.",
    "Taking a quick breather! Good thing I always keep some awesome backup ideas ready for you! 🌟"
  ]
};

export const DISTRESS_RESPONSES = {
  breathing_exercise: {
    title: "Quick Breathing Reset",
    steps: [
      "Let's breathe in slowly for 4 counts... 1, 2, 3, 4",
      "Hold that breath gently for 4 counts... 1, 2, 3, 4", 
      "Now breathe out slowly for 6 counts... 1, 2, 3, 4, 5, 6",
      "You're doing great. Let's do that two more times together."
    ]
  },
  
  check_in_questions: [
    "What's one small thing that would make this moment feel a little easier?",
    "On a scale of 1-10, how are you feeling right now? No judgment—just checking in.",
    "What would you tell your best friend if they were in your shoes right now?",
    "What's one thing that's going well today, even if it feels small?"
  ]
};