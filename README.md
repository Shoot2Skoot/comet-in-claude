# Astronaut buddy

A little astronaut who floats in a panel beside your Claude Code chat and acts out what Claude is doing. The default name is Comet. The little alien Comet sometimes pats is called Blip. You can rename either one when you install the mod, or later in `/config` (the alien's name can be up to 16 characters).

## Install

In the Claude desktop app: click + next to the prompt box, then Plugins, Add marketplace with `Shoot2Skoot/comet-in-claude`, then Add plugin.

At the prompt of a Claude Code terminal session:

```
/plugin install astronaut-buddy --marketplace Shoot2Skoot/comet-in-claude
```

Answer `y` to add the marketplace, then pick a scope (user installs it for every session).

From a shell:

```
claude plugin install astronaut-buddy --marketplace Shoot2Skoot/comet-in-claude
```

## What the astronaut does

Every state has a symbol bubble in the same spot by the helmet, so you can tell what's happening at a glance. Moods with several versions pick one as noted.

| When | Animation | Bubble |
| --- | --- | --- |
| A session starts | Flies in on a jetpack and waves | none |
| A prompt arrives while asleep | Stretches awake, then gets to thinking | sun |
| Nothing is happening | One of seven, switching every 30 seconds: waves, stargazes through a spyglass, juggles tiny planets, boops a passing star, pats Blip the alien (its name shows on a tag under it), draws a constellation, or fishes for stars | none |
| Claude is thinking | One of five, kept for the whole turn: rubs the helmet, a light bulb flickers on, reads a book, scribbles on a chalkboard, or spins a hologram globe | grey dots |
| Claude edits or writes files | Types on a floating laptop | green gear |
| Claude runs a shell command | Welds a panel, visor tinted | green gear |
| Claude commits or pushes with git | Waves a flag | green gear |
| Claude runs tests | Swirls a bubbling beaker | green gear |
| Claude installs packages | Unpacks a supply crate | green gear |
| Claude runs a build | Stacks blocks into a little rocket | green gear |
| Claude deletes files | Tosses a trash bag out the airlock | green gear |
| Claude searches or reads files | Mines a small asteroid | green gear |
| Claude reads an image or takes a screenshot | Snaps a photo with a camera held out to the side, and a polaroid pops out | green gear |
| Claude searches or fetches the web | Points a dish, radio waves | green gear |
| Claude drives a browser or the computer | Steers a little rover by remote | green gear |
| Claude uses memory | Writes in the captain's log | green gear |
| Claude sends a message (mail, Slack and so on) | Launches a message rocket | green gear |
| Claude uses any other connector (MCP) tool | Radios mission control | green gear |
| Claude updates the task list | Ticks off a clipboard | green gear |
| Claude enters or leaves plan mode | Unrolls a star chart and plots a route | green gear |
| Any other tool | Taps the wrist computer | green gear |
| A tool runs longer than 20 seconds | Checks the watch, taps a foot | hourglass |
| Claude sends out subagents | Helper drones orbit | purple network |
| Claude asks you a question | One of two: holds up a "?" sign, or raises a hand | blue ? |
| Claude needs your permission | Waves both arms, a little frantic | yellow ! |
| The conversation is compacting | Plugs in a fresh oxygen tank | teal tank |
| A turn finishes | One of three: somersault, fist pump with confetti, or a little dance. Turns over 2 minutes get fireworks | green check |
| You stop a turn | Shrugs | grey ~ |
| A tool call fails | One of four: backpack smokes, a wrench floats away, sees stars, or a facepalm | red X |
| Nothing for 5 minutes | Dozes off, either floating or zipped into a sleeping bag with a nightcap | none |

The gauge on the chest is oxygen: the share of the context window still free. It drains as the conversation grows (green, then amber, then red) and refills after a compaction. Below 20% the antenna light turns red and blinks, and the astronaut starts to sweat.

Type `/astronaut` to bring the panel back if you close it. In a terminal without the panel's picture, it shows one line of text instead, like "Comet is welding, oxygen 64%".
