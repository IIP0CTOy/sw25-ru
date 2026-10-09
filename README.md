# Sword World 2.5 for Foundry VTT v14 (sw25-ru)

An unofficial, fan-made game system that automates Sword World 2.5 play in Foundry Virtual Tabletop (v13–v14): character and monster sheets, dice rolls, combat, spells and effects. Interface in English, Russian

> **Beta.** The system is playable, but it has been tested by one group. Please report bugs: [Issues](https://github.com/IIP0CTOy/sw25-ru/issues).

It is a fork of [sw25-fvtt](https://github.com/jeannjeann/sw25-fvtt) by Jean.N and contributors (MIT licence).

## Rights and disclaimer

Sword World 2.5 is © GroupSNE and © KADOKAWA. This is an unofficial fan work, free of charge and not for profit; it is not affiliated with or endorsed by GroupSNE or KADOKAWA.

本作は、「グループSNE」および「株式会社KADOKAWA」が権利を有する『ソード・ワールド2.0/2.5』の、二次創作です。 (C)GroupSNE (C)KADOKAWA

The system is not a replacement for the rulebooks. It contains no rulebook text, no setting text, no monster entries, no spell or item descriptions, and no illustrations or maps from the books. You need the rulebooks to play.

## What is included

The automation needs a minimum of game terms to work. The system ships a starter set of 114 entries, created in your world the first time the GM logs in:

| Kind | Entries | What each entry holds |
|---|---|---|
| Classes | 19 | name, class category, experience table (A/B) |
| Skill checks | 43 | name, the class and ability it uses |
| Racial abilities | 22 | name, race, a one-line summary in our own words |
| Enhancer techniques | 30 | name, MP cost, duration, numeric modifier, a one-line summary in our own words |

These entries hold names and numeric values that originate from the rulebooks, plus short summaries written by the maintainer. The program code also contains the names of classes, races, backgrounds and about a hundred abilities, with the rule values the automation needs (for example the dice used for ability scores at character creation).

Also included: sample characters and monsters invented for this project (not taken from the books), and a built-in guide on how to enter your own content.

## What is not included, and how to add it

Weapons, armour, items, spells, talents and monsters are not included. Game masters add them themselves, from rulebooks they own:

- **Item constructor** — forms for weapons, armour, accessories, gear, spells, talents, alchemist evocations and bard songs. Players can use it for their own characters.
- **Monster generator** — type the numbers in, or paste the text of a stat block you have typed or copied yourself; multi-section monsters are supported.
- **ytsheet import** — character and monster sheets that players created on ytsheet can be loaded as JSON.

## What the automation does

- Works out accuracy, evasion, damage and defense from classes, abilities and equipment.
- One-click checks, attacks and spells: cost, roll, the target's save, damage or effect.
- Timed effects that expire by themselves in combat; regeneration and damage over time.
- Class resources: bard rhythm, alchemist cards, Enhancer techniques and others.
- Monsters with several sections, area and line abilities.
- Character creation wizard, rest, growth, loot and a simple shop.

## Installation

Foundry VTT → Game Systems → Install System → paste this manifest URL:

```
https://github.com/IIP0CTOy/sw25-ru/releases/latest/download/system.json
```

For the Russian interface of Foundry itself, install the `ru-ru` core translation module.

## Credits

- Original system: [Jean.N](https://github.com/jeannjeann) and the sw25-fvtt contributors (kuouvadis, HikariNoTsurugi, keyslock, Airamhh, Ryotai, CC8788).
- Based on the Boilerplate system template.
- Icons: MingCute Icon (https://www.mingcute.com/), Apache License 2.0. © 2025 MingCute Design.

## Bugs

Open an [issue](https://github.com/IIP0CTOy/sw25-ru/issues) with the Foundry version, client language, steps and console errors (F12). Please do not paste rulebook text.

## Licence

Program code: [MIT](LICENSE.txt). The licence covers the code only, not the Sword World 2.5 game, its terms or its world, which belong to their owners. Exception: the multi-section monsters code (`module/helpers/sections.mjs`) has its own licence since 2.4.1-ru.8 — all rights reserved, see [LICENSE-SECTIONS.txt](LICENSE-SECTIONS.txt).

If you are a rights holder and want something changed or removed, please open an issue or write to the maintainer.
