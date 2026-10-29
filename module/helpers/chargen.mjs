/*
 * Sword World 2.5 Plus (sw25-ru)
 * Copyright (c) 2026 IIP0CTOy. All rights reserved.⁠​‌​​‌​​‌​‌​​‌​​‌​‌​‌​​​​​​‌‌​​​​​‌​​​​‌‌​‌​‌​‌​​​‌​​‌‌‌‌​‌‌‌‌​​‌​​‌​‌‌‌‌​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​​‌​‌‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌‌‌​‌‌​​‌‌​​‌‌​​​‌‌​​‌‌​​​​​​‌‌‌​​​​‌‌​​‌‌​​​‌‌​‌‌​⁠
 * NOT covered by the MIT License of this repository (since 2.4.1-ru.11.3): see LICENSE-RESERVED.txt.
 */
/**
 * [Round 85] Character creation wizard.
 *
 * Steps: name and race → background (pick or roll 2d) → ability dice A–F (three sets to choose
 * from, as the book recommends) → classes within the starting experience (no class above
 * level 2) → the actor is created with race abilities, classes, basic checks and 1200 G.
 * Every PC starts with 3000 experience in total: the background's classes are already paid.
 * Data: background tables and dice of the 12 races (two typos of the Russian books fixed by
 * the «3000 in total» rule: Human Archer and Leprechaun Amateur give 2500, not 2000).
 */
import { L2, lang, isJa } from "./monstergen-i18n.mjs";
import { sameClass, classKey, className, isItem, norm as nm } from "./names.mjs";
import { starterPack } from "./starter.mjs";

const RACES = {"Человек":{"dice":{"A":"2d","B":"2d","C":"2d","D":"2d","E":"2d","F":"2d"},"births":[{"roll":"2-4","name":"Магитек","classes":"Конструктор","base":[8,4,9],"exp":2000,"book":"I"},{"roll":"5","name":"Волшебник","classes":"Чародей","base":[6,5,10],"exp":2000,"book":"I"},{"roll":"6","name":"Проворный воин","classes":"Разведчик & Фехтовальщик","base":[10,7,4],"exp":2000,"book":"I"},{"roll":"7","name":"Обычный","classes":"","base":[7,7,7],"exp":3000,"book":"I"},{"roll":"8","name":"Наёмник","classes":"Боец | Громила","base":[7,10,4],"exp":2000,"book":"I"},{"roll":"9-10","name":"Клирик","classes":"Жрец","base":[4,8,9],"exp":2000,"book":"I"},{"roll":"11-12","name":"Манипулятор","classes":"Призыватель","base":[7,4,10],"exp":2000,"book":"I"},{"roll":"※","name":"Авантюрист (с разрешения ГМ)","classes":"","base":null,"exp":3000,"book":"I"},{"roll":"2-4","name":"Лучник","classes":"Стрелок","base":[9,5,7],"exp":2500,"book":"II"},{"roll":"5","name":"Мечник","classes":"Фехтовальщик","base":[9,6,6],"exp":2500,"book":"II"},{"roll":"6","name":"Драчун","classes":"Громила","base":[8,8,5],"exp":2000,"book":"II"},{"roll":"7","name":"Воин","classes":"Боец","base":[7,9,5],"exp":2000,"book":"II"},{"roll":"8","name":"Культурист","classes":"Усилитель","base":[6,8,7],"exp":2500,"book":"II"},{"roll":"9","name":"Поэт","classes":"Бард","base":[5,7,9],"exp":2500,"book":"II"},{"roll":"10-12","name":"Тронутый феей","classes":"Укротитель фей","base":[5,6,10],"exp":2000,"book":"II"}],"book":"I"},"Эльф":{"dice":{"A":"2d","B":"2d","C":"1d","D":"2d","E":"2d","F":"2d"},"births":[{"roll":"2-3","name":"Воин","classes":"Фехтовальщик","base":[12,5,9],"exp":2500,"book":"I"},{"roll":"4","name":"Травник","classes":"Мудрец & Рейнджер","base":[10,5,11],"exp":2000,"book":"I"},{"roll":"5-6","name":"Клирик","classes":"Жрец","base":[9,5,12],"exp":2000,"book":"I"},{"roll":"7","name":"Манипулятор","classes":"Призыватель","base":[9,4,13],"exp":2000,"book":"I"},{"roll":"8-9","name":"Волшебник","classes":"Чародей","base":[10,3,13],"exp":2000,"book":"I"},{"roll":"10-12","name":"Лучник","classes":"Стрелок","base":[13,5,8],"exp":2500,"book":"I"},{"roll":"2-4","name":"Культурист","classes":"Усилитель","base":[11,5,10],"exp":2500,"book":"II"},{"roll":"5-6","name":"Шпион","classes":"Разведчик","base":[12,4,10],"exp":2500,"book":"II"},{"roll":"7","name":"Тронутый феей","classes":"Укротитель фей","base":[10,2,14],"exp":2000,"book":"II"},{"roll":"8-9","name":"Драчун","classes":"Громила","base":[11,4,11],"exp":2000,"book":"II"},{"roll":"10-12","name":"Менестрель","classes":"Бард","base":[9,3,14],"exp":2500,"book":"II"}],"book":"I"},"Гном":{"dice":{"A":"2d+6","B":"1d","C":"2d","D":"2d","E":"1d","F":"2d+6"},"births":[{"roll":"2-4","name":"Лучник","classes":"Стрелок","base":[6,8,6],"exp":2500,"book":"I"},{"roll":"5-6","name":"Воин","classes":"Боец","base":[4,11,5],"exp":2000,"book":"I"},{"roll":"7","name":"Драчун","classes":"Громила","base":[5,10,5],"exp":2000,"book":"I"},{"roll":"8-9","name":"Клирик","classes":"Жрец","base":[4,7,9],"exp":2000,"book":"I"},{"roll":"10-12","name":"Магитек","classes":"Конструктор","base":[6,7,7],"exp":2000,"book":"I"},{"roll":"2-4","name":"Учёный","classes":"Мудрец","base":[3,8,9],"exp":2500,"book":"II"},{"roll":"5-6","name":"Странник","classes":"Рейнджер","base":[6,9,5],"exp":2500,"book":"II"},{"roll":"7","name":"Культурист","classes":"Усилитель","base":[5,9,6],"exp":2500,"book":"II"},{"roll":"8-9","name":"Менестрель","classes":"Бард","base":[4,8,8],"exp":2500,"book":"II"},{"roll":"10-12","name":"Тронутый феей","classes":"Укротитель фей","base":[5,6,9],"exp":2000,"book":"II"}],"book":"I"},"Таббит":{"dice":{"A":"1d","B":"1d","C":"1d","D":"2d","E":"2d+6","F":"2d"},"births":[{"roll":"2-5","name":"Манипулятор","classes":"Призыватель","base":[6,6,10],"exp":2000,"book":"I"},{"roll":"6-7","name":"Волшебник","classes":"Чародей","base":[5,7,10],"exp":2000,"book":"I"},{"roll":"8-9","name":"Учёный","classes":"Мудрец","base":[5,8,9],"exp":2500,"book":"I"},{"roll":"10-12","name":"Магитек","classes":"Конструктор","base":[8,5,9],"exp":2000,"book":"I"},{"roll":"2-5","name":"Волшебник","classes":"Чародей & Призыватель","base":[5,6,11],"exp":1000,"book":"II"},{"roll":"6-7","name":"Тронутый феей","classes":"Укротитель фей","base":[7,5,10],"exp":2000,"book":"II"},{"roll":"8-9","name":"Менестрель","classes":"Бард","base":[6,7,9],"exp":2500,"book":"II"},{"roll":"10-12","name":"Аптекарь","classes":"Рейнджер","base":[7,6,9],"exp":2500,"book":"II"}],"book":"I"},"Рунфолк":{"dice":{"A":"2d","B":"1d","C":"2d","D":"2d","E":"2d","F":"1d"},"births":[{"roll":"2-4","name":"Учёный","classes":"Мудрец","base":[8,10,8],"exp":2500,"book":"I"},{"roll":"5-6","name":"Лучник","classes":"Стрелок","base":[12,8,6],"exp":2500,"book":"I"},{"roll":"7","name":"Воин","classes":"Боец | Громила","base":[9,12,5],"exp":2000,"book":"I"},{"roll":"8-9","name":"Магитек","classes":"Конструктор","base":[12,8,6],"exp":2000,"book":"I"},{"roll":"10-12","name":"Волшебник","classes":"Чародей","base":[9,8,9],"exp":2000,"book":"I"},{"roll":"2-4","name":"Шпион","classes":"Разведчик","base":[12,6,8],"exp":2500,"book":"II"},{"roll":"5-6","name":"Культурист","classes":"Усилитель","base":[10,8,8],"exp":2500,"book":"II"},{"roll":"7","name":"Проворный воин","classes":"Фехтовальщик","base":[11,9,6],"exp":2500,"book":"II"},{"roll":"8-9","name":"Менестрель","classes":"Бард","base":[8,9,9],"exp":2500,"book":"II"},{"roll":"10-12","name":"Призыватель","classes":"Призыватель","base":[7,9,10],"exp":2000,"book":"II"}],"book":"I"},"Найтмар":{"dice":{"A":"2d","B":"2d","C":"1d","D":"1d","E":"2d","F":"2d"},"births":[{"roll":"2-4","name":"Волшебник","classes":"Чародей","base":[5,13,12],"exp":2000,"book":"I"},{"roll":"5-6","name":"Воин","classes":"Боец | Громила","base":[7,15,8],"exp":2000,"book":"I"},{"roll":"7","name":"Проворный воин","classes":"Разведчик & Фехтовальщик","base":[11,13,6],"exp":2000,"book":"I"},{"roll":"8-9","name":"Клирик","classes":"Жрец","base":[6,14,10],"exp":2000,"book":"I"},{"roll":"10-12","name":"Магитек","classes":"Конструктор","base":[9,9,12],"exp":2000,"book":"I"},{"roll":"2-4","name":"Менестрель","classes":"Бард","base":[8,13,9],"exp":2500,"book":"II"},{"roll":"5-6","name":"Культурист","classes":"Усилитель","base":[9,14,7],"exp":2500,"book":"II"},{"roll":"7","name":"Лучник","classes":"Стрелок","base":[10,10,10],"exp":2500,"book":"II"},{"roll":"8-9","name":"Странник","classes":"Рейнджер","base":[9,12,9],"exp":2500,"book":"II"},{"roll":"10-12","name":"Манипулятор","classes":"Призыватель","base":[6,11,13],"exp":2000,"book":"II"}],"book":"I"},"Ликант":{"dice":{"A":"1d","B":"1d+3","C":"2d","D":"2d","E":"1d+6","F":"1d"},"births":[{"roll":"2-4","name":"Шпион","classes":"Разведчик","base":[13,5,7],"exp":2500,"book":"I"},{"roll":"5-6","name":"Воин","classes":"Боец","base":[10,9,6],"exp":2000,"book":"I"},{"roll":"7","name":"Драчун","classes":"Громила","base":[11,7,7],"exp":2000,"book":"I"},{"roll":"8-9","name":"Проворный воин","classes":"Фехтовальщик","base":[12,6,7],"exp":2500,"book":"I"},{"roll":"10-12","name":"Охотник","classes":"Рейнджер","base":[9,8,8],"exp":2500,"book":"I"},{"roll":"2-4","name":"Менестрель","classes":"Бард","base":[8,9,8],"exp":2500,"book":"II"},{"roll":"5-6","name":"Лучник","classes":"Стрелок","base":[11,8,6],"exp":2500,"book":"II"},{"roll":"7","name":"Культурист","classes":"Усилитель","base":[10,8,7],"exp":2500,"book":"II"},{"roll":"8-9","name":"Учёный","classes":"Мудрец","base":[10,7,8],"exp":2500,"book":"II"},{"roll":"10-12","name":"Клирик","classes":"Жрец","base":[9,7,9],"exp":2000,"book":"II"}],"book":"I"},"Лилдракен":{"dice":{"A":"1d","B":"2d","C":"2d","D":"2d+6","E":"1d","F":"2d"},"births":[{"roll":"2-3","name":"Охотник","classes":"Рейнджер","base":[6,12,7],"exp":2500,"book":"II"},{"roll":"4-5","name":"Драчун","classes":"Громила","base":[6,13,6],"exp":2000,"book":"II"},{"roll":"6-8","name":"Воин","classes":"Боец","base":[5,14,6],"exp":2000,"book":"II"},{"roll":"9-10","name":"Торговец","classes":"Мудрец","base":[5,11,9],"exp":2500,"book":"II"},{"roll":"11-12","name":"Клирик","classes":"Жрец","base":[4,13,8],"exp":2000,"book":"II"},{"roll":"2-4","name":"Лучник","classes":"Стрелок","base":[7,12,6],"exp":2500,"book":"II доп."},{"roll":"5-6","name":"Проворный воин","classes":"Фехтовальщик","base":[6,11,8],"exp":2500,"book":"II доп."},{"roll":"7","name":"Культурист","classes":"Усилитель","base":[5,12,8],"exp":2500,"book":"II доп."},{"roll":"8-9","name":"Волшебник","classes":"Чародей | Призыватель","base":[4,12,9],"exp":2000,"book":"II доп."},{"roll":"10-12","name":"Тронутый феей","classes":"Укротитель фей","base":[3,12,10],"exp":2000,"book":"II доп."}],"book":"II"},"Граслинг":{"dice":{"A":"2d","B":"2d","C":"1d","D":"2d+6","E":"1d","F":"2d+6"},"births":[{"roll":"2-4","name":"Воришка","classes":"Разведчик","base":[13,0,12],"exp":2500,"book":"II"},{"roll":"5-6","name":"Лёгкий воин","classes":"Фехтовальщик","base":[14,1,10],"exp":2500,"book":"II"},{"roll":"7","name":"Странник","classes":"Рейнджер","base":[12,1,12],"exp":2500,"book":"II"},{"roll":"8-9","name":"Лучник","classes":"Стрелок","base":[14,0,11],"exp":2500,"book":"II"},{"roll":"10-12","name":"Любитель","classes":"Мудрец | Бард","base":[12,0,13],"exp":2500,"book":"II"},{"roll":"2-4","name":"Учёный","classes":"Мудрец","base":[11,1,13],"exp":2500,"book":"II доп."},{"roll":"5-6","name":"Драчун","classes":"Громила","base":[14,2,9],"exp":2000,"book":"II доп."},{"roll":"7","name":"Путешественник","classes":"","base":[11,2,12],"exp":3000,"book":"II доп."},{"roll":"8-9","name":"Шпион","classes":"Фехтовальщик & Разведчик","base":[15,0,10],"exp":2000,"book":"II доп."},{"roll":"10-12","name":"Менестрель","classes":"Бард","base":[12,0,13],"exp":2500,"book":"II доп."}],"book":"II"},"Мелия":{"dice":{"A":"1d","B":"1d","C":"1d","D":"2d+6","E":"1d","F":"1d"},"births":[{"roll":"2-4","name":"Странник","classes":"Рейнджер","base":[9,8,12],"exp":2500,"book":"II"},{"roll":"5-6","name":"Клирик","classes":"Жрец","base":[8,8,13],"exp":2000,"book":"II"},{"roll":"7","name":"Тронутый феями","classes":"Укротитель фей","base":[8,7,14],"exp":2000,"book":"II"},{"roll":"8-9","name":"Маг","classes":"Чародей","base":[8,6,15],"exp":2000,"book":"II"},{"roll":"10-12","name":"Манипулятор","classes":"Призыватель","base":[7,6,16],"exp":2000,"book":"II"},{"roll":"2-4","name":"Лучник","classes":"Стрелок","base":[10,7,12],"exp":2500,"book":"II доп."},{"roll":"5-6","name":"Проворный воин","classes":"Фехтовальщик","base":[10,8,11],"exp":2500,"book":"II доп."},{"roll":"7","name":"Волшебник","classes":"Чародей & Призыватель","base":[8,5,16],"exp":1000,"book":"II доп."},{"roll":"8-9","name":"Менестрель","classes":"Бард","base":[7,7,15],"exp":2500,"book":"II доп."},{"roll":"10-12","name":"Культурист","classes":"Усилитель","base":[9,9,11],"exp":2500,"book":"II доп."}],"book":"II"},"Тиены":{"dice":{"A":"2d","B":"2d","C":"1d","D":"1d+3","E":"2d","F":"2d+3"},"births":[{"roll":"2-4","name":"Кавалер","classes":"Всадник","base":[10,11,7],"exp":2500,"book":"III"},{"roll":"5-6","name":"Драчун","classes":"Громила","base":[9,13,6],"exp":2000,"book":"III"},{"roll":"7","name":"Воин","classes":"Боец","base":[8,12,8],"exp":2000,"book":"III"},{"roll":"8-9","name":"Клирик","classes":"Жрец","base":[7,12,9],"exp":2000,"book":"III"},{"roll":"10-12","name":"Маг","classes":"Чародей","base":[6,12,10],"exp":2000,"book":"III"},{"roll":"2-4","name":"Лучник","classes":"Стрелок","base":[11,12,5],"exp":2500,"book":"III доп."},{"roll":"5-6","name":"Шпион","classes":"Разведчик","base":[10,10,8],"exp":2500,"book":"III доп."},{"roll":"7","name":"Магический воин","classes":"Боец & Чародей","base":[9,11,8],"exp":1000,"book":"III доп."},{"roll":"8-9","name":"Тронутый феей","classes":"Укротитель фей","base":[7,11,10],"exp":2000,"book":"III доп."},{"roll":"10-12","name":"Учёный","classes":"Мудрец","base":[8,11,9],"exp":2500,"book":"III доп."}],"book":"III"},"Лепрекон":{"dice":{"A":"2d","B":"1d","C":"2d","D":"2d","E":"2d","F":"2d"},"births":[{"roll":"2-4","name":"Проворный воин","classes":"Фехтовальщик","base":[13,5,5],"exp":2500,"book":"III"},{"roll":"5-6","name":"Лучник","classes":"Стрелок","base":[12,6,5],"exp":2500,"book":"III"},{"roll":"7","name":"Шпион","classes":"Разведчик","base":[14,4,5],"exp":2500,"book":"III"},{"roll":"8-9","name":"Тронутый феями","classes":"Укротитель фей","base":[11,4,8],"exp":2000,"book":"III"},{"roll":"10-12","name":"Проворный воин","classes":"Фехтовальщик","base":[11,5,7],"exp":2500,"book":"III"},{"roll":"2-4","name":"Странник","classes":"Рейнджер","base":[12,5,6],"exp":2500,"book":"III доп."},{"roll":"5-6","name":"Любитель","classes":"Мудрец & Бард","base":[13,4,6],"exp":2000,"book":"III доп."},{"roll":"7","name":"Конструктор","classes":"Конструктор","base":[12,4,7],"exp":2000,"book":"III доп."},{"roll":"8-9","name":"Клирик","classes":"Жрец","base":[10,5,8],"exp":2000,"book":"III доп."},{"roll":"10-12","name":"Маг","classes":"Чародей | Призыватель","base":[11,3,9],"exp":2000,"book":"III доп."}],"book":"III"}};
const AB = [["dex", "A", 0, "Ловкость"], ["agi", "B", 0, "Подвижность"], ["str", "C", 1, "Сила"], ["vit", "D", 1, "Живучесть"], ["int", "E", 2, "Интеллект"], ["mnd", "F", 2, "Дух"]];
// [Round 94] check items are looked up by name: [Russian, English] spellings of each
const BASIC_CHECKS = [["Стойкость", "Fortitude", "生命抵抗力"], ["Воля", "Willpower", "精神抵抗力"], ["Инициатива", "Initiative", "先制"], ["Знание монстров", "Monster Knowledge", "魔物知識", "Знания о монстрах"], ["Проверка смерти", "Death Check", "生死判定"]];
const isCheck = (name, al) => al.some((a) => nm(a) === nm(name)) || (al[0] === "Проверка смерти" && isItem(name, "deathcheck"));
/**
 * [Round 94] Display names for a non-Russian client. RACES / AB stay Russian data (keys, flags);
 * this plain dictionary is only read at use time through disp(). Game terms only.
 */
const EN_NAMES = {
  // races
  "Человек": "Human", "Эльф": "Elf", "Гном": "Dwarf", "Таббит": "Tabbit", "Рунфолк": "Runefolk", "Найтмар": "Nightmare",
  "Ликант": "Lykant", "Лилдракен": "Lildraken", "Граслинг": "Grassrunner", "Мелия": "Meria", "Тиены": "Tiens", "Лепрекон": "Leprechaun",
  // backgrounds
  "Магитек": "Magitech", "Волшебник": "Wizard", "Проворный воин": "Agile Warrior", "Обычный": "Commoner", "Наёмник": "Mercenary",
  "Клирик": "Cleric", "Манипулятор": "Puppeteer", "Авантюрист (с разрешения ГМ)": "Adventurer (with GM permission)", "Лучник": "Archer",
  "Мечник": "Swordsman", "Драчун": "Brawler", "Воин": "Warrior", "Культурист": "Bodybuilder", "Поэт": "Poet",
  "Тронутый феей": "Fairy-touched", "Тронутый феями": "Fairy-touched", "Травник": "Herbalist", "Шпион": "Spy", "Менестрель": "Minstrel",
  "Учёный": "Scholar", "Странник": "Wanderer", "Аптекарь": "Apothecary", "Охотник": "Hunter", "Торговец": "Merchant",
  "Воришка": "Thief", "Лёгкий воин": "Light Warrior", "Любитель": "Amateur", "Путешественник": "Traveler", "Маг": "Mage",
  "Кавалер": "Cavalier", "Магический воин": "Magic Warrior",
  // abilities
  "Ловкость": "Dexterity", "Подвижность": "Agility", "Сила": "Strength", "Живучесть": "Vitality", "Интеллект": "Intelligence", "Дух": "Spirit",
  // book marks
  "II доп.": "II suppl.", "III доп.": "III suppl.",
};
/** Japanese names (races, backgrounds, abilities) for a Japanese client. Game terms only. */
const JA_NAMES = {
  "Человек": "人間", "Эльф": "エルフ", "Гном": "ドワーフ", "Таббит": "タビット", "Рунфолк": "ルーンフォーク", "Найтмар": "ナイトメア",
  "Ликант": "リカント", "Лилдракен": "リルドラケン", "Граслинг": "グラスランナー", "Мелия": "メリア", "Тиены": "ティエンス", "Лепрекон": "レプラカーン",
  "Магитек": "魔動機師", "Волшебник": "魔術師", "Проворный воин": "軽戦士", "Обычный": "一般人", "Наёмник": "傭兵", "Клирик": "神官",
  "Манипулятор": "操霊術師", "Авантюрист (с разрешения ГМ)": "冒険者（GMの許可）", "Лучник": "射手", "Мечник": "剣士", "Драчун": "拳闘士",
  "Воин": "戦士", "Культурист": "練体士", "Поэт": "詩人", "Тронутый феей": "妖精使い", "Тронутый феями": "妖精使い", "Травник": "薬師",
  "Шпион": "密偵", "Менестрель": "吟遊詩人", "Учёный": "学者", "Странник": "野伏", "Аптекарь": "薬師", "Охотник": "狩人", "Торговец": "商人",
  "Воришка": "盗賊", "Лёгкий воин": "軽戦士", "Любитель": "趣味人", "Путешественник": "旅人", "Маг": "魔法使い", "Кавалер": "騎手",
  "Магический воин": "魔法戦士",
  "Ловкость": "器用度", "Подвижность": "敏捷度", "Сила": "筋力", "Живучесть": "生命力", "Интеллект": "知力", "Дух": "精神力",
  "II доп.": "II 追加", "III доп.": "III 追加",
};
/** Russian table name → what the user sees (English or Japanese twin when the client is not Russian). */
const disp = (ru) => {
  if (lang() === "ru") return ru;
  if (isJa() && JA_NAMES[ru]) return JA_NAMES[ru];
  if (isJa() && classKey(ru)) return className(classKey(ru));
  if (EN_NAMES[ru]) return EN_NAMES[ru];
  const k = classKey(ru);
  return k ? className(k) : ru;
};
/** «Боец | Громила», «Разведчик & Фехтовальщик» → display text. */
const dispClasses = (str) => (lang() === "ru"
  ? str.replace(/\|/g, "или").replace(/&/g, "и") || "нет"
  : isJa() ? str.split(/\s*([|&])\s*/).map((t) => (t === "|" ? "または" : t === "&" ? "と" : disp(t))).join("") || "なし"
  : str.split(/\s*([|&])\s*/).map((t) => (t === "|" ? "or" : t === "&" ? "and" : disp(t))).join(" ") || "none");
const START_MONEY = 1200;
// High-level creation: [column, growth rolls, extra exp, money, reputation, abyss shards, average-growth scheme]
const HIGH = [
  ["3-4", 2, 2500, 2500, 30, 1, [1, 1, 0, 0, 0, 0]], ["4-5", 5, 7000, 6000, 80, 2, [1, 1, 1, 1, 1, 0]],
  ["5-6", 9, 13000, 14000, 150, 3, [2, 2, 2, 2, 1, 0]], ["6-7", 13, 20000, 24000, 250, 5, [3, 3, 2, 2, 2, 1]],
  ["7-8", 17, 27000, 36000, 350, 7, [4, 3, 3, 3, 2, 2]], ["8-9", 22, 37000, 54000, 500, 9, [5, 4, 4, 4, 3, 2]],
  ["9-10", 28, 47000, 80000, 700, 12, [6, 5, 5, 5, 4, 3]], ["10-11", 34, 62000, 120000, 900, 15, [7, 6, 6, 6, 5, 4]],
  ["11-12", 44, 82000, 160000, 1300, 21, [10, 9, 7, 7, 6, 5]], ["12-13", 54, 102000, 210000, 1700, 30, [12, 10, 9, 9, 8, 6]],
  ["13-14", 65, 132000, 270000, 2200, 39, [14, 13, 11, 11, 9, 7]], ["14-15", 77, 162000, 350000, 2800, 48, [17, 15, 13, 13, 11, 8]],
  ["15+ A", 90, 197000, 450000, 3500, 57, [20, 17, 15, 15, 13, 10]], ["15+ B", 100, 217000, 500000, 4000, 66, [22, 19, 17, 17, 14, 11]],
  ["15+ C", 110, 247000, 550000, 4500, 75, [25, 22, 18, 18, 15, 12]],
].map(([col, growth, exp, money, rep, abyss, avg]) => ({ col, growth, exp, money, rep, abyss, avg }));
// cumulative experience of a class level: major (A) / minor (B) classes
const EXP_A = [0, 1000, 2000, 3500, 5000, 7000, 9500, 12500, 16500, 21500, 27500, 35000, 44000, 54500, 66500, 80000];
const EXP_B = [0, 500, 1500, 2500, 4000, 5500, 7500, 10000, 13000, 17000, 22000, 28000, 35500, 44500, 55000, 67000];
const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
const DV = () => foundry.applications.api.DialogV2;
const d6 = () => Math.floor(Math.random() * 6) + 1;
function rollDice(f) {
  const m = String(f).match(/^(\d)d(?:\+(\d+))?$/);
  if (!m) return Number(f) || 0;
  let t = Number(m[2]) || 0;
  for (let i = 0; i < Number(m[1]); i++) t += d6();
  return t;
}
// [2026-10-07] classes, race abilities and basic checks used to come only from the world
// Items directory: in a world that keeps them in the compendiums the class step was empty
// and background classes were silently dropped. The packs are loaded once per wizard run.
// [Round 95] a content pack of the system when there is one, else the starter pack of the world
const PACK = { skill: "classes", raceability: "races", check: "checks" };
const _packDocs = {};
async function loadPackDocs() {
  for (const [type, kind] of Object.entries(PACK)) {
    try { _packDocs[type] = (await starterPack(kind)?.getDocuments()) ?? []; } catch (_e) { _packDocs[type] = []; }
  }
}
const sourceItems = (type) => {
  const world = globalThis.SW25_STARTER_ONLY ? [] : game.items.filter((i) => i.type === type);
  const names = new Set(world.map((i) => i.name));
  return world.concat((_packDocs[type] ?? []).filter((d) => d.type === type && !names.has(d.name)));
};
const classList = () => sourceItems("skill").sort((a, b) => a.name.localeCompare(b.name, "ru"));
const isMajor = (cls) => String(cls?.system?.exptable ?? "B").toUpperCase() === "A";
const costOf = (cls, lvl) => (isMajor(cls) ? EXP_A : EXP_B)[lvl] ?? 0;
// [Round 94] «Боец» in the table also finds a world class called "Fighter"
const findClass = (name) => classList().find((c) => sameClass(c.name, name));

/** Wizard windows: the content scrolls, the buttons stay on screen (tall tables on 1080p). */
function ensureCgStyle() {
  if (document.getElementById("sw25-chargen-style")) return;
  const st = document.createElement("style");
  st.id = "sw25-chargen-style";
  st.textContent = `.sw25-chargen .dialog-content{max-height:calc(100vh - 220px);overflow-y:auto}.sw25-chargen{max-height:calc(100vh - 20px)}`;
  document.head.appendChild(st);
}

async function stepRace() {
  ensureCgStyle();
  const users = game.user.isGM ? game.users.filter((u) => !u.isGM) : [];
  const owner = users.length ? `<div class="form-group"><label>${L2("Игрок-владелец", "Owning player")}</label><select name="owner"><option value="">${L2("— никто (потом) —", "— nobody (later) —")}</option>${users.map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join("")}</select></div>` : "";
  return DV().prompt({
    classes: ["sw25-chargen"], window: { resizable: true, title: L2("Создание персонажа · 1/4 · имя и раса", "Character creation · 1/4 · name and race") },
    content: `<form><div class="form-group"><label>${L2("Имя", "Name")}</label><input type="text" name="name" value="${L2("Новый авантюрист", "New Adventurer")}" autofocus></div>
      <div class="form-group"><label>${L2("Создание", "Creation")}</label><select name="hl"><option value="">${L2("Обычное (1–2 уровень, 1200 G)", "Normal (levels 1–2, 1200 G)")}</option>${HIGH.map((h, i) => `<option value="${i}">${L2(`Высокий уровень: ${h.col}`, `High level: ${h.col}`)} · +${h.exp} ${L2("опыта", "exp")} · ${h.money} G</option>`).join("")}</select></div>
      <div class="form-group"><label>${L2("Раса", "Race")}</label><select name="race">${Object.entries(RACES).map(([n, r]) => `<option value="${esc(n)}">${esc(disp(n))} (${L2("книга", "book")} ${r.book})</option>`).join("")}</select></div>${owner}</form>`,
    ok: { label: L2("Дальше", "Next"), callback: (ev, btn) => ({ name: btn.form.elements.name.value.trim() || L2("Новый авантюрист", "New Adventurer"), race: btn.form.elements.race.value, owner: btn.form.elements.owner?.value || "", high: btn.form.elements.hl.value === "" ? null : HIGH[Number(btn.form.elements.hl.value)] }) },
    rejectClose: false,
  });
}

async function stepBirth(raceName) {
  const r = RACES[raceName];
  const row = (b, i) => `<tr><td><input type="radio" name="birth" value="${i}" ${i === 0 ? "checked" : ""}></td><td>${esc(b.roll)}</td><td><b>${esc(disp(b.name))}</b></td><td>${esc(dispClasses(b.classes))}</td><td>${b.base ? b.base.join(" / ") : "2d / 2d / 2d"}</td><td>${b.exp}</td><td>${esc(disp(b.book))}</td></tr>`;
  const pick = await DV().wait({
    classes: ["sw25-chargen"], window: { resizable: true, title: L2(`Создание персонажа · 2/4 · предыстория (${raceName})`, `Character creation · 2/4 · background (${disp(raceName)})`) },
    position: { width: 640 },
    content: `<form><table style="font-size:.9em"><tr><th></th><th>2d</th><th>${L2("Предыстория", "Background")}</th><th>${L2("Начальные классы", "Starting classes")}</th><th>${L2("Умение / Тело / Разум", "Skill / Body / Mind")}</th><th>${L2("Опыт", "Experience")}</th><th>${L2("Книга", "Book")}</th></tr>${r.births.map(row).join("")}</table>
      <p style="font-size:.85em">${L2("Предыстория даёт начальные классы 1 уровня и основу характеристик. «Опыт» — сколько останется на другие классы.", "The background gives level 1 starting classes and the base ability values. “Experience” is what is left for other classes.")}</p></form>`,
    buttons: [
      { action: "pick", label: L2("Выбрать отмеченную", "Use the selected one"), default: true, callback: (ev, btn) => Number(btn.form.elements.birth.value) },
      { action: "roll", label: L2("Бросить 2d (основная таблица)", "Roll 2d (main table)"), icon: "fa-solid fa-dice", callback: () => "roll" },
    ],
    rejectClose: false,
  }).catch(() => null);
  if (pick === null || pick === undefined) return null;
  let birth;
  let rolled = null;
  if (pick === "roll") {
    rolled = d6() + d6();
    const main = r.births.filter((b) => b.book === r.births[0].book && /\d/.test(b.roll));
    birth = main.find((b) => { const [lo, hi] = b.roll.split("-").map(Number); return rolled >= lo && rolled <= (hi || lo); }) ?? main[0];
    ui.notifications.info(L2(`Предыстория: выпало ${rolled} — ${birth.name}.`, `Background: rolled ${rolled} — ${disp(birth.name)}.`));
  } else birth = r.births[pick];
  // «A или B»: choose one
  let classes = birth.classes ? birth.classes.split("&").map((c) => c.trim()) : [];
  if (birth.classes.includes("|")) {
    const opts = birth.classes.split("|").map((c) => c.trim());
    const one = await DV().wait({
      classes: ["sw25-chargen"], window: { resizable: true, title: L2(`${birth.name}: какой класс?`, `${disp(birth.name)}: which class?`) },
      content: `<p>${L2("Предыстория даёт один из классов на выбор.", "The background gives one of these classes — your choice.")}</p>`,
      buttons: opts.map((c, i) => ({ action: c, label: disp(c), default: i === 0 })),
      rejectClose: false,
    }).catch(() => null);
    if (!one) return null;
    classes = [one];
  }
  const base = birth.base ?? [d6() + d6(), d6() + d6(), d6() + d6()];
  return { birth, classes, base, rolled };
}

async function stepAbilities(raceName, base) {
  const dice = RACES[raceName].dice;
  for (;;) {
    const sets = [0, 1, 2].map(() => Object.fromEntries(AB.map(([, L]) => [L, rollDice(dice[L])])));
    const total = (s) => AB.reduce((a, [, L, g]) => a + base[g] + s[L], 0);
    const head = `<tr><th></th>${AB.map(([, L, , n]) => `<th>${disp(n)}<br><small>${L}: ${dice[L]}</small></th>`).join("")}<th>${L2("Сумма", "Total")}</th></tr>`;
    const row = (s, i) => `<tr><td><b>${L2("Набор", "Set")} ${i + 1}</b></td>${AB.map(([, L, g]) => `<td style="text-align:center">${base[g] + s[L]} <small>(${base[g]}+${s[L]})</small></td>`).join("")}<td style="text-align:center"><b>${total(s)}</b></td></tr>`;
    const pick = await DV().wait({
      classes: ["sw25-chargen"], window: { resizable: true, title: L2("Создание персонажа · 3/4 · характеристики", "Character creation · 3/4 · abilities") },
      position: { width: 620 },
      content: `<table style="font-size:.9em">${head}${sets.map(row).join("")}</table><p style="font-size:.85em">${L2(`Основа: Умение ${base[0]}, Тело ${base[1]}, Разум ${base[2]}. Книга советует бросить три раза и выбрать один набор. Модификатор = значение / 6 (вниз).`, `Base: Skill ${base[0]}, Body ${base[1]}, Mind ${base[2]}. The book suggests rolling three times and picking one set. Modifier = value / 6 (rounded down).`)}</p>`,
      buttons: [...sets.map((s, i) => ({ action: String(i), label: L2(`Набор ${i + 1}`, `Set ${i + 1}`), default: i === 0 })), { action: "re", label: L2("Перебросить", "Reroll"), icon: "fa-solid fa-dice" }],
      rejectClose: false,
    }).catch(() => null);
    if (pick === null || pick === undefined) return null;
    if (pick !== "re") return sets[Number(pick)];
  }
}

/** High level: the growth rolls, spread over the six abilities (average-table scheme as a start). */
async function stepGrowth(high, base, dice) {
  const vals = AB.map(([k, L, g]) => ({ k, v: base[g] + dice[L] }));
  const order = [...vals].sort((a, b) => b.v - a.v).map((x) => x.k);
  const start = Object.fromEntries(order.map((k, i) => [k, high.avg[i] ?? 0]));
  for (;;) {
    const rows = AB.map(([k, L, g, n]) => `<tr><td>${esc(disp(n))}</td><td style="text-align:center">${base[g] + dice[L]}</td><td><input type="number" name="g-${k}" min="0" value="${start[k]}" style="width:5em"></td></tr>`).join("");
    const res = await DV().wait({
      classes: ["sw25-chargen"], window: { resizable: true, title: L2(`Создание персонажа · рост характеристик (${high.col})`, `Character creation · ability growth (${high.col})`) },
      content: `<p>${L2(`Распределите ${high.growth} роста по характеристикам. Предложена «таблица среднего роста» книги: больше всего — самой высокой.`, `Spread ${high.growth} growths over the abilities. The book's “average growth” scheme is filled in: most to the highest one.`)}</p><table><tr><th></th><th>${L2("Сейчас", "Now")}</th><th>${L2("Рост", "Growth")}</th></tr>${rows}</table>`,
      buttons: [{ action: "ok", label: L2("Дальше", "Next"), default: true, callback: (ev, btn) => Object.fromEntries(AB.map(([k]) => [k, Math.max(0, Math.floor(Number(btn.form.elements[`g-${k}`].value) || 0))])) }],
      rejectClose: false,
    }).catch(() => null);
    if (!res || res === "ok") return null;
    const sum = Object.values(res).reduce((a, b) => a + b, 0);
    if (sum !== high.growth) { ui.notifications.warn(L2(`Распределено ${sum} из ${high.growth}.`, `${sum} of ${high.growth} spread.`)); Object.assign(start, res); continue; }
    return res;
  }
}

/** Combat feat slots: one on each odd adventurer level. */
const slotsFor = (lv) => Math.max(1, Math.ceil(Math.max(1, lv) / 2));
/** Combat feats the world has (made in the talent constructor or imported); auto-granted ones are skipped. */
async function stepFeats(advLv) {
  const slots = slotsFor(advLv);
  const pool = game.items.filter((i) => i.type === "combatability" && i.system?.condtype !== "learn").sort((a, b) => a.name.localeCompare(b.name));
  if (!pool.length) return [];
  const rows = pool.map((f) => `<label style="display:block;margin:2px 0"><input type="checkbox" value="${f.id}"> <b>${esc(f.name)}</b>${f.system?.overview ? ` <small>— ${esc(String(f.system.overview).slice(0, 140))}</small>` : ""}</label>`).join("");
  const res = await DV().wait({
    classes: ["sw25-chargen"], window: { resizable: true, title: L2(`Создание персонажа · боевые таланты (${slots})`, `Character creation · combat feats (${slots})`) },
    position: { width: 560 },
    content: `<div class="sw25-cg-feats"><p>${L2(`Слотов: ${slots} (по одному на 1, 3, 5… уровне авантюриста). Условия получения проверьте по книге. Автоматические таланты классов добавятся сами.`, `Slots: ${slots} (one on adventurer level 1, 3, 5…). Check the requirements in the book. Automatic class feats are added by themselves.`)}</p><div style="max-height:380px;overflow:auto">${rows}</div></div>`,
    buttons: [
      { action: "ok", label: L2("Дальше", "Next"), default: true, callback: (ev, btn) => [...btn.form.querySelectorAll(".sw25-cg-feats input:checked")].map((c) => c.value) },
      { action: "skip", label: L2("Пропустить", "Skip"), callback: () => [] },
    ],
    render: (ev, dlg) => {
      const boxes = [...(dlg?.element ?? ev?.target?.element)?.querySelectorAll?.(".sw25-cg-feats input") ?? []];
      boxes.forEach((b) => b.addEventListener("change", () => { const n = boxes.filter((x) => x.checked).length; boxes.forEach((x) => { if (!x.checked) x.disabled = n >= slots; }); }));
    },
    rejectClose: false,
  }).catch(() => null);
  if (res === null || res === undefined) return null;
  return (Array.isArray(res) ? res : []).slice(0, slots).map((id) => game.items.get(id)).filter(Boolean);
}

// classes a race cannot take: Tabbits and Runefolk cannot be Priests⁠​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌​‌​‌‌​​‌‌​​‌‌​​​‌‌​​‌‌​​​​​​‌‌‌​​​​‌‌​​‌‌​​​‌‌​‌‌​​​‌​‌‌​‌​‌‌​​​‌​⁠
const RACE_BANS = { "Таббит": ["priest"], "Рунфолк": ["priest"] };
async function stepClasses(birthInfo, raceName, high = null) {
  const banned = RACE_BANS[raceName] ?? [];
  const list = classList().filter((c) => !banned.includes(classKey(c.name)));
  const free = new Set(birthInfo.classes.map((n) => findClass(n)?.id).filter(Boolean));
  const budget = birthInfo.birth.exp + (high?.exp ?? 0);
  const maxLv = high ? 15 : 2;
  const spent = (levels) => list.reduce((a, c) => a + Math.max(0, costOf(c, levels[c.id] ?? 0) - (free.has(c.id) ? costOf(c, 1) : 0)), 0);
  const rows = list.map((c) => {
    const min = free.has(c.id) ? 1 : 0;
    return `<tr><td>${esc(c.name)}${free.has(c.id) ? L2(" <small>(предыстория)</small>", " <small>(background)</small>") : ""}</td><td>${isMajor(c) ? L2("основной (A)", "major (A)") : L2("малый (B)", "minor (B)")}</td>
      <td><select name="lv-${c.id}" class="sw25-cg-lv">${Array.from({ length: maxLv + 1 }, (_, l) => l).filter((l) => l >= min).map((l) => `<option value="${l}" ${l === min ? "selected" : ""}>${l}</option>`).join("")}</select></td></tr>`;
  }).join("");
  const read = (form) => Object.fromEntries(list.map((c) => [c.id, Number(form.elements[`lv-${c.id}`].value) || 0]));
  const bind = (root) => {
    // DialogV2 has its own <form>: a nested one would be dropped by the browser, so this is a <div>
    const box = root?.querySelector?.(".sw25-cg");
    const form = box?.closest("form");
    if (!box || !form || box.dataset.bound) return;
    box.dataset.bound = "1";
    const upd = () => {
      const left = budget - spent(read(form));
      const el = box.querySelector(".sw25-cg-left");
      el.textContent = left;
      el.style.color = left < 0 ? "#b00" : "";
    };
    box.addEventListener("change", upd);
    upd();
  };
  for (;;) {
    const hook = Hooks.on("renderDialogV2", (app, el) => bind(el));
    const levels = await DV().wait({
      classes: ["sw25-chargen"], window: { resizable: true, title: L2("Создание персонажа · 4/4 · классы", "Character creation · 4/4 · classes") },
      position: { width: 520 },
      content: `<div class="sw25-cg"><p>${high ? L2(`Свободный опыт: <b class="sw25-cg-left">${budget}</b> из ${budget} (предыстория + ${high.exp}). Главный класс — около среднего уровня ${high.col}; Разведчик, Мудрец, Рейнджер — не ниже чем на 2 уровня меньше. Остаток опыта сохранится.`, `Free experience: <b class="sw25-cg-left">${budget}</b> of ${budget} (background + ${high.exp}). Main class around the average level ${high.col}; Scout, Sage, Ranger no more than 2 levels lower. Unspent experience is kept.`) : L2(`Свободный опыт: <b class="sw25-cg-left">${budget}</b> из ${budget}. При создании ни один класс не выше 2 уровня; остаток опыта сохранится.`, `Free experience: <b class="sw25-cg-left">${budget}</b> of ${budget}. No class may start above level 2; unspent experience is kept.`)}</p>
        <div style="max-height:420px;overflow:auto"><table style="font-size:.9em"><tr><th>${L2("Класс", "Class")}</th><th>${L2("Таблица опыта", "Exp table")}</th><th>${L2("Уровень", "Level")}</th></tr>${rows}</table></div></div>`,
      buttons: [{ action: "ok", label: L2("Создать персонажа", "Create character"), default: true, callback: (ev, btn) => read(btn.form) }],
      render: (ev, dlg) => bind(dlg?.element ?? ev?.target),
      rejectClose: false,
    }).catch(() => null);
    Hooks.off("renderDialogV2", hook);
    if (!levels || levels === "ok") return null;
    const left = budget - spent(levels);
    if (left < 0) { ui.notifications.warn(L2(`Не хватает опыта: перерасход ${-left}. Уберите уровень.`, `Not enough experience: ${-left} over budget. Remove a level.`)); continue; }
    return { levels, left };
  }
}

export async function openCharacterWizard() {
  if (!game.user.can("ACTOR_CREATE")) return ui.notifications.warn(L2("У вас нет права создавать персонажей — попросите ГМа запустить мастер и назначить вас владельцем.", "You are not allowed to create characters — ask the GM to run the wizard and make you the owner."));
  await loadPackDocs();
  const s1 = await stepRace();
  if (!s1) return null;
  const s2 = await stepBirth(s1.race);
  if (!s2) return null;
  const dice = await stepAbilities(s1.race, s2.base);
  if (!dice) return null;
  const growth = s1.high ? await stepGrowth(s1.high, s2.base, dice) : {};
  if (!growth) return null;
  const s4 = await stepClasses(s2, s1.race, s1.high);
  if (!s4) return null;
  const advLv = Math.max(0, ...Object.values(s4.levels));
  const feats = await stepFeats(advLv);
  if (!feats) return null;
  const money = s1.high ? s1.high.money : START_MONEY;

  const abilities = Object.fromEntries(AB.map(([k, L, g]) => [k, { racevalue: s2.base[g], valuebase: dice[L], basename: L, ...(growth[k] ? { valuegrowth: growth[k] } : {}) }]));
  const ownership = { default: 0 };
  if (s1.owner) ownership[s1.owner] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  // [2026-10-07] a player running the wizard must own the new actor, or the next steps (items, HP) fail
  if (!game.user.isGM) ownership[game.user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  const actor = await Actor.create({
    name: s1.name, type: "character", ownership,
    system: { race: disp(s1.race), money, abilities, attributes: { born: disp(s2.birth.name), totalexp: 3000 + (s1.high?.exp ?? 0), ...(s1.high ? { honer: { rank: "-", value: s1.high.rep } } : {}), ...(s1.race === "Найтмар" ? { impurity: 1 } : {}) } },
    flags: { sw25: { chargen: { race: s1.race, birth: s2.birth.name, base: s2.base, dice } } },
  });
  const copy = (it, patch = {}) => { const o = it.toObject(); delete o._id; delete o.folder; return foundry.utils.mergeObject(o, patch); };
  const items = [];
  for (const c of classList()) { const lv = s4.levels[c.id] ?? 0; if (lv > 0) items.push(copy(c, { system: { skilllevel: lv } })); }
  for (const f of feats) items.push(copy(f));
  const norm = (x) => String(x ?? "").toLowerCase().replace(/ё/g, "е");
  for (const it of sourceItems("raceability").filter((i) => norm(i.folder?.name) === norm(s1.race) || norm(i.folder?.name) === norm(EN_NAMES[s1.race]) || norm(i.folder?.name) === norm(JA_NAMES[s1.race]))) items.push(copy(it));
  const dropped = s2.classes.filter((n) => !findClass(n));
  if (dropped.length) ui.notifications.warn(L2(`Мастер персонажа: не найден класс предыстории (${dropped.join(", ")}) — добавьте его вручную.`, `Character wizard: background class not found (${dropped.map(disp).join(", ")}) — add it manually.`));
  if (items.length) await actor.createEmbeddedDocuments("Item", items);
  // the system adds its own basic checks a moment after creation: add only what is still missing
  await new Promise((r) => setTimeout(r, 1200));
  const have = actor.items.filter((i) => i.type === "check").map((i) => i.name);
  const pool = sourceItems("check");
  // the name in the client's language first, then the other spelling
  const pickCheck = (al) => { const [a, b] = lang() === "ru" ? al : isJa() ? [al[2], al[1]] : [al[1], al[0]]; return pool.find((i) => i.name === a) ?? pool.find((i) => i.name === b) ?? pool.find((i) => isCheck(i.name, al)); };
  const checks = BASIC_CHECKS.filter((al) => !have.some((n) => isCheck(n, al))).map(pickCheck).filter(Boolean).map((ck) => copy(ck));
  if (checks.length) await actor.createEmbeddedDocuments("Item", checks);
  await actor.update({ "system.hp.value": Number(actor.system.hp?.max) || 0, "system.mp.value": Number(actor.system.mp?.max) || 0 });

  const todo = [feats.length < slotsFor(advLv) ? L2("оставшиеся боевые таланты", "the remaining combat feats") : null, L2("языки", "languages"), L2("покупка снаряжения", "buying equipment"),
    L2("заклинания класса", "class spells"), s1.high ? L2("осколки Бездны", "abyss shards") : null].filter(Boolean).join(L2(", ", ", "));
  const cls = classList().filter((c) => (s4.levels[c.id] ?? 0) > 0).map((c) => `${c.name} ${s4.levels[c.id]}`).join(", ") || L2("нет", "none");
  ChatMessage.create({
    speaker: { alias: L2("Создание персонажа", "Character creation") },
    content: `<div class="sw25-cast-mp"><b>${esc(actor.name)}</b> — ${esc(disp(s1.race))}, ${esc(disp(s2.birth.name))}${s2.rolled ? ` (2d = ${s2.rolled})` : ""}</div>
      <div class="sw25-cast-mp">${AB.map(([k, L, g, n]) => `${disp(n)} ${s2.base[g] + dice[L]}`).join(" · ")}</div>
      <div class="sw25-cast-mp">${L2(`Классы: ${esc(cls)} · свободный опыт ${s4.left} · ${money} G на снаряжение`, `Classes: ${esc(cls)} · free experience ${s4.left} · ${money} G for equipment`)}</div>
      ${s1.high ? `<div class="sw25-cast-mp">${L2(`Высокий уровень ${s1.high.col}: рост характеристик ×${s1.high.growth}, репутация ${s1.high.rep}, осколков Бездны ${s1.high.abyss}.`, `High level ${s1.high.col}: ${s1.high.growth} ability growths, reputation ${s1.high.rep}, ${s1.high.abyss} abyss shards.`)}</div>` : ""}
      <div class="sw25-cast-mp">${L2(`Боевых талантов: ${feats.length} из ${slotsFor(advLv)}.`, `Combat feats: ${feats.length} of ${slotsFor(advLv)}.`)}${feats.length ? ` (${esc(feats.map((f) => f.name).join(", "))})` : ""}</div>
      <div class="sw25-cast-mp"><i>${L2(`Дальше вручную: ${todo}.`, `Next, by hand: ${todo}.`)}</i></div>`,
  });
  actor.sheet.render(true);
  return actor;
}

export function registerChargen() {
  game.sw25 = Object.assign(game.sw25 ?? {}, { chargen: { open: openCharacterWizard, RACES } });
  Hooks.on("renderActorDirectory", (app, html) => {
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root || root.querySelector(".sw25-chargen") || !game.user.can("ACTOR_CREATE")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sw25-chargen";
    btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${L2("Мастер создания персонажа", "Character creation wizard")}`;
    btn.addEventListener("click", () => openCharacterWizard());
    const host = root.querySelector(".header-actions") ?? root.querySelector(".directory-header") ?? root;
    host.appendChild(btn);
  });
}
