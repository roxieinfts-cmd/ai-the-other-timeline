window.AFTER_SCHOOL_CONTENT = {
  locations: {
    library: { name: "Library", subtitle: "The opening slide is still blank.", scene: "library" },
    court: { name: "Basketball Court", subtitle: "Jay said 5 PM. He is probably waiting.", scene: "court" },
    home: { name: "Go Home", subtitle: "Your headphones and unfinished track are there.", scene: "home" },
    phone: { name: "Phone", subtitle: "Messages, comments, and everything else.", scene: "map" }
  },

  events: {
    last_bell: {
      scene: "classroom",
      location: "CLASSROOM · 3:40 PM",
      speaker: "NARRATOR",
      portrait: "YOU",
      title: "The last bell",
      body: [
        "The last bell rings. Chairs scrape against the floor. Someone is already halfway out before the teacher finishes speaking.",
        "Your phone vibrates twice."
      ],
      messages: [
        { from: "MAYA · GROUP PROJECT", text: "We still don’t have an opening for Friday. I can finish the data slides tonight. Can you handle the first minute?" },
        { from: "JAY · BASKETBALL", text: "Court at 5? Don’t disappear again 😭" }
      ],
      choices: [
        { label: "Reply to Maya first", hint: "The project is already behind.", time: 5, effects: { connection: 2 }, flags: ["repliedMaya"], response: "You tell Maya you will look at the opening before anything else.", note: "You answered Maya before leaving class.", next: "map" },
        { label: "Reply to Jay first", hint: "You promised you would show up this week.", time: 5, effects: { connection: 2 }, flags: ["repliedJay", "promisedBasketball"], response: "You send: “5 PM. I’ll be there.”", note: "You promised Jay you would be at the court at 5.", next: "map" },
        { label: "Put the phone away", hint: "Neither conversation has to begin yet.", time: 0, effects: {}, flags: ["ignoredMessages"], response: "The screen goes dark. The messages do not disappear.", note: "You left both messages unanswered after school.", next: "map" }
      ]
    },

    library_start: {
      scene: "library",
      location: "SCHOOL LIBRARY",
      speaker: "YOU",
      portrait: "YOU",
      title: "The blank opening",
      body: [
        "The library is colder than the classroom and almost empty.",
        "Slide 1: title. Slide 2: blank. Slide 3: Maya’s chart, already half finished.",
        "The cursor blinks on the empty opening slide."
      ],
      choices: [
        { label: "Ask AI to write the opening", hint: "Fast start · you will still need to judge it", time: 20, effects: { project: 20 }, flags: ["usedAiDraft"], response: "A polished paragraph appears. It sounds important. It also sounds like every presentation you have ever heard.", note: "You used AI to generate a complete starting draft.", next: "library_ai" },
        { label: "Write a draft, then ask AI for feedback", hint: "More time · keeps your own starting point", time: 45, effects: { project: 25, personal: -5 }, flags: ["usedAiFeedback", "understandsOpening"], response: "AI flags a long second sentence. You keep your own example and revise the structure.", note: "You wrote the opening and used AI to review it.", next: "library_feedback" },
        { label: "Ask Maya to write it together", hint: "Shared time · depends on her availability", time: 15, effects: { project: 5, connection: 5 }, flags: ["askedCollaboration"], response: "Maya replies: “Twenty minutes. Meet at the canteen?”", note: "You invited Maya to shape the opening with you.", next: "library_together" }
      ]
    },

    library_ai: {
      scene: "library",
      location: "SCHOOL LIBRARY",
      speaker: "MAYA · MESSAGE",
      portrait: "M",
      title: "The sentence that sounds important",
      body: [
        "“Artificial intelligence is transforming education at an unprecedented pace…”",
        "Maya replies: “What do you mean by ‘unprecedented pace’? Is that from our data?”"
      ],
      choices: [
        { label: "Keep it. It sounds strong.", hint: "Very quick · leaves a question behind", time: 5, effects: { project: 5 }, flags: ["uncheckedClaim"], response: "You call it an introduction. Maya types for a while, then sends: “Okay… just make sure we can explain it.”", note: "You kept an impressive sentence without checking what supported it.", complete: "library", next: "map" },
        { label: "Check whether the sentence is supported", hint: "Takes time · may change the draft", time: 20, effects: { project: 10 }, flags: ["checkedClaim", "understandsOpening"], response: "None of the group’s sources support the phrase. You replace it with something narrower.", note: "You checked the claim and rewrote it using the group’s actual evidence.", complete: "library", next: "map" },
        { label: "Delete it and write a simpler line", hint: "Slower · sounds more like you", time: 25, effects: { project: 10, personal: -5 }, flags: ["understandsOpening"], response: "The new version is less impressive. It sounds more like something you would actually say.", note: "You replaced the AI wording with a simpler opening you could explain.", complete: "library", next: "map" }
      ]
    },

    library_feedback: {
      scene: "library",
      location: "SCHOOL LIBRARY",
      speaker: "NARRATOR",
      portrait: "YOU",
      title: "One more revision",
      body: [
        "You shorten the first paragraph. Then you ask for feedback again.",
        "The opening is getting cleaner, but the time in the corner of your screen keeps changing."
      ],
      choices: [
        { label: "Accept the current version", hint: "Done for now", time: 5, effects: { project: 5 }, flags: ["finishedRevision"], response: "You stop before the paragraph loses your voice.", note: "You decided the current draft was good enough to share.", complete: "library", next: "map" },
        { label: "Ask for one more revision", hint: "A little smoother · a little less yours", time: 20, effects: { project: 5, personal: -5 }, flags: ["overedited"], response: "The paragraph is smoother now. Somehow, you like it less.", note: "You revised the opening again after it was already workable.", complete: "library", next: "map" },
        { label: "Send it to Maya now", hint: "Early feedback from a real teammate", time: 10, effects: { project: 5, connection: 5 }, flags: ["sharedEarly"], response: "Maya replies: “First half is good. Second half sounds like a university brochure.”", note: "You shared an imperfect draft early enough for Maya to respond.", complete: "library", next: "map" }
      ]
    },

    library_together: {
      scene: "library",
      location: "CANTEEN TABLE",
      speaker: "MAYA",
      portrait: "M",
      title: "Two people, one laptop",
      body: [
        "Most stalls are closing. Rain taps against the metal roof.",
        "Maya wants to begin with the strongest number. You want to begin with a student’s evening."
      ],
      choices: [
        { label: "Use Maya’s data-first opening", hint: "Clear and efficient", time: 20, effects: { project: 20, connection: 5 }, flags: ["dataOpening", "understandsOpening"], response: "The opening becomes direct and easy to defend. Your original story moves to slide three.", note: "You chose Maya’s data-first structure.", complete: "library", next: "map" },
        { label: "Defend the story-first opening", hint: "More personal · creates friction", time: 25, effects: { project: 15, connection: -2 }, flags: ["storyOpening", "understandsOpening"], response: "Maya exhales. “Fine. But it needs to lead somewhere.”", note: "You kept the story-first opening after explaining why it mattered.", complete: "library", next: "map" },
        { label: "Combine both ideas", hint: "Strongest result · longest discussion", time: 35, effects: { project: 25, connection: 5, personal: -5 }, flags: ["hybridOpening", "understandsOpening"], response: "It takes longer than either plan. For once, neither of you hates the result.", note: "You and Maya combined a personal opening with the group’s strongest evidence.", complete: "library", next: "map" }
      ]
    },

    court: {
      scene: "court",
      location: "COVERED COURT",
      speaker: "JAY",
      portrait: "J",
      title: "One player short",
      body: [
        "The rain has pushed everyone onto the covered court.",
        "Jay is sitting on the floor, spinning the ball between his hands. He looks at the clock behind you before looking at you."
      ],
      choices: [
        { label: "Stay for the full game", hint: "75 min · be fully here", time: 75, effects: { connection: 20, personal: -10 }, flags: ["playedFullGame", "keptBasketballPromise"], response: "For twenty minutes, you keep thinking about the slides. Then someone passes you the ball, and you stop.", note: "You stayed for a full game with Jay.", complete: "court", next: "map" },
        { label: "Play one short game", hint: "35 min · keep the evening moving", time: 35, effects: { connection: 10, personal: -5 }, flags: ["playedShortGame", "keptBasketballPromise"], response: "Jay points at the clock. “Thirty-five minutes. I’m timing you.”", note: "You played one short game before leaving.", complete: "court", next: "map" },
        { label: "Sit and watch for a while", hint: "20 min · talk without committing to a game", time: 20, effects: { connection: 6, personal: 2 }, flags: ["watchedGame"], response: "Jay laughs. “Watching us is probably more stressful than playing.”", note: "You stayed with Jay for a while without joining the game.", complete: "court", next: "map" },
        { label: "Tell Jay you need to go", hint: "5 min · protect the rest of the evening", time: 5, effects: { connection: -8 }, flags: ["missedBasketball"], response: "Jay nods. If you promised earlier, the silence lasts a little longer.", note: "You left the court to protect time for other plans.", complete: "court", next: "map" }
      ]
    },

    maya_comment: {
      scene: "home",
      location: "PHONE · MAYA",
      speaker: "MAYA",
      portrait: "M",
      title: "One unresolved comment",
      body: ["Maya left a comment on the opening. She is still online."],
      choices: [
        { label: "Open the slides and resolve it now", hint: "25 min · closes the loop", time: 25, effects: { project: 10, connection: 5 }, flags: ["resolvedMayaComment"], response: "The comment disappears. A few seconds later, Maya reacts with a thumbs-up.", note: "You returned to the opening and resolved Maya’s final comment.", next: "map" },
        { label: "Acknowledge it and do it tomorrow", hint: "5 min · honest delay", time: 5, effects: { connection: 1 }, flags: ["promisedTomorrow"], response: "You tell Maya when you will look at it. She replies: “Okay, before lunch?”", note: "You acknowledged Maya’s comment and set a time for tomorrow.", next: "map" },
        { label: "Leave it unread", hint: "No time · conversation remains open", time: 0, effects: {}, flags: ["ignoredMayaComment"], response: "The notification stays at the top of the screen.", note: "You left Maya’s comment unread tonight.", next: "map" }
      ]
    },

    personal: {
      scene: "home",
      location: "BEDROOM",
      speaker: "NARRATOR",
      portrait: "YOU",
      title: "Twenty-eight seconds",
      body: [
        "Your room is quiet except for the ceiling fan.",
        "The music track on your laptop is twenty-eight seconds long. It has been twenty-eight seconds long for three weeks."
      ],
      choices: [
        { label: "Add a new section", hint: "50 min · make something new", time: 50, effects: { personal: 25 }, flags: ["advancedPersonalProject"], response: "The track is no longer twenty-eight seconds long. You replay the new section twice.", note: "You added a new section to your personal music project.", complete: "home", next: "map" },
        { label: "Clean up what already exists", hint: "30 min · quieter progress", time: 30, effects: { personal: 15 }, flags: ["cleanedPersonalProject"], response: "Nothing new appears, but the parts that were already there finally fit together.", note: "You refined the part of your personal project that already existed.", complete: "home", next: "map" },
        { label: "Listen once and close it", hint: "10 min · stay connected without committing", time: 10, effects: { personal: 2 }, flags: ["heardPersonalProject"], response: "For twenty-eight seconds, the room belongs to the track. Then the tab closes.", note: "You listened to your unfinished track before closing it.", complete: "home", next: "map" }
      ]
    },

    scroll_1: {
      scene: "home",
      location: "PHONE",
      speaker: "NARRATOR",
      portrait: "▣",
      title: "Just one video",
      body: ["One video becomes five. Five becomes something you stop counting."],
      choices: [
        { label: "Keep scrolling", hint: "20 min · the feed already has another video", time: 20, effects: {}, flags: ["scrolledOnce"], response: "The next video starts before you decide to watch it.", note: "You spent twenty minutes in the feed.", next: "scroll_2" },
        { label: "Put the phone down", hint: "Return to your evening", time: 5, effects: {}, flags: ["stoppedScrolling"], response: "The room sounds louder when the screen goes dark.", note: "You closed the feed after a few videos.", next: "map" }
      ]
    },

    scroll_2: {
      scene: "home",
      location: "PHONE",
      speaker: "NARRATOR",
      portrait: "▣",
      title: "The next one is shorter",
      body: ["At least, that is what you tell yourself. A message from Maya slides across the top and disappears."],
      choices: [
        { label: "Keep scrolling", hint: "30 min · messages can wait", time: 30, effects: {}, flags: ["scrolledTwice"], response: "You lower the brightness. Somehow that makes it feel less late.", note: "You kept scrolling after noticing Maya’s message.", next: "scroll_3" },
        { label: "Close the app and check the evening", hint: "Stop here", time: 5, effects: {}, flags: ["stoppedScrolling"], response: "You finally notice how much the light outside has changed.", note: "You stopped scrolling and returned to the evening.", next: "map" }
      ]
    },

    scroll_3: {
      scene: "home",
      location: "PHONE",
      speaker: "NARRATOR",
      portrait: "▣",
      title: "Where did the time go?",
      body: ["Your battery is at 11%. You cannot remember the last three videos clearly. One of them was funny. Probably."],
      choices: [
        { label: "Lock the phone", hint: "The evening continues, if any is left", time: 40, effects: {}, flags: ["lostTrackOfTime"], response: "The screen goes dark. The clock does not go backward.", note: "You lost track of time while scrolling.", next: "map" }
      ]
    }
  },

  endings: [
    {
      id: "reliable",
      title: "The Reliable Teammate",
      test: "reliable",
      text: ["The opening is not perfect, but you know why every sentence is there.", "Maya has stopped editing. That might be the clearest sign that the group is okay."],
      reflection: "You completed the opening and could explain the choices behind it."
    },
    {
      id: "polished",
      title: "The Polished Stranger",
      test: "polished",
      text: ["The opening looks finished. The words move smoothly from one sentence to the next, but they do not feel connected to anything in your head.", "Maya leaves one final comment: “Can you explain this part tomorrow?”"],
      reflection: "The work looks complete. One question remains unanswered."
    },
    {
      id: "social",
      title: "The Social Evening",
      test: "social",
      text: ["Jay sends the photo from the court. Everyone is blurry except you.", "The group slides are still open on your laptop. You decide that both things can be true."],
      reflection: "You showed up for your friends. Tomorrow begins with unfinished work."
    },
    {
      id: "creator",
      title: "The Evening You Kept",
      test: "creator",
      text: ["The presentation still needs work. But the track is no longer twenty-eight seconds long.", "Tomorrow will be busier. Tonight, at least, contains something that is yours."],
      reflection: "You made progress on something personal. The group project will need attention tomorrow."
    },
    {
      id: "scroll",
      title: "The Endless Scroll",
      test: "scroll",
      text: ["The group slides are still open. The music project is still twenty-eight seconds long.", "The evening did not end badly. It simply disappeared."],
      reflection: "You followed the feed until the rest of the evening became difficult to see."
    },
    {
      id: "compromise",
      title: "The Compromise",
      test: "default",
      text: ["Nothing is completely finished. Something moved forward in every part of your evening.", "It does not feel like winning. It also does not feel like losing. It feels like Monday."],
      reflection: "You kept several promises, even if none of them received all your time."
    }
  ]
};
