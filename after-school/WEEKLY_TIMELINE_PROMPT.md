# AFTER SCHOOL — Weekly Timeline Modification Prompt

## Objective

Modify the existing **AFTER SCHOOL** game without replacing or restructuring its current gameplay framework.

The player must retain the freedom to choose locations and scenes from the existing campus map. All existing scenes, dialogue events, choices, statistics, journal, phone interactions, save/load behaviour, visual assets and responsive layout must remain available.

Only implement the two changes described below.

## Change 1: Expand the timeline from one day to one week

- Change the narrative timeline from a single Monday afternoon to an after-school week.
- Use these day labels in order: **Monday, Tuesday, Wednesday, Thursday, Friday, Saturday and Sunday**.
- Keep the existing time-of-day clock and the existing time costs attached to choices.
- When a playable event concludes and returns the player to the campus map, advance to the next day and reset the clock to **3:40 PM**.
- Do not advance the day during intermediate steps of a multi-part event. For example, the library opening choice should lead to its follow-up event on the same day; the day advances only when that route returns to the map.
- The opening classroom event happens on Monday. After it resolves, the player reaches the map on Tuesday.
- Cap the timeline at Sunday. Once Sunday is reached, further completed routes remain on Sunday rather than overflowing into another week.
- Replace user-facing references to ending “Monday” with ending the “week”.
- Keep the map freely explorable. Do not impose a fixed linear scene order.
- Preserve location availability, completion rules and the basketball court closing rule.
- Save the current day in local storage so reloading or continuing restores the correct day.
- Use a new storage key so older one-day saves cannot corrupt the weekly timeline.

## Change 2: Show alternative endings after the personality result

- Keep the existing ending-selection logic and the player's primary personality result.
- Display the selected ending first, using the current title, narrative and reflection.
- In the same ending screen, add an **“Other Possible Endings”** section.
- List every ending the player did not receive.
- For each alternative ending, show its title and its existing reflection text, giving the player a concise indication of another possible route without labelling it as better or worse.
- Do not expose hidden thresholds, flags or numeric formulas.
- Preserve the existing result statistics, route counts, journal button and replay button.

## Constraints

- Do not replace the campus-map framework.
- Do not remove or rename existing scenes, locations, events, choices or endings.
- Do not modify `styles.css` or any PNG scene assets.
- Do not change the visual theme, colours, fonts, layout or map hotspot positions.
- Do not turn the game into a linear sequence.
- Do not add a build system, backend or external dependency.
- Keep the project runnable as static HTML/CSS/JavaScript.

## Acceptance Criteria

1. Starting a new game shows Monday and opens the original classroom event.
2. Resolving that event returns to the original campus map on Tuesday.
3. The player can freely choose any currently available original location.
4. Multi-part events remain on the same day until they return to the map.
5. Each completed return-to-map event advances one day, capped at Sunday.
6. Reloading and continuing restores the saved day.
7. Ending the week produces the same primary-ending logic as the original game.
8. The ending screen also lists all other possible ending titles and reflections.
9. The original CSS and scene images have no changes.
