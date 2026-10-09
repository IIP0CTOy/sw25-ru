/**
 * [2026-10-07] Built-in guide: how to make items, spells, talents, alchemist cards and monsters
 * with the tools of this system. Written for this system (it describes its windows and buttons);
 * it contains no rulebook text. starter.mjs turns it into a Journal compendium of the world.
 * Every page is a [ru, en] pair.
 */
export const GUIDE_TITLE = ["SW25: как создавать предметы и умения", "SW25: how to make items and abilities"];

export const GUIDE = [
  {
    title: ["1. С чего начать", "1. Getting started"],
    html: [
      `<p>Публичная версия системы идёт без данных из книг. Оружие, броню, заклинания, таланты и монстров мастер вносит сам, по своим книгам. Ниже — как это сделать быстро.</p>
<h3>Что уже есть в мире</h3>
<ul>
<li><b>Стартовые компендиумы</b> (вкладка «Компендиумы», папка «SW25 — Starter»): классы, проверки умений, расовые способности, техники Усилителя. Только названия и числа.</li>
<li><b>Примеры</b> (вкладка «Актёры», папка «SW25 — Примеры»): по одному персонажу на класс и несколько монстров. Их можно открыть, скопировать и разобрать.</li>
</ul>
<h3>Где кнопки</h3>
<ul>
<li>Вкладка «Предметы»: <b>Конструктор предметов</b> (им пользуются и игроки — предмет создаётся сразу на листе их персонажа) и <b>Магазин</b>.</li>
<li>Вкладка «Актёры»: <b>Мастер создания персонажа</b> и <b>Генератор монстров</b>.</li>
<li>Вкладка «Компендиумы»: <b>SW25: стартовые компендиумы</b> — пересоздать стартовый набор и примеры на другом языке.</li>
</ul>
<p>Всё, что создаёт конструктор, само раскладывается по папкам во вкладке «Предметы». Оттуда предмет перетаскивают на лист персонажа.</p>`,
      `<p>The public build of the system ships without rulebook data. The game master enters weapons, armour, spells, talents and monsters from their own books. This guide shows how to do it quickly.</p>
<h3>What the world already has</h3>
<ul>
<li><b>Starter compendiums</b> (Compendiums tab, folder "SW25 — Starter"): classes, skill checks, racial abilities, Enhancer techniques. Names and numbers only.</li>
<li><b>Samples</b> (Actors tab, folder "SW25 — Samples"): one character per class and a few monsters. Open them, copy them, take them apart.</li>
</ul>
<h3>Where the buttons are</h3>
<ul>
<li>Items tab: <b>Item constructor</b> (players can use it too — the item goes straight onto their character) and <b>Shop</b>.</li>
<li>Actors tab: <b>Character creation wizard</b> and <b>Monster generator</b>.</li>
<li>Compendiums tab: <b>SW25: starter compendiums</b> — rebuild the starter set and the samples in another language.</li>
</ul>
<p>Everything the constructor makes is filed into folders in the Items tab by itself. Drag an item from there onto a character sheet.</p>`,
    ],
  },
  {
    title: ["2. Оружие, броня, аксессуары, предметы", "2. Weapons, armour, accessories, items"],
    html: [
      `<p>Откройте <b>Конструктор предметов</b> (вкладка «Предметы») и выберите вкладку сверху.</p>
<ol>
<li>Впишите название и числа из своей книги: категорию, ранг, минимальную Силу, мощность, крит, защиту.</li>
<li>Описание пишется руками в поле «Описание».</li>
<li>Нажмите <b>Создать</b>. Предмет появится в папке вида «Оружие / Мечи / Ранг B».</li>
</ol>
<h3>Бонусы и штрафы</h3>
<p>Раскройте «Числовые бонусы и штрафы». В поле начните печатать — «укл», «сила», «ev», «hp» — и выберите строку из списка. Рядом впишите число: положительное даёт бонус, отрицательное — штраф. Строк можно добавить сколько угодно.</p>
<ul>
<li>У оружия, брони и аксессуаров бонус действует, пока предмет надет.</li>
<li>У предмета можно задать длительность в раундах или отметить «действует, пока предмет при себе».</li>
<li>Бонус к отдельной проверке: выберите строку «Проверка: …».</li>
</ul>
<p>Если бонус нужно поправить позже, откройте лист предмета и нажмите <b>Эффекты</b> в шапке окна.</p>`,
      `<p>Open the <b>Item constructor</b> (Items tab) and pick a tab at the top.</p>
<ol>
<li>Type the name and the numbers from your book: category, rank, minimum Strength, power, crit, defense.</li>
<li>The description is typed by hand in the Description field.</li>
<li>Press <b>Create</b>. The item appears in a folder such as "Weapons / Swords / Rank B".</li>
</ol>
<h3>Bonuses and penalties</h3>
<p>Open "Numeric bonuses and penalties". Start typing in the field — "eva", "str", "hp" — and pick a line from the list. Put a number next to it: positive is a bonus, negative a penalty. Add as many rows as you need.</p>
<ul>
<li>For weapons, armour and accessories the bonus applies while the item is equipped.</li>
<li>For an item you can set a duration in rounds or tick "works while carried".</li>
<li>A bonus to a single check: pick a "Check: …" line.</li>
</ul>
<p>To change a bonus later, open the item sheet and press <b>Effects</b> in the window header.</p>`,
    ],
  },
  {
    title: ["3. Заклинания", "3. Spells"],
    html: [
      `<p>Вкладка <b>Заклинание</b> в конструкторе.</p>
<ol>
<li><b>Тип магии</b> пишется текстом: «жрец», «фея», «магитех». Если такого типа нет в системе, папка всё равно получит ваше название.</li>
<li><b>Круг</b> и <b>ОМ</b> — из книги.</li>
<li><b>Форма</b>: одна цель, выстрел, на себя, касание, линия, область в точке, область вокруг себя. Для области задаются радиус и предел целей.</li>
<li><b>Спас</b>: Стойкость или Воля, и что происходит при успехе.</li>
<li><b>Что делает</b>: урон по мощности, лечение по мощности, лечение на число, регенерация в конце хода — или ничего, если заклинание только вешает бонус.</li>
</ol>
<p>Заклинание ляжет в папку «Заклинания / тип магии / Круг N».</p>
<h3>Как применить</h3>
<p>Перетащите заклинание на лист персонажа. Выделите цель (или не выделяйте — для области система попросит кликнуть по карте) и нажмите на значок заклинания на листе. Система спишет ОМ, бросит проверку, спасброски монстров бросит сама, а игрокам покажет кнопку на карточке в чате.</p>`,
      `<p>The <b>Spell</b> tab of the constructor.</p>
<ol>
<li><b>School of magic</b> is typed as text: "priest", "fairy", "magitech". If the system has no such school, the folder still gets your name.</li>
<li><b>Level</b> and <b>MP</b> come from the book.</li>
<li><b>Shape</b>: single target, shot, self, touch, line, area at a point, area around the caster. An area takes a radius and a target limit.</li>
<li><b>Save</b>: Fortitude or Willpower, and what a success does.</li>
<li><b>What it does</b>: damage by power, healing by power, healing by a fixed number, regeneration at the end of the turn — or nothing, if the spell only applies a bonus.</li>
</ol>
<p>The spell goes into "Spells / school / Level N".</p>
<h3>How to cast</h3>
<p>Drag the spell onto a character sheet. Target a token (or do not — for an area the system asks you to click on the map) and click the spell icon on the sheet. The system spends the MP, rolls the check, rolls the saves of monsters by itself and shows players a button on the chat card.</p>`,
    ],
  },
  {
    title: ["4. Таланты и классовые умения", "4. Talents and class abilities"],
    html: [
      `<p>Талант создаётся как обычный предмет: вкладка «Предметы» → «Создать предмет» → тип «боевой талант». Название и описание — свои.</p>
<h3>Талант, который класс получает сам</h3>
<p>На листе таланта есть строка <b>«Выдавать автоматически»</b>. Выберите класс и уровень. Когда персонаж с этим классом дойдёт до уровня, талант сам появится у него на листе. Название таланта при этом может быть любым.</p>
<ul>
<li>«нет — игрок выбирает сам» — обычный талант, никому не выдаётся.</li>
<li>«любой магический класс» — срабатывает от любого класса-заклинателя.</li>
<li>Талант должен лежать во вкладке «Предметы» или в компендиуме предметов.</li>
<li>Если уровень потом понизили, талант не отбирается — это решает мастер.</li>
</ul>
<h3>Числовой эффект таланта</h3>
<p>Откройте лист таланта и нажмите <b>Эффекты</b> в шапке окна: там можно добавить бонус к точности, уклонению, урону и так далее.</p>`,
      `<p>A talent is made like any other item: Items tab → Create Item → type "Feats". The name and the description are yours.</p>
<h3>A talent the class gets by itself</h3>
<p>The talent sheet has a row <b>"Grant automatically"</b>. Pick a class and a level. When a character with that class reaches the level, the talent appears on the sheet by itself. The talent may have any name.</p>
<ul>
<li>"no — the player picks it" — an ordinary talent, granted to nobody.</li>
<li>"any magic-user class" — works from any spellcasting class.</li>
<li>The talent has to be in the Items tab or in an Item compendium.</li>
<li>If the level is lowered later, the talent is not taken away — that is the game master's call.</li>
</ul>
<h3>A numeric effect for a talent</h3>
<p>Open the talent sheet and press <b>Effects</b> in the window header to add a bonus to accuracy, evasion, damage and so on.</p>`,
    ],
  },
  {
    title: ["5. Алхимик: карты и привороты", "5. Alchemist: cards and evocations"],
    html: [
      `<h3>Карты</h3>
<p>Карты материалов — это ресурсы на листе персонажа. Создавать их руками не нужно: когда персонажу добавляют класс <b>Алхимик</b> (или первый приворот), на листе сами появляются стопки карт пяти цветов рангов B и A с количеством 0. Впишите, сколько карт у персонажа на самом деле. Стопки рангов S и SS появятся, когда их впервые попробуют потратить. Пустые стопки на листе свёрнуты: нажмите «пустые карты» в заголовке блока ресурсов, чтобы их показать.</p>
<h3>Приворот</h3>
<p>Вкладка <b>Приворот алхимика</b> в конструкторе.</p>
<ol>
<li>Укажите, сколько карт какого цвета тратится за одно применение.</li>
<li>Задайте форму, дальность, длительность и спас — как у заклинания.</li>
<li><b>«Ранг карт задаёт»</b>: ничего, длительность эффекта или величину бонуса. Впишите значения для рангов B, A, S, SS.</li>
<li>Если приворот даёт бонус или штраф — добавьте строку в «Числовые бонусы и штрафы».</li>
</ol>
<h3>Как применить</h3>
<p>Перетащите приворот на лист алхимика, выделите цель и нажмите на значок приворота. Система спросит ранг карт и покажет, на сколько применений их хватит, спишет карты нужных цветов и бросит проверку от класса Алхимик и Интеллекта.</p>`,
      `<h3>Cards</h3>
<p>Material cards are resources on the character sheet. You do not create them by hand: when the <b>Alchemist</b> class (or the first evocation) is added to a character, stacks of cards of the five colours, ranks B and A, appear on the sheet with a quantity of 0. Type in how many cards the character really owns. Stacks of ranks S and SS appear the first time someone tries to spend them. Empty stacks are folded away on the sheet: click "empty cards" in the header of the resource block to show them.</p>
<h3>Evocation</h3>
<p>The <b>Alchemist evocation</b> tab of the constructor.</p>
<ol>
<li>Set how many cards of each colour one use costs.</li>
<li>Set the shape, range, duration and save — the same as for a spell.</li>
<li><b>"The card rank sets"</b>: nothing, the duration of the effect or the size of the bonus. Type the values for ranks B, A, S, SS.</li>
<li>If the evocation gives a bonus or a penalty, add a row under "Numeric bonuses and penalties".</li>
</ol>
<h3>How to use</h3>
<p>Drag the evocation onto the alchemist's sheet, target a token and click the evocation icon. The system asks for the card rank and shows how many uses the cards allow, spends the cards of the right colours and rolls the check from the Alchemist class and Intelligence.</p>`,
    ],
  },
  {
    title: ["6. Бард: мелодии и финальные аккорды", "6. Bard: songs and finales"],
    html: [
      `<p>Вкладка <b>Мелодия барда</b> в конструкторе. Сверху выбирается, что вы делаете: мелодию или финальный аккорд.</p>
<h3>Мелодия</h3>
<ol>
<li><b>Ритм за исполнение</b> — сколько ↑, ↓ и ♡ бард получает каждый раз.</li>
<li><b>Взлёт</b> — порог проверки; если бросок его достиг, добавляется «ещё ритм при взлёте».</li>
<li><b>Нужно ритма</b> — сколько ритма уже должно быть накоплено, чтобы эффект мелодии сработал.</li>
<li><b>На кого действует</b>: враги или союзники в 30 м. Сам бонус или штраф — строкой в «Числовых бонусах» (штраф — отрицательное число).</li>
</ol>
<h3>Финальный аккорд</h3>
<p>Задайте стоимость в ритме, форму и дальность, спас и что он делает: урон, лечение или только эффект.</p>
<h3>Как применить</h3>
<p>Перетащите мелодию на лист барда и нажмите на её значок. Счётчики ритма ↑ ↓ ♡ появятся на листе сами при первом исполнении. Система бросит проверку от класса Бард и Духа, начислит ритм и наложит эффект на тех, кого мелодия достаёт. Финальный аккорд не сработает, пока ритма не хватает.</p>`,
      `<p>The <b>Bard song</b> tab of the constructor. At the top choose what you are making: a song or a finale.</p>
<h3>Song</h3>
<ol>
<li><b>Rhythm per performance</b> — how many ↑, ↓ and ♡ the bard gains each time.</li>
<li><b>Flourish</b> — a check threshold; when the roll reaches it, the "extra rhythm on a flourish" is added.</li>
<li><b>Rhythm needed</b> — how much rhythm must already be there for the song's effect to work.</li>
<li><b>Whom it reaches</b>: foes or allies within 30 m. The bonus or penalty itself is a row under "Numeric bonuses" (a penalty is a negative number).</li>
</ol>
<h3>Finale</h3>
<p>Set the rhythm cost, the shape and range, the save and what it does: damage, healing or an effect only.</p>
<h3>How to use</h3>
<p>Drag the song onto the bard's sheet and click its icon. The rhythm counters ↑ ↓ ♡ appear on the sheet by themselves at the first performance. The system rolls the check from the Bard class and Spirit, adds the rhythm and applies the effect to everyone the song reaches. A finale does nothing until there is enough rhythm.</p>`,
    ],
  },
  {
    title: ["7. Монстры", "7. Monsters"],
    html: [
      `<p>Откройте <b>Генератор монстров</b> (вкладка «Актёры»).</p>
<ul>
<li>Впишите название, уровень и числа из своей книги; способности добавляются строками с текстом от руки.</li>
<li>Для большого монстра добавьте <b>секции</b>: у каждой свои ОЖ, точность, урон, уклонение и защита. Одна секция — основная.</li>
<li>Способности с областью или линией сами выбирают цели на карте.</li>
<li>Готовый монстр ложится в папку «Монстры / вид».</li>
</ul>
<h3>В бою</h3>
<p>Когда игрок наводится на монстра с секциями, система спрашивает, какую секцию он бьёт. Урон идёт в неё с её защитой. Атака по области задевает все секции сразу. Выведенная из строя секция больше не действует.</p>
<p>Посмотреть, как это устроено, удобнее всего на примерах: «Двуглавый огр» (3 секции) и «КТУЛХУ» (10 секций).</p>`,
      `<p>Open the <b>Monster generator</b> (Actors tab).</p>
<ul>
<li>Type the name, the level and the numbers from your book; abilities are added as rows with hand-typed text.</li>
<li>For a big monster add <b>sections</b>: each has its own HP, accuracy, damage, evasion and defense. One section is the main one.</li>
<li>Abilities with an area or a line pick their targets on the map by themselves.</li>
<li>The finished monster goes into "Monsters / type".</li>
</ul>
<h3>In combat</h3>
<p>When a player targets a monster with sections, the system asks which section they attack. The damage goes there, against that section's defense. An area attack hits every section at once. A disabled section no longer acts.</p>
<p>The samples show how it works: "Two-Headed Ogre" (3 sections) and "CTHULHU" (10 sections).</p>`,
    ],
  },
];
