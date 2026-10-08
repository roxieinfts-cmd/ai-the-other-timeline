window.GAME_CONTENT = {
  strategies: [
    { id: "direct", name: "Direct Generation", short: "Generate a starting point", description: "A.I.D.E. creates draft content for you to judge and revise." },
    { id: "support", name: "Information Support", short: "Organise useful information", description: "A.I.D.E. gathers clues and explains what each source can support." },
    { id: "guided", name: "Guided Thinking", short: "Think through questions", description: "A.I.D.E. asks questions while you build the reasoning." },
    { id: "review", name: "Feedback & Review", short: "Check work you already made", description: "A.I.D.E. points out gaps without replacing your decisions." }
  ],
  stages: [
    {
      id: "research",
      day: "MONDAY",
      time: "3:30 PM",
      place: "SCHOOL LIBRARY",
      scene: "library",
      title: "Find the story in the evidence",
      task: "Research plastic waste at Horizon Secondary School.",
      prompt: "The school survey counted 300 waste items. 120 were plastic bottles, 90 wrappers, 60 disposable cutlery, and 30 other items.",
      aiClaim: "Plastic bottles make up 40% of all waste at Horizon Secondary, so banning bottles is clearly the best solution.",
      choices: [
        { id: "sample", label: "Check what the 40% actually describes", response: "120 out of 300 items in this sample were plastic bottles. That does not describe every item discarded by the whole school.", flags: ["surveyInterpreted"], ownership: 15, quality: 9, time: 7, note: "School survey: 120 / 300 sampled items were plastic bottles (40%). This is simulated school data." },
        { id: "source", label: "Ask to inspect the source and calculation", response: "You verify the calculation and mark the school survey as simulated. The national statistic still needs a verified source.", flags: ["surveyInterpreted", "sourceChecked"], ownership: 25, quality: 11, time: 10, note: "Checked the sample calculation and labelled the source. National waste statistic remains unverified in this prototype." },
        { id: "accept", label: "Use the summary as written", response: "The paragraph sounds confident, but it turns a sample result into a school-wide claim and jumps directly to a policy decision.", flags: ["unverifiedContent"], ownership: 0, quality: 5, time: 1, note: "Saved an AI summary that may overstate what the school survey proves. Source status: unverified." }
      ]
    },
    {
      id: "writing",
      day: "WEDNESDAY",
      time: "4:00 PM",
      place: "SCHOOL LIBRARY",
      scene: "library",
      title: "Turn evidence into a proposal",
      task: "Choose two solutions and explain why they fit this school.",
      prompt: "Horizon has 800 students, two water dispensers and a simulated project budget of S$2,000. Some students say refill points are inconvenient.",
      solutions: [
        { id: "ban", label: "Ban plastic bottles", detail: "Fast policy change, but alternatives and enforcement matter." },
        { id: "dispensers", label: "Install more water dispensers", detail: "May improve access, but cost and maintenance need checking." },
        { id: "campaign", label: "Reusable bottle campaign", detail: "Lower setup barrier, but participation may fade." },
        { id: "recycling", label: "Improve recycling facilities", detail: "Supports disposal, but does not directly reduce use." }
      ],
      choices: [
        { id: "compare", label: "Compare feasibility before deciding", response: "You compare implementation, student needs and limitations before selecting two options.", flags: ["feasibilityCompared", "studentNeeds"], ownership: 25, quality: 13, time: 12, note: "Compared feasibility and student needs before choosing solutions." },
        { id: "needs", label: "Check what students actually need", response: "You keep the simulated feedback in view and avoid treating popularity as proven impact.", flags: ["studentNeeds"], ownership: 12, quality: 10, time: 8, note: "Considered student feedback. The feedback is simulated and does not prove effectiveness." },
        { id: "accept", label: "Use A.I.D.E.'s recommended pair", response: "You get a polished pair quickly, but its cost and fit have not been examined yet.", flags: [], ownership: 0, quality: 8, time: 2, note: "Accepted A.I.D.E.'s recommended solutions without checking feasibility." }
      ]
    },
    {
      id: "review",
      day: "THURSDAY",
      time: "7:30 PM",
      place: "JAMIE'S HOME",
      scene: "home",
      title: "One final claim looks impressive",
      task: "Review the evidence, feasibility and reasoning before submission.",
      prompt: "A.I.D.E. added: “Our school can reduce plastic bottle waste by 70% within one month.” No calculation or source is attached.",
      aiClaim: "70% reduction within one month",
      choices: [
        { id: "remove", label: "Remove the unsupported prediction", response: "The proposal becomes less dramatic and more defensible. You explain what evidence would be needed to estimate impact.", flags: ["unsupportedRemoved", "proposalRevised"], ownership: 25, quality: 15, time: 7, note: "Removed the unsupported 70% prediction and recorded its missing evidence." },
        { id: "verify", label: "Search the notes for supporting evidence", response: "No source in your notes supports the number. You remove it and add a limitation instead.", flags: ["unsupportedRemoved", "proposalRevised", "evidenceReviewed"], ownership: 30, quality: 16, time: 10, note: "Tried to verify the 70% prediction. No supporting source was available, so the claim was removed." },
        { id: "keep", label: "Keep it because it makes the proposal stronger", response: "The proposal sounds ambitious, but you will need to explain where the number came from on Friday.", flags: ["unsupportedRetained"], ownership: 0, quality: 4, time: 1, note: "Kept an unsupported 70% prediction. Source status: unverified." }
      ]
    }
  ]
};
