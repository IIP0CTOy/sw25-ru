/*
 * Sword World 2.5 Plus (sw25-ru)
 * Copyright (c) 2026 IIP0CTOy. All rights reserved.⁠​‌​​‌​​‌​‌​​‌​​‌​‌​‌​​​​​​‌‌​​​​​‌​​​​‌‌​‌​‌​‌​​​‌​​‌‌‌‌​‌‌‌‌​​‌​​‌​‌‌‌‌​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​​‌​‌‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌‌‌​‌‌​​​‌​​​‌‌​‌‌‌​​‌‌​‌​​​‌‌​​‌​‌​‌‌​​​​‌​‌‌​​‌​​⁠
 * NOT covered by the MIT License of this repository (since 2.4.1-ru.11.3): see LICENSE-RESERVED.txt.
 */
/**
 * Japanese UI layer (2026-10-13). The interface strings of this system are written as⁠​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌​‌​‌‌​​​‌​​​‌‌​‌‌‌​​‌‌​‌​​​‌‌​​‌​‌​‌‌​​​​‌​‌‌​​‌​​​​‌​‌‌​‌​‌‌​​​‌​⁠
 * L2("по-русски", "in English"); for a Japanese client L2 looks the English string up here.
 * Static strings: exact match. Templates: "${}" marks a runtime value; "${n}" in the Japanese
 * text is the n-th value of the English one. Game terms only — no book text.
 */
export const JA_STATIC = new Map(Object.entries({
"+1 extra damage against a revealed weak point — track manually.": "露わになった弱点に対して追加ダメージ+1 — 手動で管理してください。",
"+1 to the first Technique / Movement / Observation / Knowledge check within 10 minutes — apply manually.": "10分以内の最初の技巧／運動／観察／知識判定に+1 — 手動で適用してください。",
"+2 to Resistance against Poison, Disease and Curse for 10 minutes — apply manually.": "10分間、毒・病気・呪いに対する抵抗力判定に+2 — 手動で適用してください。",
"A target at HP ≤ 0 recovers 10 HP and regains consciousness — apply manually.": "HPが0以下の対象はHPを10回復し、意識を取り戻します — 手動で適用してください。",
"Accessory": "装飾品",
"Against Daemons and Undead the reduction is 3 instead of 2 — apply manually.": "魔神とアンデッドに対しては軽減が2ではなく3になります — 手動で適用してください。",
"Agility": "敏捷度",
"Agility bonus": "敏捷度ボーナス",
"Alchemist evocation": "アルケミストの賦術",
"All checks": "すべての判定",
"An ally who recovers at least 1 HP this round gains another +5 HP — apply manually.": "このラウンドにHPを1点以上回復した味方は、さらにHPを5回復します — 手動で適用してください。",
"Another +1 against Daemons and Undead — apply manually.": "魔神とアンデッドに対してさらに+1 — 手動で適用してください。",
"Area around the caster": "術者を中心とした範囲",
"Area at a point (sphere)": "地点を中心とした範囲（球形）",
"Armour & shields": "防具・盾",
"Bard song": "呪歌",
"Black": "黒",
"Classes": "技能",
"Crit threshold (−1 = easier)": "C値（−1＝出やすくなる）",
"Custom text": "カスタムテキスト",
"Damage reduction": "ダメージ軽減",
"Days": "日",
"Dexterity": "器用度",
"Dexterity bonus": "器用度ボーナス",
"Each ally may immediately make a Monster Knowledge check for the indicated monster.": "味方はそれぞれ、指定された魔物について直ちに魔物知識判定を行えます。",
"Earth Qi": "地の命脈",
"Enhancer techniques": "練技",
"For one attack — remove the effect afterwards.": "1回の攻撃のみ — その後、効果を削除してください。",
"For one spellcasting check — remove the effect afterwards.": "1回の行使判定のみ — その後、効果を削除してください。",
"For one target of one spell — remove the effect afterwards.": "1つの魔法の対象1体のみ — その後、効果を削除してください。",
"Fortitude": "生命抵抗力",
"Gold": "金",
"Green": "緑",
"Ground speed is halved; no effect if the target is not on the ground.": "地上での移動力が半減します。対象が地上にいない場合は効果がありません。",
"HP at the end of each turn": "各手番終了時のHP",
"Heaven Qi": "天の命脈",
"Hours": "時間",
"Initiative": "先制力",
"Initiative: you may use “Tactician level + Intelligence mod. + 1” — apply manually.": "先制判定：「ウォーリーダー技能レベル＋知力ボーナス＋1」を使用できます — 手動で適用してください。",
"Inspirational": "鼓舞系",
"Intelligence": "知力",
"Intelligence bonus": "知力ボーナス",
"Less earth damage taken": "受ける土属性ダメージを軽減",
"Less fire damage taken": "受ける炎属性ダメージを軽減",
"Less lightning damage taken": "受ける雷属性ダメージを軽減",
"Less water/ice damage taken": "受ける水・氷属性ダメージを軽減",
"Less wind damage taken": "受ける風属性ダメージを軽減",
"Line from the caster": "術者からの直線",
"MP at the end of each turn": "各手番終了時のMP",
"MP saving": "MP軽減",
"MP saving (per spell)": "MP軽減（魔法ごと）",
"Magic power": "魔力",
"Max HP": "最大HP",
"Max MP": "最大MP",
"Minutes": "分",
"Monster Knowledge": "魔物知識",
"Monster knowledge": "魔物知識判定",
"Movement": "運動",
"No more than half the target's max MP; once per day.": "対象の最大MPの半分まで。1日1回。",
"Once per day.": "1日1回。",
"Racial abilities": "種族特徴",
"Ranged attacks only.": "遠隔攻撃のみ。",
"Red": "赤",
"Renewal": "再生",
"Resistance": "抵抗力",
"Rounds": "ラウンド",
"Self": "術者",
"Shot (single target)": "射撃（1体）",
"Single target": "対象1体",
"Skill checks": "行為判定",
"Spell": "魔法",
"Spell crit threshold": "魔法のC値",
"Spell damage": "魔法ダメージ",
"Spellcasting checks": "行使判定",
"Spirit": "精神力",
"Spirit Qi": "人の命脈",
"Spirit bonus": "精神力ボーナス",
"Strength": "筋力",
"Strength bonus": "筋力ボーナス",
"The damage reduction applies only to attacks of the chosen target.": "ダメージ軽減は選択した対象からの攻撃にのみ適用されます。",
"The effect ends after the first Evasion check — remove it manually.": "最初の回避判定の後に効果は終了します — 手動で削除してください。",
"The target cannot move (no effect on flying creatures).": "対象は移動できません（飛行している対象には効果なし）。",
"This round the Tactician's songs affect only the chosen side — apply manually.": "このラウンド、ウォーリーダーの鼓咆は選択した側にのみ効果を及ぼします — 手動で適用してください。",
"Vitality": "生命力",
"Vitality bonus": "生命力ボーナス",
"Wakes fallen/sleeping allies like [Awaken] — apply manually.": "【アウェイクン】のように、倒れた／眠っている味方を目覚めさせます — 手動で適用してください。",
"Weapon": "武器",
"Weapon damage": "武器ダメージ",
"White": "白",
"Willpower": "精神抵抗力",
"allies within 30 m (bonus)": "30m以内の味方（ボーナス）",
"damage reduction": "ダメージ軽減",
"effect / description only": "効果／説明のみ",
"effect duration, rounds": "効果時間（ラウンド）",
"foes within 30 m (penalty)": "30m以内の敵（ペナルティ）",
"heals HP: Magic Power + N": "HP回復：魔力＋N",
"magic defense": "魔法防御",
"magic power": "魔力",
"main": "主動作",
"minor": "補助動作",
"movement (m)": "移動力（m）",
"nobody (rhythm only)": "なし（楽素のみ）",
"nothing": "なし",
"passive": "常時",
"phys. damage": "物理ダメージ",
"regeneration: +N HP at the end of each turn": "再生：各手番終了時にHP+N",
"regeneration: +N MP at the end of each turn": "再生：各手番終了時にMP+N",
"setup": "戦闘準備",
"spellcasting checks": "行使判定",
"the size of the bonus": "ボーナスの値",
"−1 to all active checks that compare success values.": "達成値を比べるすべての能動的な判定に−1。",
" <small>(background)</small>": " <small>（生まれ）</small>",
" — disabled": " — 無効",
"3 h of sleep: +10% HP and half of MP. 6 h of sleep: +20% HP and all MP. No more than 6 hours of sleep count per day. “Once per day” comes back with the new day (06:00), “once per hour” after a rest.": "3時間の睡眠：HP+10%、MPの半分。6時間の睡眠：HP+20%、MP全回復。睡眠は1日6時間までしか数えません。「1日1回」は新しい日（06:00）に、「1時間に1回」は休息後に回復します。",
"6 hours of sleep: +20% HP, all MP; “once per hour” is restored.": "6時間の睡眠：HP+20%、MP全回復。「1時間に1回」が回復します。",
"<b>No allies nearby — no Edge gained.</b>": "<b>近くに味方がいません — 陣気は得られません。</b>",
"<b>No target selected — effect not applied.</b>": "<b>対象が選択されていません — 効果は適用されませんでした。</b>",
"<b>No “Edge” counter.</b>": "<b>「陣気」カウンターがありません。</b>",
"<i>Apply the effect manually.</i>": "<i>効果を手動で適用してください。</i>",
"A name is required.": "名前は必須です。",
"A selected monster has no name.": "選択した魔物に名前がありません。",
"A song's bonus lasts 1 round and is renewed by each performance. A penalty is a negative number.": "呪歌のボーナスは1ラウンド持続し、演奏のたびに更新されます。ペナルティは負の数で入力します。",
"AUTOMATIC FAILURE (double 1) — the character dies": "自動失敗（1ゾロ）— キャラクターは死亡します",
"AUTOMATIC SUCCESS (double 6) — wakes up at 1 HP immediately": "自動成功（6ゾロ）— ただちにHP1で目を覚まします",
"Ability (blank)": "能力（空欄）",
"Acc": "命中",
"Accessories": "装飾品",
"Accuracy": "命中力",
"Accuracy ±": "命中力 ±",
"Action": "行動",
"Add": "追加",
"Add an attack or an ability to this section": "この部位に攻撃または能力を追加",
"Add material cards": "マテリアルカードを追加",
"Add material cards (color, rank, quantity)": "マテリアルカードを追加（色・ランク・枚数）",
"Add one more section like this (full HP)": "同じ部位をもう1つ追加（HP全快）",
"Add row": "行を追加",
"Alchemist evocations": "アルケミストの賦術",
"All": "すべて",
"All sections": "全部位",
"Allies": "味方",
"Always": "常時",
"Amount (N)": "量（N）",
"An hour passed": "1時間経過",
"Any damage": "すべてのダメージ",
"Armour": "鎧",
"Aspect": "相域",
"At most 10 sheets at a time (it is someone else's site).": "一度に最大10枚まで（他者のサイトのため）。",
"Attack": "攻撃",
"Attack (accuracy / damage / evasion)": "攻撃（命中・ダメージ・回避）",
"Background": "生まれ",
"Bard songs": "バードの呪歌",
"Bonuses apply while the item is equipped.": "アイテムを装備している間、ボーナスが適用されます。",
"Book": "出典",
"Breakthrough": "突破",
"Buy": "購入",
"Buyer": "購入者",
"By": "変化量",
"Cancel": "キャンセル",
"Cards are resources on the character sheet; they appear by themselves when the Alchemist class or an evocation is added. The check uses the Alchemist class and Intelligence.": "カードはキャラクターシートのリソースです。アルケミスト技能または賦術を追加すると自動的に表示されます。判定にはアルケミスト技能と知力を使用します。",
"Cards of each colour spent per use": "1回の使用で消費する各色のカード",
"Caster": "術者",
"Category": "カテゴリ",
"Character creation": "キャラクター作成",
"Character creation wizard": "キャラクター作成ウィザード",
"Character creation · 1/4 · name and race": "キャラクター作成 · 1/4 · 名前と種族",
"Character creation · 3/4 · abilities": "キャラクター作成 · 3/4 · 能力値",
"Character creation · 4/4 · classes": "キャラクター作成 · 4/4 · 技能",
"Characters": "キャラクター",
"Check": "判定",
"Check by hand": "手動で判定",
"Choice: one of the rows is picked when applied": "選択式：適用時にいずれか1行が選ばれます",
"Class": "技能",
"Classes, skill checks, racial abilities and Enhancer techniques — names and numbers only, no rulebook text. The character wizard and the sheets use them. The guide “SW25: how to make items and abilities” is built with them.": "技能、判定パッケージ、種族特徴、練技 — 名称と数値のみで、ルールブックの本文は含みません。キャラクター作成ウィザードとシートで使用されます。ガイド「SW25：アイテムと能力の作り方」はこれを使って作られています。",
"Close": "閉じる",
"Color": "色",
"Could not hand out the items — the money was refunded.": "アイテムを渡せませんでした — 代金は返金されました。",
"Create": "作成",
"Create character": "キャラクターを作成",
"Create in the world": "ワールドに作成",
"Crit": "C値",
"Damage": "ダメージ",
"Damage type": "ダメージの種類",
"Death Check": "生死判定",
"Death Check: no character selected.": "生死判定：キャラクターが選択されていません。",
"Def": "防護",
"Defense": "防護点",
"Defense (formula)": "防護点（式）",
"Description (typed by hand)": "説明（手入力）",
"Dmg": "ダメージ",
"Drag items here (from a compendium, the Items directory or a sheet)": "ここにアイテムをドラッグしてください（辞典、アイテムディレクトリ、またはシートから）",
"Duration": "持続時間",
"Duration text": "持続時間（テキスト）",
"Duration, rounds (empty — none)": "持続ラウンド数（空欄 — なし）",
"Earth": "土",
"Edge": "陣気",
"Effect duration, rd.": "効果の持続（R）",
"Effect duration, rd. (empty — same as the spell)": "効果の持続（R）（空欄 — 魔法と同じ）",
"Effects": "バフ・デバフ",
"Effects were read from the text automatically. To correct them use the Effects button in the item sheet header.": "効果は本文から自動的に読み取られました。修正するにはアイテムシートのヘッダーにある「効果」ボタンを使ってください。",
"Element": "属性",
"Energy": "純エネルギー",
"Essence Weave": "操気",
"Eva": "回避",
"Evasion": "回避力",
"Evasion ±": "回避力 ±",
"Everyone on the line": "射線上の全員",
"Everything is restored: HP, MP and all “once per day” / “once per hour” abilities.": "すべて回復します：HP、MP、および「1日1回」「1時間に1回」の能力すべて。",
"Experience": "経験点",
"Extra damage ±": "追加ダメージ ±",
"Extra rhythm on a flourish": "巧奏値達成時の追加楽素",
"Failure — the character dies": "失敗 — キャラクターは死亡します",
"Finale (spends rhythm)": "終律（楽素を消費）",
"Finales": "終律",
"Fire": "炎",
"Flourish (check threshold)": "巧奏値（判定の閾値）",
"Full description": "詳細説明",
"Full rest": "完全休息",
"Grant automatically": "自動で付与",
"HP": "HP",
"Half a rest: +10% HP, half of MP; “once per hour” is restored.": "半分の休息：HP+10%、MPの半分。「1時間に1回」が回復します。",
"Healing damage": "回復効果ダメージ",
"How many": "個数",
"How to give": "渡し方",
"Human": "人間",
"Ice/Water": "水・氷",
"If the card rank sets the size of the bonus, the number in the row is replaced by the rank value (type any, e.g. 1). If it sets the duration, the effect lasts that many rounds.": "カードのランクがボーナスの大きさを決める場合、行の数値はランクの値に置き換えられます（任意の値、例えば1を入力）。持続時間を決める場合、効果はその数のラウンドだけ持続します。",
"Impact damage": "衝撃ダメージ",
"Instant": "一瞬",
"Item": "アイテム",
"Item constructor": "アイテムビルダー",
"Items": "アイテム",
"Items and spells": "アイテムと魔法",
"Kind": "種別",
"Level": "レベル",
"Line": "射線",
"Lines copied. Translate them and paste the result into this same field.": "行をコピーしました。翻訳して、結果をこの欄に貼り付けてください。",
"Loot: select the token of the character who takes it (a monster is selected now).": "戦利品：受け取るキャラクターのトークンを選択してください（現在は魔物が選択されています）。",
"MP": "MP",
"Magic": "魔法",
"Magic damage": "魔法ダメージ",
"Magic defense": "魔法防御",
"Maneuver": "陣率",
"Max targets (0 — all)": "最大対象数（0 — 全員）",
"Min. Strength": "必要筋力",
"Miscellaneous": "その他",
"Money": "所持金",
"Monsters": "魔物",
"Name": "名前",
"New Adventurer": "新しい冒険者",
"New ability": "新しい能力",
"New day (06:00)": "新しい日（06:00）",
"Next": "次へ",
"Next, by hand: the level 1 combat feat, languages, buying equipment, class spells.": "この後は手動で：1レベルの戦闘特技、言語、装備の購入、技能の魔法。",
"No characters to rest: select tokens or assign characters to the players.": "休息するキャラクターがいません：トークンを選択するか、プレイヤーにキャラクターを割り当ててください。",
"No simple bonuses found in the description — add rows by hand.": "説明に単純なボーナスが見つかりませんでした — 手動で行を追加してください。",
"No ytsheet data (monsters, spells, items) found in the files.": "ファイルにゆとシートのデータ（魔物、魔法、アイテム）が見つかりませんでした。",
"Note": "備考",
"Numeric bonuses and penalties": "数値のボーナスとペナルティ",
"On a successful save": "抵抗に成功した場合",
"On use": "使用時",
"Only items can be dropped here.": "ここにはアイテムのみドロップできます。",
"Only the GM can build the samples.": "サンプルを作成できるのはGMのみです。",
"Only the GM can build the starter compendiums.": "スターター辞典を作成できるのはGMのみです。",
"Only the owner of the loot can turn it into a card.": "戦利品をカードにできるのは、その所有者のみです。",
"Other": "その他",
"Owning player": "所有プレイヤー",
"Paste ytsheet links or sheet IDs.": "ゆとシートのリンクまたはシートIDを貼り付けてください。",
"Permanent": "永続",
"Physical damage": "物理ダメージ",
"Pick a character of yours.": "自分のキャラクターを選んでください。",
"Power": "威力",
"Press “Copy texts for translation” first.": "先に「翻訳用テキストをコピー」を押してください。",
"Price": "価格",
"Price, G": "価格（G）",
"Qi": "命脈",
"Qty": "数",
"Quantity": "数量",
"Race": "種族",
"Radius, m": "半径（m）",
"Range": "射程",
"Range, m": "射程（m）",
"Rank": "ランク",
"Re-read from the description": "説明から再読み込み",
"Remove": "削除",
"Remove row": "行を削除",
"Remove section": "部位を削除",
"Remove this section": "この部位を削除",
"Reroll": "振り直し",
"Rest": "休息",
"Rest 3 h": "3時間休息",
"Rest 6 h": "6時間休息",
"Rhythm cost": "楽素コスト",
"Rhythm needed for the effect": "効果に必要な楽素",
"Rhythm per performance": "演奏ごとの楽素",
"Roll 2d (main table)": "2dを振る（メイン表）",
"SW25 — Samples": "SW25 — サンプル",
"SW25: starter compendiums": "SW25：スターター辞典",
"SW25: the starter compendiums already exist.": "SW25：スターター辞典はすでに存在します。",
"Sage or Rider": "セージまたはライダー",
"Samples: characters and monsters": "サンプル：キャラクターと魔物",
"Save": "保存",
"School of magic (type it)": "魔法の系統（入力）",
"Sections": "部位",
"Select the text in the field and copy it by hand (Ctrl+C), translate it, then paste it back.": "欄内のテキストを選択して手動でコピー（Ctrl+C）し、翻訳してから貼り付けてください。",
"Set": "設定",
"Shape": "形状",
"Shields": "盾",
"Shop": "ショップ",
"Shot": "射撃",
"Side initiative is already decided — no separate rolls are needed.": "陣営の先制はすでに決まっています — 個別のロールは不要です。",
"Silver weapons": "銀の武器",
"Simple numeric bonuses and penalties. Edit, add or remove rows and press Save.": "単純な数値のボーナスとペナルティです。行を編集・追加・削除して「保存」を押してください。",
"Skill / Body / Mind": "技 / 体 / 心",
"Sleep 3 hours": "3時間睡眠",
"Sleep 6 hours": "6時間睡眠",
"Slot": "部位",
"Some items have no price.": "価格のないアイテムがあります。",
"Song (builds rhythm)": "呪歌（楽素を貯める）",
"Songs": "呪歌",
"Source": "参照元",
"Spells": "魔法",
"Starting classes": "初期技能",
"Stratagem": "鼓咆",
"Success — still unconscious, but alive": "成功 — 気絶したままですが、生きています",
"Sum": "合計",
"Summary (one line)": "概要（1行）",
"Target": "対象",
"Target for the next attacks and healing": "次の攻撃と回復の対象",
"The GM has to confirm the character’s death — the system does not do it automatically.": "キャラクターの死亡はGMが確定してください — システムは自動では行いません。",
"The Geomancer": "ジオマンサー",
"The Tactician": "ウォーリーダー",
"The background gives level 1 starting classes and the base ability values. “Experience” is what is left for other classes.": "生まれによって1レベルの初期技能と能力値の基本値が決まります。「経験点」は他の技能に使える残りです。",
"The background gives one of these classes — your choice.": "生まれによって、これらの技能のいずれか1つを得ます — 選択してください。",
"The card rank sets": "カードのランクが決めるもの",
"The cart is empty": "カートは空です",
"The cart is empty.": "カートは空です。",
"The compendiums already exist: choosing a language rebuilds them and your edits inside them are lost.": "辞典はすでに存在します：言語を選ぶと再構築され、辞典内での編集は失われます。",
"The main section cannot be removed, and at least two sections must remain.": "メイン部位は削除できません。また、部位は最低2つ残す必要があります。",
"The monster generator is GM-only.": "魔物ジェネレーターはGM専用です。",
"The rhythm counters ↑ ↓ ♡ appear on the bard's sheet by themselves at the first performance. The check uses the Bard class and Spirit.": "楽素カウンター ↑ ↓ ♡ は、最初の演奏時にバードのシートに自動的に表示されます。判定にはバード技能と精神力を使用します。",
"The section this ability belongs to": "この能力が属する部位",
"The site refused the request from the browser (or there is no network). Open the link with “&mode=json” in a new tab and paste the JSON into the field below.": "サイトがブラウザからのリクエストを拒否しました（またはネットワークがありません）。リンクに「&mode=json」を付けて新しいタブで開き、JSONを下の欄に貼り付けてください。",
"This looks like JSON but cannot be read (truncated or broken) — parsing it as plain text.": "JSONのようですが読み取れません（途切れているか壊れています）— プレーンテキストとして解析します。",
"This material has two colors: choose which card it becomes.": "この素材は2色あります：どちらのカードにするか選んでください。",
"This target has already resisted this attack.": "この対象はすでにこの攻撃に抵抗しています。",
"Thunder": "雷",
"To inventory": "所持品へ",
"Total": "総計",
"Totals only: nothing was written to the sheets.": "合計のみ：シートには何も書き込まれていません。",
"Touch": "接触",
"Turn one into an Alchemist card": "1つをアルケミストのカードにする",
"Type · cost lv. 1 / 2": "種類 · コスト Lv.1 / 2",
"Unnamed item": "名前のないアイテム",
"Unnamed spell": "名前のない魔法",
"Usage": "使用",
"Usage limit": "使用制限",
"Use it anyway?": "それでも使用しますか？",
"Use the selected one": "選択したものを使用",
"Weapons": "武器",
"What changes": "何が変わるか",
"What do we boost?": "何を強化しますか？",
"What it does": "効果",
"What it is": "内容",
"Whom it reaches": "対象範囲",
"Wind": "風",
"Works while equipped (otherwise applied on use)": "装備中に有効（それ以外は使用時に適用）",
"You are not allowed to create characters — ask the GM to run the wizard and make you the owner.": "キャラクターを作成する権限がありません — GMにウィザードを実行してもらい、あなたを所有者に設定してもらってください。",
"You do not own this item.": "このアイテムを所有していません。",
"You have no character to build the item onto.": "アイテムを作成する対象のキャラクターがいません。",
"You own no characters.": "所有しているキャラクターがいません。",
"a side is chosen but there is no bonus row": "陣営は選択されていますが、ボーナス行がありません",
"add to the sheets": "シートに追加",
"all sections": "全部位",
"any magic-user class": "任意の魔法使い系技能",
"area": "範囲",
"book": "出典",
"buys": "が購入：",
"by category": "カテゴリ別",
"character": "キャラクター",
"chat only": "チャットのみ",
"class": "技能",
"created": "作成しました",
"creation cancelled": "作成をキャンセルしました",
"damage by power": "威力によるダメージ",
"day": "日",
"days": "日",
"defense is a formula — only the numeric part went into pp": "防護点が式になっています — 数値部分のみをppに入れました",
"e.g. 20 m": "例：20m",
"effect": "効果",
"effect only": "効果のみ",
"end of turn — apply the damage by hand (the original spell roll was not found).": "ターン終了 — ダメージを手動で適用してください（元の魔法のロールが見つかりませんでした）。",
"equipment bonus": "装備ボーナス",
"fairy, magitech, priest…": "妖精、魔動機、神聖…",
"folder": "フォルダ",
"for 1 round": "1ラウンドの間",
"from level": "レベル",
"h": "時間",
"healing by power": "威力による回復",
"heals HP by power": "威力によるHP回復",
"hour": "時間",
"in English": "英語",
"in chat-only mode also clear the session totals (monsters, loot, 1-1 counters)": "チャットのみモードでは、セッションの集計（魔物、戦利品、1ゾロの回数）もクリアする",
"lv.": "Lv.",
"m": "m",
"major · 1000 / +1000": "Aテーブル · 1000 / +1000",
"min.": "分",
"minor action (otherwise main)": "補助動作（それ以外は主動作）",
"minor · 500 / +1000": "Bテーブル · 500 / +1000",
"miscellaneous": "その他",
"no cards": "カードなし",
"no cards set — the evocation costs nothing": "カードが設定されていません — この賦術はコストなしです",
"no healing": "回復なし",
"no — the player picks it": "なし — プレイヤーが選択",
"no “Fighting Style” table": "「Fighting Style」表がありません",
"no “Sections” line": "「部位数」の行がありません",
"none": "なし",
"not in the system list: the sheet shows it under Truespeech, the folder keeps your text": "システムの一覧にありません：シートでは真語魔法として表示され、フォルダには入力したテキストが保持されます",
"not recognised — pick from the list": "認識できません — 一覧から選んでください",
"nothing found": "何も見つかりません",
"onto": "→",
"open the sheet afterwards": "後でシートを開く",
"optional": "任意",
"power is not a number — usepower is off, the value is in the description": "威力が数値ではありません — usepowerはオフで、値は説明に記載されています",
"radius": "半径",
"rd.": "R",
"restores MP by power": "威力によるMP回復",
"rounds": "ラウンド",
"sec.": "秒",
"start typing: eva, str, укл…": "入力してください：eva, str, укл…",
"target": "対象",
"the rank value is not tied to anything — add a bonus row below": "ランクの値が何にも結び付いていません — 下にボーナス行を追加してください",
"the sheet has a second weapon/armour row — it was not imported, copy it by hand": "シートに2つ目の武器/防具の行があります — インポートされていないので、手動でコピーしてください",
"the text has a condition — the effect is created unconditional": "本文に条件があります — 効果は無条件で作成されます",
"the text offers a choice — one effect per option is created": "本文に選択肢があります — 選択肢ごとに1つの効果が作成されます",
"there is a bonus but no side chosen for the song — the effect will not be applied": "ボーナスはありますが、呪歌の陣営が選択されていません — 効果は適用されません",
"this hour": "この1時間",
"to card": "カード化",
"today": "今日",
"total HP": "最大HP",
"works while carried": "所持しているだけで有効",
"— nobody (later) —": "— なし（後で決定） —",
"— other —": "— その他 —",
"“Samples” rebuilds the built-in characters and monsters in the language of this client; edits made to them are lost.": "「サンプル」は、組み込みのキャラクターと魔物をこのクライアントの言語で再構築します。それらに加えた編集は失われます。",
" of ": " / ",
"(unnamed)": "（名称未設定）",
"+ add from template": "＋ テンプレートから追加",
"+ section": "＋ 部位",
"...or paste text with one or more monsters here": "…または、1体以上の魔物のデータテキストをここに貼り付けてください",
"...or paste text with one or more monsters here (or ytsheet JSON)": "…または、1体以上の魔物のデータテキストをここに貼り付けてください（ゆとシートのJSONも可）",
"1. Source": "1. 入力元",
"2. Monster": "2. 魔物",
"3. Abilities": "3. 特殊能力",
"4. Description / loot": "4. 解説 / 戦利品",
"5. Texts for translation (optional)": "5. 翻訳用テキスト（任意）",
"Abilities": "特殊能力",
"Acc.": "命中",
"An attack checked against Evasion; if evaded, it misses.": "回避力で判定する攻撃です。回避されると外れます。",
"Animal": "動物",
"Any magic damage +N": "魔法ダメージ（全種）+N",
"Any physical damage +N": "物理ダメージ（全種）+N",
"Applied manually for N rounds.": "手動でNラウンド適用します。",
"Apply translation": "翻訳を適用",
"Area around self": "自身の周囲の範囲",
"Area at a point (pick on map)": "指定地点の範囲（マップ上で選択）",
"Area of radius 3 m at a chosen point (range 20 m). Each target makes a Fortitude save; on success, half damage.": "選んだ地点を中心とする半径3mの範囲（射程20m）。各対象は生命抵抗力判定を行い、成功すればダメージ半減。",
"Area of radius 6 m around itself. Each target in the area makes a Fortitude save; on success it takes half damage.": "自身を中心とする半径6mの範囲。範囲内の各対象は生命抵抗力判定を行い、成功すればダメージ半減。",
"At the start of its turn the monster recovers N HP (manually).": "手番の開始時に、魔物はHPをN点回復します（手動）。",
"Barbarians": "蛮族",
"Base numbers (without the bracketed values). “Dmg +N” is the N from “2d+N”. More than one row = multi-section monster.": "基本値（括弧内の値を除く）。「打撃+N」は「2d+N」のNです。2行以上 = 複数部位の魔物。",
"Beam": "光線",
"Blank": "白紙",
"Blast": "爆発",
"Buff": "強化",
"Can't": "必中",
"Class:": "分類：",
"Construct": "魔法生物",
"Copy texts for translation": "翻訳用テキストをコピー",
"Could not find the “Level + Name” line — enter it manually": "「レベル＋名前」の行が見つかりません — 手動で入力してください",
"Create selected": "選択した魔物を作成",
"Daemon": "魔神",
"Def.": "防護",
"Delete": "削除",
"Description": "解説",
"Description (optional)": "解説（任意）",
"Disappears": "消滅",
"Disposition": "反応",
"Dmg +N": "打撃+N",
"Earth +N": "土 +N",
"Energy +N": "純エネルギー +N",
"Eva.": "回避",
"Fairy": "妖精",
"Fire +N": "炎 +N",
"Fireball": "火球",
"Fortitude (bonus)": "生命抵抗力（基本値）",
"Fortitude/Willpower not found": "生命抵抗力／精神抵抗力が見つかりません",
"Gaze": "視線",
"Habitat": "生息地",
"Half": "半減",
"Hit with save (Fortitude, half)": "抵抗付きの攻撃（生命抵抗力、半減）",
"Humanoid": "人族",
"Ice/Water +N": "水・氷 +N",
"Info / translation": "情報 / 翻訳",
"Language": "言語",
"Line 20 m long. Each target on the line makes a Fortitude save; on success, half damage.": "長さ20mの射線。射線上の各対象は生命抵抗力判定を行い、成功すればダメージ半減。",
"Load from links": "リンクから読み込む",
"Loot": "戦利品",
"Magic (goes into the “Magic” text of the GM info): ": "魔法（GM情報の「魔法」欄に記載されます）：",
"Magitech": "魔動機",
"Main section": "メイン部位",
"Mental (Willpower, negates)": "精神効果（精神抵抗力、消滅）",
"Monster generator": "魔物ジェネレーター",
"Monsters found:": "見つかった魔物：",
"Mythical Beast": "幻獣",
"Names, descriptions and ability texts can go through any translator: structure and numbers are not affected.": "名前・解説・特殊能力のテキストは、どの翻訳ツールにかけても構いません。構造と数値は影響を受けません。",
"Negate": "消滅",
"New monster": "新しい魔物",
"No abilities — import text or add from a template.": "特殊能力がありません — テキストを取り込むか、テンプレートから追加してください。",
"No status rows (status1…) in the JSON": "JSONにステータス行（status1…）がありません",
"Nobody selected.": "誰も選択されていません。",
"One target. Fortitude save: half damage on success.": "対象1体。生命抵抗力判定：成功すればダメージ半減。",
"Open ytsheet": "ゆとシートを開く",
"Optional": "任意",
"Parse text": "テキストを解析",
"Parsed monsters:": "解析した魔物：",
"Passive": "常時",
"Passive (◯, text)": "常時（◯、テキスト）",
"Paste some text.": "テキストを貼り付けてください。",
"Paste the translated lines here (keep the “N|” numbering)": "翻訳済みの行をここに貼り付けてください（「N|」の番号は残してください）",
"Perception": "知覚",
"Plant": "植物",
"Regeneration": "再生",
"Regeneration (text)": "再生（テキスト）",
"Reputation": "知名度",
"Russian": "ロシア語",
"Section": "部位",
"Section / fight. style": "部位 / 戦闘スタイル",
"Self-buff (text)": "自己強化（テキスト）",
"Sheets are fetched one at a time, at most once a second. If the site refuses the request from the browser, open the link with “&mode=json” and paste the JSON into the field below.": "シートは1枚ずつ、1秒に1回以下の頻度で取得します。サイトがブラウザからのリクエストを拒否した場合は、リンクに「&mode=json」を付けて開き、そのJSONを下の欄に貼り付けてください。",
"Shorten": "短縮",
"Some abilities have empty descriptions — text columns may have got mixed up, check the texts": "説明が空の特殊能力があります — テキストの列がずれた可能性があるので、テキストを確認してください",
"Soulscars": "穢れ",
"Special attack": "特殊攻撃",
"Special attack (Evasion)": "特殊攻撃（回避）",
"Speed": "移動速度",
"Strike": "通常攻撃",
"Texts for translation": "翻訳用テキスト",
"Texts for translation (optional)": "翻訳用テキスト（任意）",
"The table row “Acc./Dmg./Eva./Def./HP/MP” was not recognised — fill it in below": "「命中/打撃/回避/防護/HP/MP」の表の行を認識できませんでした — 下で入力してください",
"The target makes a Willpower save.": "対象は精神抵抗力判定を行います。",
"The target makes a Willpower save; on success there is no effect. The status is applied manually.": "対象は精神抵抗力判定を行い、成功すれば効果はありません。状態は手動で適用します。",
"Thunder +N": "雷 +N",
"Undead": "アンデッド",
"Uses spells": "魔法を使う",
"Weak point": "弱点",
"Weak point (text)": "弱点（テキスト）",
"Weak point (threshold)": "弱点値",
"Weakness:": "弱点：",
"Willpower (bonus)": "精神抵抗力（基本値）",
"Wind +N": "風 +N",
"around self": "自身の周囲",
"clear": "解除",
"creates a disabled “Weak point…” effect that turns on when the monster is identified. Detected from the text automatically.": "「弱点…」効果を無効状態で作成し、魔物の識別に成功すると有効になります。テキストから自動で検出します。",
"flat": "固定",
"language: auto": "言語：自動",
"line": "射線",
"magic": "魔法",
"max targets": "最大対象数",
"phys.": "物理",
"range": "射程",
"search by name": "名前で検索",
"section": "部位",
"section (for multi-part monsters)": "部位（複数部位の魔物用）",
"select all": "すべて選択",
"selected": "件選択",
"target(s)": "対象",
"to": "～",
"ytsheet links or sheet IDs (one per line) — monsters": "ゆとシートのリンクまたはシートID（1行に1つ） — 魔物",
"— no roll —": "— ロールなし —",
"— none / text only —": "— なし / テキストのみ —",
"— paste text or load ytsheet JSON sheets": "— テキストを貼り付けるか、ゆとシートのJSONシートを読み込んでください",
"“Unique Skills” block not found": "「特殊能力」ブロックが見つかりません",
"≫ auxiliary": "≫ 補助動作",
"△ preparation": "△ 戦闘準備",
"► main": "► 主動作",
"◯ passive": "◯ 常時",
"🗨 declared": "🗨 宣言",
"class lv": "技能Lv",
"adv. lv": "冒険者Lv",
"the dual attack penalty is removed": "二刀攻撃のペナルティがなくなる",
"(text)": "（テキスト）",
"with any weapon attack": "すべての武器攻撃で",
"in melee": "近接攻撃で",
"when shooting or throwing": "射撃・投擲で",
"with 2H weapons": "2H武器で",
"in dual attacks": "二刀攻撃で",
"against poison and disease": "毒・病気に対して",
"once a day": "1日1回",
"once an hour": "1時間に1回",
" (the second may go to another target)": "（2回目は別の対象でもよい）",
"if the target evaded, another attack with the same weapon at the same target": "回避されたら、同じ武器で同じ対象にもう一度攻撃",
"after a hit, another attack with the same weapon": "命中したら、同じ武器でもう一度攻撃",
"attack instead of evading (manual for now)": "回避の代わりに攻撃（現在は手動）",
"accuracy rolled twice, best kept (manual for now)": "命中力判定を2回行い高い方を採用（現在は手動）",
"attack and spell in one action (manual for now)": "1回の主動作で攻撃と魔法（現在は手動）",
" No more than one declared talent per turn.": " 宣言できる特技は1手番に1つまで。",
" Allows 2 declared talents per turn.": " 1手番に2つまで宣言できる。",
" (on an ally holding hands)": "（手をつないだ味方に）",
" (on own mount)": "（自分の騎獣に）",
"Combat feats": "戦闘特技",
"A talent was already declared this turn.": "この手番にはすでに特技を宣言しています。",
" — automatic success (6-6)": " — 自動成功（6ゾロ）",
" — still an automatic failure": " — 自動失敗のまま",
"You have no character to build the talent onto.": "特技を作成できる自分のキャラクターがいません。",
"Talent constructor": "特技ビルダー",
"Number": "数値",
"Special": "特殊",
"what to show on the sheet": "シートに表示する文",
"Combat feat": "戦闘特技",
"Racial ability": "種族特徴",
"Examples:": "例：",
"How does it work?": "どう働く？",
"Attack form": "攻撃の形",
"what happens when declared or pressed": "宣言またはボタンを押したときに起こること",
"Where does it work?": "どこで働く？",
"Check name (as on the sheet)": "判定名（シートの表記どおり）",
"Works in the dual attack. No need to point at another talent.": "二刀攻撃で働きます。ほかの特技を指定する必要はありません。",
"Shown on the sheet; applied by hand against poison and disease.": "シートに表示されます。毒・病気に対しては手動で適用してください。",
"On whom:": "対象：",
"What does it give?": "何が得られる？",
"another row": "行を追加",
"Racial growth": "種族の成長",
"at adventurer level 6 and 11": "冒険者レベル6と11で",
"More (optional)": "その他（任意）",
"Check — this is how the system reads it": "確認 — システムはこう解釈します",
"Folder: ": "フォルダ：",
"Lasts:": "持続：",
"this attack": "この攻撃",
"1 round (until your turn)": "1ラウンド（自分の手番まで）",
"Turn on": "オンにする",
"Turn off": "オフにする",
"MP cost": "消費MP",
"Limit": "回数制限",
"While on, no": "有効な間は不可",
"spells": "魔法",
"speech": "会話",
"Button on the check card": "判定カードのボタン",
"Up to how many targets": "対象数の上限",
"the second attack may go to another target": "2回目の攻撃は別の対象でもよい",
"Margin at least": "差の最小値",
"May stay empty: the attack form does the work.": "空欄でかまいません。攻撃の形が処理します。",
"Nothing yet.": "まだありません。",
"Risk": "リスク",
"a penalty for 1 round after declaring, even on a miss:": "宣言後1ラウンドのペナルティ（外れても適用）：",
"risk": "リスク",
"At level 6": "6レベルで",
"At level 11": "11レベルで",
"no change": "変化なし",
"add": "追加",
"Requirement (text)": "習得条件（テキスト）",
"Allows 2 declared talents per turn": "1手番に2つまで宣言できる",
"Drag the racial ability onto a character or into the race compendium.": "種族特徴をキャラクターや種族の辞典にドラッグしてください。",
"Spellcasting check": "魔法行使判定",
"Critical value": "C値",
"Remove the dual attack penalty": "二刀攻撃のペナルティをなくす",
"Immune to damage…": "ダメージ無効…",
"Half damage from…": "ダメージ半減…",
"More damage taken from…": "受けるダメージ増加…",
"Check base…": "判定の基準…",
"“After the roll” bonus +N": "「判定後」ボーナス+N",
"Text only (not automated)": "テキストのみ（自動化なし）",
"fire": "炎",
"water/ice": "水・氷",
"wind": "風",
"earth": "土",
"lightning": "雷",
"energy": "純エネルギー",
"silver weapons": "銀の武器",
"the element of origin": "出自の属性",
"plain number": "固定値",
"× class level": "× 技能レベル",
"× ½ class level": "× 技能レベルの½",
"+ magic power": "+ 魔力",
"× adventurer level": "× 冒険者レベル",
"Minor action": "補助動作",
"Major action": "主動作",
"Combat preparation": "戦闘準備",
"No action": "動作不要",
"◯ Always": "◯ 常時",
"🗨 Declared": "🗨 宣言",
"▶ Action": "▶ 動作",
"⇄ Toggle": "⇄ 切り替え",
"☀ Use": "☀ 使用",
"↺ After the roll": "↺ 判定後",
"Normal attack": "通常の攻撃",
"bonuses only": "修正のみ",
"Two attacks": "2回攻撃",
"one with each weapon": "それぞれの武器で1回ずつ",
"Several targets": "複数の対象",
"one accuracy roll, damage to each": "命中力判定は1回、ダメージは対象ごと",
"Another attack after a miss": "外れたらもう一度攻撃",
"if the target evaded": "回避されたとき",
"Another attack after a hit": "命中したらもう一度攻撃",
"with the same weapon": "同じ武器で",
"Attack instead of evading": "回避の代わりに攻撃",
"manual for now": "現在は手動",
"Two rolls, best": "2回振って高い方",
"Attack + spell": "攻撃＋魔法",
"Damage ×2 on a margin": "差があればダメージ2倍",
"Flip both dice (1↔6, 2↔5, 3↔4)": "2つのダイスの出目を裏返す（1↔6、2↔5、3↔4）",
"no limit": "制限なし",
"N times a day": "1日N回",
"N rounds a day": "1日Nラウンド",
"any weapon attack": "すべての武器攻撃",
"melee": "近接攻撃",
"shooting and throwing": "射撃・投擲",
"weapon category…": "武器カテゴリ…",
"2H weapon": "2H武器",
"dual attack": "二刀攻撃",
"always, everything": "常時・すべて",
"always": "常時",
"while on": "有効な間",
"a check…": "判定…",
"self": "自分",
"an ally holding hands": "手をつないだ味方",
"own mount": "自分の騎獣",
"Risky Strike": "捨て身の打撃",
"Declared before the attack: more damage, worse evasion until your next turn.": "攻撃前に宣言：ダメージが増えるが、次の手番まで回避が下がる。",
"Risky Strike II": "捨て身の打撃II",
"Second tier: the first one is hidden automatically, by name.": "第2段階：名前から判断して、第1段階は自動で隠れます。",
"Precise Strike": "精密打撃",
"The simplest declared talent: an accuracy bonus.": "いちばん簡単な宣言特技：命中力ボーナスだけ。",
"Wide Sweep": "大振り",
"Form “several targets” plus a damage penalty row.": "形「複数の対象」＋ダメージペナルティの行。",
"Follow-up": "追い打ち",
"Only the attack form, no rows needed.": "攻撃の形だけで、行は不要。",
"Two Hands": "両の手",
"Gives a “two attacks” button with a penalty.": "ペナルティ付きの「2回攻撃」ボタンを与える。",
"Practiced Combo": "鍛えた連携",
"Place “dual attack”: it improves “Two Hands” without pointing at it.": "場所「二刀攻撃」：「両の手」を指定しなくても強化する。",
"Spellblade": "魔法剣",
"“+ magic power” and a two-row risk.": "「＋魔力」と2行のリスク。",
"Weapon Mastery": "武器の熟練",
"A permanent bonus for one weapon category.": "1つの武器カテゴリへの常時ボーナス。",
"Tough Hide": "頑丈な皮膚",
"The simplest racial ability: always +N.": "いちばん簡単な種族特徴：常に+N。",
"Second Form": "第二の姿",
"A toggle: bonuses only while on, plus a restriction.": "切り替え：有効な間だけのボーナスと制限。",
"Flight": "飛行",
"A toggle with a daily budget of rounds.": "1日のラウンド数に上限がある切り替え。",
"Luck": "幸運",
"The button appears on the check card.": "ボタンは判定カードに表示されます。",
"Exchange": "力の交換",
"A “use” button with a limit; the effect is text.": "回数制限付きの「使用」ボタン。効果はテキスト。",
"Elemental Ward": "属性への守り",
"Special rows by damage type.": "ダメージの種類ごとの特殊な行。",
"Weakness": "弱点",
"A minus can be a racial ability too.": "マイナスも種族特徴になりえる。",
"Poison Ward": "毒への耐性",
"Place “against poison and disease” (bonus applied by hand).": "場所「毒・病気に対して」（ボーナスは手動で適用）。",
"Works by itself while the talent is there.": "特技を持っている間、自動で働く。",
"A checkbox before the accuracy roll.": "命中力判定の前のチェックボックス。",
"Its own button on the sheet.": "シートに専用ボタン。",
"Works by itself.": "自動で働く。",
"A form: its bonuses while it is on.": "変身：有効な間だけのボーナス。",
"A sheet button with a limit.": "回数制限付きのシートのボタン。",
"A button on the roll card.": "判定カードのボタン。",
"Dual attack: needs [Dual Wielding] and two equipped 1H weapons with Min STR 20 or less.": "二刀攻撃：二刀流の特技と、必要筋力20以下の1H武器を2つ装備している必要があります。",
"Dual attack: two targets at most.": "二刀攻撃：対象は2体まで。",
"Dual attack: pick one target (both attacks go to the same target).": "二刀攻撃：対象を1体選んでください（2回とも同じ対象を攻撃します）。",
"Each hit: its own evasion and Defense.": "命中ごとに回避と防護点を個別に処理。",
"Apply damage (all hits)": "ダメージ適用（全命中）",
"Dual attack": "二刀攻撃",
"The target has not rolled evasion against every attack yet.": "対象はまだすべての攻撃に対して回避を振っていません。",
"No hits": "命中なし",
"another attack": "追加攻撃",
"Another attack": "もう一度攻撃",
", ": "、",
".": "。",
"turned on with a minor action": "補助動作でオンにできる",
"spend HP, gain as much MP": "HPを消費し、同じだけMPを得る",
"the same for an ally holding hands": "手をつないだ味方にも同じ効果",
"Per shard: +5 max HP and +1 max MP. Fortitude and Willpower: +1 (1–5), +2 (6–10), +3 (11–15), +4 (16+). Once defeated, the shards are “always” loot.": "かけら1個につき最大HP+5、最大MP+1。生命抵抗力と精神抵抗力：+1（1〜5個）、+2（6〜10個）、+3（11〜15個）、+4（16個以上）。倒されると、かけらは「自動」の戦利品になります。",
"Sword Shards": "剣のかけら",
"Multi-section monster: spread the HP and MP as you like.": "複数部位の魔物：HPとMPを自由に配分してください。",
"Apply": "適用",
"Shards": "かけら",
"silver": "銀",
"Silvered Weapon.": "銀製。",
"Magic Weapon +1: Accuracy +1, Extra Damage +1.": "魔法の武器+1：命中+1、追加ダメージ+1。",
"Magic Armor +1: Defense +1.": "魔法の鎧+1：防護点+1。",
"Bulletproofed": "防弾",
"Bulletproof Armor: Gun and Magic Arrow/Quarrel damage is reduced by the armor's Defense, 6 times (repair at the Institute Of Magitechnology).": "防弾加工：銃弾と魔法の矢のダメージを鎧の防護点で軽減、6回まで（修理は魔動機術研究所）。",
"when carried": "所持中",
"when equipped": "装備中",
"[manual]": "［手動］",
"Upgrades": "強化",
"You don't own this item.": "このアイテムの所有者ではありません。",
"not set": "未決定",
"— none —": "— なし —",
"Abyss Curse…": "呪い…",
"Roll 2d on the Abyss Curse Table": "アビスカース表を2dで振る",
"Workshop": "工房",
"rank": "ランク",
"Custom-Forged: Minimum Strength": "オーダーメイド：必要筋力",
"not for guns": "ガンは不可",
"Silvered Weapon": "銀製",
"Magic Weapon +1: Accuracy and Extra Damage +1": "魔法の武器+1：命中と追加ダメージ+1",
"Fairy Weapon": "妖精の武器",
"per type": "属性ごと",
"Magic Armor +1: Defense +1": "魔法の鎧+1：防護点+1",
"Bulletproof Armor": "防弾加工",
"Shields: Abyss Enhancement only.": "盾：アビス強化のみ。",
"Abyss Enhancement": "アビス強化",
"each; Abyss Shards 3, the second one 6": "各回；シャード3個、2回目は6個",
"Price, name and fields change; «Apply» with everything empty removes it all.": "価格・名前・数値が変わります。全て空で「適用」すると全解除。",
"The two Abyss Enhancements must differ.": "2つのアビス強化は異なる必要があります。",
"Every Abyss Enhancement needs an Abyss Curse.": "各アビス強化には呪いが必要です。",
"Same curse twice — reroll it.": "同じ呪いが2つ — 振り直してください。",
"the remaining combat feats": "残りの戦闘特技",
"languages": "言語",
"buying equipment": "装備の購入",
"class spells": "技能の魔法",
"abyss shards": "アビスシャード",
"Creation": "作成",
"Normal (levels 1–2, 1200 G)": "通常（レベル1～2、1200G）",
"exp": "経験点",
"Now": "現在",
"Growth": "成長",
"Skip": "スキップ",
"major (A)": "メイン（A）",
"minor (B)": "サブ（B）",
"Exp table": "経験点表",
"can't see the target −4": "対象が見えない −4",
"can't see the attacker −4": "攻撃者が見えない −4",
"Barbarous": "蛮族",
"Water/ice": "水・氷",
"Lightning": "雷",
"Slashing": "斬撃",
"Bludgeoning": "打撃",
"Poison": "毒",
"Disease": "病気",
"Curse": "呪い",
"Psychic": "精神効果",
"Accuracy +1": "命中+1",
"Extra Damage +1": "追加ダメージ+1",
"Minimum Strength −2": "必要筋力−2",
"Critical Threshold −1 (minimum 8)": "クリティカル値−1（最低8）",
"Extra Damage +2 to a Specific Category of Monsters": "特定分類へのダメージ+2",
"Extra Damage +1 by a Specific Type": "特定属性のダメージ+1",
"Spellcasting check Success Value +1 (magical implement: Truespeech / Spiritualism)": "行使判定+1（発動体として：真語・操霊魔法）",
"Spell Damage +1 (magical implement, «Duration: Instant»)": "魔法ダメージ+1（発動体として、一瞬の魔法）",
"Spell Restoration +1 («Duration: Instant»)": "回復魔法+1点（一瞬の魔法）",
"Defense +1": "防護点+1",
"Magic Damage −1": "魔法ダメージ−1",
"Defense +2 against a Specific Category of Monsters": "特定分類に対し防護点+2",
"Physical and Magic Damage of a Specific Type −2": "特定属性のダメージ−2",
"Check Package Enhancement (+1)": "パッケージ判定+1",
"Evasion +1": "回避+1",
"Of Self-Harm": "自傷",
"A critical hit with it: −5 HP to yourself.": "この武器でクリティカル：自分のHP−5。",
"Of Lamentation": "嘆き",
"Foes near or long tension: only «Range: Caster» and «Range: Touch» targets.": "敵が近い・緊張下：対象は「術者」「接触」のみ。",
"Of Kindness": "優しさ",
"Against a hostile target whose HP is reduced: −2 to Accuracy and Spellcasting checks.": "傷ついた敵に：命中と行使判定−2。",
"Of Discrimination": "差別",
"Damage dealt to a monster classification −2 (Classification Table roll).": "特定分類へのダメージ−2（分類表で決定）。",
"Vulnerable": "脆弱",
"Magic damage taken +1.": "受ける魔法ダメージ+1。",
"Reckless": "無謀",
"Defense −2.": "防護点−2。",
"Heavy": "重さ",
"The item's Minimum Strength +2.": "この品の必要筋力+2。",
"Difficult": "難しさ",
"On power tables, ③–④ count as 0.": "威力表の出目3～4は0扱い。",
"Wimp": "意志薄弱",
"Willpower −1.": "精神抵抗−1。",
"Weak": "虚弱",
"Fortitude −1.": "生命抵抗−1。",
"Sensitive": "敏感",
"Damage of a type taken +2 (Type Determination Table roll).": "特定属性のダメージ+2（属性表で決定）。",
"Hilarious": "陽気",
"Failed Willpower check: −1 to action checks until the end of the next turn, stacks.": "精神抵抗失敗：次の手番終了まで行為判定−1、累積。",
"Stuttering": "吃音",
"Spellcasting checks −1.": "行使判定−1。",
"Proxy": "代弁者",
"Speaks only Arcana; no Fairy Magic or Magitech.": "魔法文明語しか話せず、妖精魔法・魔動機術は使えない。",
"No Charities": "無慈悲",
"Accepted «Resistance: Optional» in combat: Fortitude and Willpower −2 until your next turn.": "戦闘中「抵抗：任意」を受け入れた：手番まで生命・精神抵抗−2。",
"Near Death": "死の淵",
"Death Check: penalty = Adventurer Level.": "生死判定：冒険者レベル分のペナルティ。",
"Stylish": "派手好み",
"10% of any income goes to decorating the item.": "収入の10%をこの品の装飾に使う。",
"Mana Draining": "魔力吸収",
"MP cost +1 for spells and techniques.": "魔法・技の消費MP+1。",
"Slow": "鈍足",
"Movement halved (round up).": "移動力半減（切り上げ）。",
"Undefined": "不確か",
"Turn start, 1 on 1d: no «Targeting» or the combat feats that require it.": "手番開始時1dで1：《ターゲッティング》とそれ前提の特技なし。",
"Of Confusion": "混乱",
"Turn start, 1 on 1d: «Touch» target is random in the same position.": "手番開始時1dで1：「接触」の対象は同じ位置からランダム。",
"Foot Tangling": "足もつれ",
"Turn start, 1 on 1d: falls prone, can't stand this turn.": "手番開始時1dで1：転倒、その手番は起き上がれない。",
"Slippery": "滑り",
"Turn start, 1 on 1d: drops everything held.": "手番開始時1dで1：手に持つ物を全て落とす。",
"Stinking": "悪臭",
"Hide checks −2, Adventurer Rank one lower.": "隠密−2、冒険者ランク1つ下扱い。",
"Disgusting": "醜悪",
"Sells for ¼ price, Adventurer Rank one lower.": "売値は¼、冒険者ランク1つ下扱い。",
"Buzzing": "羽音",
"Hide and Danger Sense checks −4.": "隠密と危険感知−4。",
"Soggy": "湿気",
"Extra Damage −1 (weapon) or Defense −1 (armor, shield); Fortitude and Willpower −4 against disease.": "追加ダメージ−1（武器）または防護点−1（鎧・盾）；病気に対する生命・精神抵抗−4。",
"Of Old Wounds": "古傷",
"Any HP recovery −1.": "HP回復量−1。",
"Dazzling": "眩しさ",
"Always −1 for poor visibility.": "常に視界不良−1。",
"Fameless": "無名",
"Once a day an automatic success doesn't count — reroll 2d.": "1日1回、自動成功が無効 — 2dを振り直す。",
"Honest": "正直",
"−4 against Detect checks on lies.": "嘘を見抜く判定に対し−4。",
"Motion Sick": "乗り物酔い",
"Travelled not on foot over 10 minutes: −1 to action checks for 1 hour.": "10分以上運ばれた：1時間行為判定−1。",
"Hater of Nature": "自然嫌い",
"In a natural environment action checks −1.": "自然環境で行為判定−1。",
"Can’t Wait": "浪費癖",
"Each day — Adventurer Level ×10 G on hobbies, or max HP and MP −Adventurer Level.": "毎日レベル×10Gを趣味に、払えなければ最大HP・MP−レベル。",
"Clinging": "執着",
"While this weapon is not equipped: Accuracy and Spellcasting −4; while this armor (shield) is not worn: Evasion −4.": "この武器を装備していない間：命中力判定と行使判定−4。この鎧（盾）を装備していない間：回避力判定−4。",
"Gullible": "お人好し",
"Always skips Combat Preparation.": "常に戦闘準備を行えない。",
"Get": "取得",
"No disgrace.": "不名誉なし。",
"Mark of dishonour": "不名誉称号",
"prevented by the rank": "ランクで防止",
"Disgrace": "不名誉点",
"Ranks are bought with reputation, several at once is fine. «Free» — famous items up to this reputation cost need no reputation. Loan — the Guild's advance limit.": "ランクは名誉点で取得、一度に複数可。「無料」— この名誉点以下の名誉アイテムは名誉点不要。前借り — ギルドの貸付上限。",
"Reputation (total)": "名誉点（累計）",
"Free": "無料",
"Loan": "前借り",
"Disgrace +N": "不名誉点+N",
"Pay off with reputation": "名誉点で相殺",
"Lower the rank": "ランク降格",
"Not enough reputation.": "名誉点が足りません。",
"from the stone": "魔晶石から",
"points in a full stone": "魔晶石の点数",
"Mako Stone": "魔晶石",
"Pay": "支払う",
"No stone": "使わない",
"0 (breaks)": "0（砕ける）",
"Disgrace: Guild surcharge": "不名誉：ギルドの割増",
"None": "なし",
"Dagger": "ダガー",
"Rapier": "レイピア",
"Broadsword": "ブロードソード",
"Greatsword": "グレートソード",
"Flamberge": "フランベルジュ",
"Guardian": "センチネル",
"Hyperion": "ハイペリオン",
"Sword of Creation": "始まりの剣",
"Sword of Creation★": "始まりの剣★",
"Sword of Creation★2": "始まりの剣★2",
"Sword of Creation★3": "始まりの剣★3",
"Goblin Nuisance": "ゴブリン級の厄介者",
"item purchase and service prices +10%": "物品・サービス価格+10%",
"Bolg Hazard": "ボルグ級の危険人物",
"prices +20%": "価格+20%",
"Ogre Outcast": "オーガ級のはぐれ者",
"prices +50%": "価格+50%",
"Troll Extreme Evil": "トロール級の極悪人",
"prices ×2": "価格×2",
"Drake Enemy of Humanoids": "ドレイク級の人族の敵",
"prices ×5": "価格×5",
"Barbarous King World Breaker": "蛮王級の世界の破壊者",
"Guild services suspended": "ギルドの利用停止",
"lv": "Lv",
"Golems": "ゴーレム",
"Familiar (Truespeech)": "ファミリア（真語魔法）",
"Another creature (drag it)": "その他のクリーチャー（ドラッグ）",
"Creature: found by name in the world and the compendiums. You can drop your own here.": "クリーチャー：ワールドとコンペンディウムから名前で検索。ここに直接ドロップも可。",
"MP already paid (the spell was cast separately)": "MP支払い済み（魔法は別途行使）",
"Take the normal material from the inventory": "通常素材を所持品から消費",
"One familiar per master. No HP of its own: damage goes to the master. Casting takes 1 hour.": "主人1人につきファミリア1体。HPを持たず、ダメージは主人へ。行使に1時間。",
"Drop a creature. No MP is spent.": "クリーチャーをドロップ。MPは消費しない。",
"Dismiss all": "全て解除",
"not found — drop one": "見つからない — ドロップしてください",
"Creature not found: drop it into the window.": "クリーチャーが見つかりません：ウィンドウにドロップしてください。",
"Put the creator's token on the scene.": "作成者のトークンをシーンに置いてください。",
"creates": "が作成",
"Creations": "作成物",
"Dismiss": "解除",
"Familiar MP": "ファミリアのMP",
"Own MP only": "自分のMPのみ",
"Oak Golem": "オークゴーレム",
"Enchanted Oak Branch": "魔化した樫の枝",
"Oak Hound": "オークハウンド",
"Straw Bird": "ストローバード",
"Enchanted Straw Bundle": "魔化した藁束",
"Loam Puppet": "ロームパペット",
"Enchanted Clay": "魔化した粘土",
"Bone Animal": "ボーンアニマル",
"Enchanted Animal Bones": "魔化した獣骨",
"Leather Fish": "レザーフィッシュ",
"Enchanted Leather": "魔化した革",
"Flabby Golem": "フレッシュゴーレム",
"Enchanted Flesh": "魔化した肉",
"Stone Servant": "ストーンサーヴァント",
"Enchanted Stone": "魔化した石",
"Brasswing": "ブラスウイング",
"Enchanted Brass": "魔化した真鍮",
"Scale Flipper": "スケイルフリッパー",
"Enchanted Rock Slag": "魔化した鉱滓",
"Rock Golem": "ロックゴーレム",
"Enchanted Rock": "魔化した岩",
"Bronze Golem": "ブロンズゴーレム",
"Enchanted Bronze": "魔化した青銅",
"Rutile Raptor": "ルチルラプター",
"Enchanted Golden Redstone": "魔化した金紅石",
"Iron Golem": "アイアンゴーレム",
"Enchanted Iron": "魔化した鉄",
"Granite Shell": "グラナイトシェル",
"Enchanted Granite": "魔化した花崗岩",
"Platinum Dragon": "プラチナドラゴン",
"Enchanted Platinum": "魔化した白金",
"Skeleton": "スケルトン",
"Skeletonized Corpse": "白骨死体",
"Zombie": "ゾンビ",
"Corpse": "死体",
"Dry Corpse": "干からびた死体",
"Skeleton Archer": "スケルトンアーチャー",
"Skeleton Soldier": "スケルトンソルジャー",
"Skeleton Guardian": "スケルトンガーディアン",
"Magical Bones": "魔法の骨",
"Frog": "カエル",
"Spider": "クモ",
"Bird": "鳥",
"Cat": "猫",
"Snake": "ヘビ",
"Familiar": "ファミリア",
"Familiar II": "ファミリアII",
"The creature is found by name in the world and the compendiums. Not there? Make it first in the «Monster generator» (or load it from ytsheet) and drop it here.": "クリーチャーはワールドとコンペンディウムから名前で検索されます。無ければ先に「モンスタージェネレーター」で作成（またはゆとシートから読み込み）し、ここにドロップしてください。",
"The same item twice has no effect.": "同じアイテムを2つ使っても効果はありません。",
"Enhancement items": "強化パーツ",
"No «Golem Enhancing Items» compendium: build the starter compendiums.": "「ゴーレム強化パーツ」コンペンディウムがありません：スターターコンペンディウムを作成してください。",
"A copy of the monster is made with the chosen items. The template is not changed.": "選んだパーツ付きのモンスターのコピーを作成します。元データは変わりません。",
"Size": "サイズ",
"Maximum": "最大",
"Diffuser element": "ディフューザーの属性",
"Make a copy": "コピーを作成",
"No fitting items in the inventory.": "所持品に合うパーツがありません。",
"Enhance golem": "ゴーレム強化",
"Classes, skill checks, racial abilities, Enhancer techniques and Golem Enhancing Items — names and numbers only, no rulebook text. The character wizard and the sheets use them. The guide “SW25: how to make items and abilities” is built with them.": "技能、判定、種族特徴、練技、ゴーレム強化パーツ — 名前と数値のみで、ルールブックの文章は含みません。キャラクター作成とシートが使用します。ガイド「SW25: アイテムと能力の作り方」も一緒に作成されます。",
"small": "小",
"medium": "中",
"large": "大",
"New": "新規",
"new compendium": "新しいコンペンディウム",
"SW25: new starter data": "SW25：スターターデータの追加",
"This version of the system has entries the compendiums of this world do not have:": "このバージョンのシステムには、このワールドのコンペンディウムにない項目があります：",
"«Add what's new» — the new entries go separately, the old compendiums are not touched. «Rebuild all» — the starter compendiums are made again, edits inside them are lost.": "「新規分を追加」— 新しい項目は別に追加され、既存のコンペンディウムは変更されません。「すべて再作成」— スターターコンペンディウムを作り直します。中の編集は失われます。",
"Add what's new": "新規分を追加",
"Rebuild all": "すべて再作成",
"Later": "後で",
"The «SW25: …» starter compendiums are built by the system and <b>rebuilt on updates</b>: their data may change in future versions.": "「SW25: …」スターターコンペンディウムはシステムが作成し、<b>更新時に作り直されます</b>：今後のバージョンで内容が変わる場合があります。",
"Please don't edit them — the edits would be lost. Need your own version of an item — drag it into the world or your own compendium and edit it there.": "編集しないでください — 編集内容は失われます。独自のアイテムが必要な場合は、ワールドまたはご自身のコンペンディウムにドラッグして、そちらで編集してください。",
"Got it": "了解",
"Disruptor type": "ディスラプターの属性",
"Enhancing Items": "強化パーツ",
"Water/Ice": "水・氷",
"Broad Sword": "ブロードソード",
"Great Sword": "グレートソード",
"Sentinel": "センチネル",
"Sword of Genesis": "始まりの剣",
"Sword of Genesis★": "始まりの剣★",
"Sword of Genesis★2": "始まりの剣★2",
"Sword of Genesis★3": "始まりの剣★3",
"Silvered": "銀",
"Servant": "命令を聞く",
"Instructed": "命令による",
"Various": "さまざま",
"Style": "攻撃方法",
"(no name)": "（名前なし）",
"Reputation / Weak point": "知名度／弱点値",
"Unique skills": "特殊能力",
"Book golem:": "ルールブックのゴーレム：",
"— golem preset —": "— ゴーレムのひな形 —",
"Conjurer": "コンジャラー",
"Book name (the «Creations» window finds it by that), level, type Construct, common golem data and skills. Enter the numbers or paste the book text above.": "ルールブックの名前（「作成物」ウィンドウはこの名前で探します）、レベル、分類「魔法生物」、ゴーレム共通のデータと特殊能力。数値は自分で入力するか、上にルールブックの文章を貼り付けてください。",
"Poison Immunity": "毒無効",
"Disease Immunity": "病気無効",
"Psychic Immunity": "精神効果無効",
"Can be Detected": "魔法で感知される",
"Artificial": "人造",
"Knowledge = Conjurer class": "知識＝コンジャラー技能",
"No damage or effects of poison.": "毒のダメージと効果を受けない。",
"No damage or effects of disease.": "病気のダメージと効果を受けない。",
"No psychic damage or effects.": "精神効果のダメージと効果を受けない。",
"Found by magic-detecting spells.": "魔法を感知する魔法で見つかる。",
"Healed only by what restores constructs.": "魔法生物のHPを回復する手段でのみ回復する。",
"A Conjurer knows it automatically; the weak point needs a Sage roll.": "コンジャラーは自動で知る。弱点はセージの判定が必要。",
" — automatic failure (1-1)": " — 自動的失敗（1ゾロ）",
"Disgrace raises the Guild's prices": "不名誉点はギルドの価格を上げる",
"Buying at the Guild (disgrace surcharge)": "ギルドで購入（不名誉による割増）",
"To pay": "支払額",
"You pay only for what is added; nothing is refunded for what is removed.": "支払うのは追加分のみ。外した分の払い戻しはありません。",
"Upgrade": "強化する",
"the Guild refuses (disgrace)": "ギルドが応じない（不名誉）",
"The smith failed — the money was refunded.": "鍛冶屋が失敗しました。代金は返金されました。",
"Smithy": "鍛冶屋",
"Paid": "支払い",
"Upgrading at the Guild (disgrace surcharge)": "ギルドで強化（不名誉による割増）",
"Drag a weapon or armor here from your sheet": "キャラクターシートから武器か防具をここにドラッグ",
"The smith only takes weapons and armor.": "鍛冶屋は武器と防具だけを扱います。",
"Drag the item from a character sheet (the smith upgrades an owner's things).": "キャラクターシートからアイテムをドラッグしてください（鍛冶屋は持ち主の品を強化します）。",
"No golem enhancing items: make them in the item constructor («Golem part»).": "ゴーレム強化パーツがありません。アイテムビルダー（「ゴーレムパーツ」）で作成してください。",
"Golem parts": "ゴーレムパーツ",
"Tick what the upgrade is for (weapon, armor, shield).": "強化の対象（武器・鎧・盾）にチェックを入れてください。",
"Abyss": "アビス",
"Abyss curses": "アビスカース",
"Item field changes (± to the numbers)": "アイテムの数値の変更（±）",
"Golem ability": "ゴーレムの能力",
"empty — same as the name": "空欄なら名前と同じ",
"Ability kind": "能力の種類",
"HP +": "HP＋",
"Accuracy +": "命中＋",
"Magic damage −": "魔法ダメージ−",
"Movement +": "移動力＋",
"Needs the item (name)": "前提アイテム（名前）",
"replaces its ability": "その能力を置き換える",
"no weak point": "弱点なし",
"element on creation": "作成時に属性を選ぶ",
"Applies to": "対象",
"Tag in the name": "名前に付ける印",
"e.g. Silvered": "例：銀",
"Abyss enhancement (needs a curse)": "アビス強化（呪いが必要）",
"Number (2d: 11–66)": "番号（2d：11〜66）",
"When it works": "効果がある時",
"Text (what it does)": "テキスト（効果）",
"Bonuses and penalties to the character while the item is equipped (a curse: per «When it works»).": "アイテム装備中のキャラクターへの修正（呪いは「効果がある時」に従う）。",
"Golem parts use the fields above; bonus rows are not used.": "ゴーレムパーツは上の欄の数値を使い、修正の行は使いません。",
"Creation (golem, undead, familiar)": "作成物（ゴーレム・アンデッド・使い魔）",
"A template for the «Creations» window on a character sheet: numbers from your rulebook.": "キャラクターシートの「作成物」ウィンドウ用のひな形。数値はお手元のルールブックから。",
"Classes, skill checks, racial abilities and Enhancer techniques — names and numbers only, no rulebook text. The character wizard and the sheets use them. The guide “SW25: how to make items and abilities” is built with them.": "技能・判定・種族特徴・練技 — 名前と数値のみで、ルールブックの文章は含みません。キャラクター作成ウィザードとシートが使います。ガイド「SW25：アイテムと能力の作り方」も一緒に作成されます。",
"No creation templates. The GM makes them in the «Monster generator» (section «Creation») or marks a monster with the «Creation» button on its sheet.": "作成物のひな形がありません。GMが「モンスタージェネレーター」（「作成物」欄）で作るか、モンスターシートの「作成物」ボタンで指定します。",
"Familiars": "使い魔",
", consumed": "、消費",
"One familiar per master. No HP of its own: damage goes to the master.": "使い魔は主人1人に1体。自分のHPはなく、ダメージは主人が受けます。",
"Conjurer level": "コンジャラーのレベル",
"Material": "素材",
"or": "または",
"material is consumed": "素材を消費する",
"Enhancing items, max": "強化パーツの上限",
"Item size": "パーツのサイズ",
"A template for the «Creations» window on a character sheet. The numbers come from your rulebook.": "キャラクターシートの「作成物」ウィンドウ用のひな形です。数値はお手元のルールブックから。",
"Accuracy and Extra Damage": "命中と追加ダメージ",
"Magic enhancement": "魔法の強化",
"no price set": "価格未設定",
"No upgrade items: the GM makes them in the item constructor («Upgrade»).": "強化アイテムがありません。GMがアイテムビルダー（「強化」）で作成します。",
"Up to two different ones. Each has a curse: roll 2d or pick it.": "異なるものを2つまで。それぞれ呪いが付きます：2dを振るか選択。",
"No Abyss enhancements: make them in the item constructor.": "アビス強化がありません。アイテムビルダーで作成してください。",
"no price set by the GM": "GMが価格を設定していません",
"No curses: make them in the item constructor.": "呪いがありません。アイテムビルダーで作成してください。",
"The GM has not set the price of this upgrade (system settings: «Smithy»).": "GMがこの強化の価格を設定していません（システム設定：「鍛冶屋」）。",
"The item stays with the character; the smith makes it +1 or +2 for the price the GM has set.": "アイテムはキャラクターの手元に残り、鍛冶屋がGMの設定した価格で+1か+2にします。",
"The price from your rulebook. 0 — the smith doesn't do it.": "お手元のルールブックの価格。0なら鍛冶屋は扱いません。",
"Smithy: weapon +1, G": "鍛冶屋：武器+1、G",
"Smithy: weapon +2, G": "鍛冶屋：武器+2、G",
"Smithy: armor and shield +1, G": "鍛冶屋：鎧・盾+1、G",
"Smithy: armor and shield +2, G": "鍛冶屋：鎧・盾+2、G",
"Abyss curse": "アビスカース",
"Golem part": "ゴーレムパーツ",
"— not a creation —": "— 作成物ではない —",
"Golem": "ゴーレム",
"► main action": "► 主動作",
"△ setup": "△ 戦闘準備",
"while equipped": "装備中",
"while carried (even in a bag)": "所持中（袋の中でも）",
"while NOT in use": "装備していない間",
"Extra damage": "追加ダメージ",
"weapon": "武器",
"armor": "鎧",
"shield": "盾",
"Up to two different ones, each paid separately. The curse is rolled on 2d.": "異なるものを2つまで、それぞれ別に支払います。アビスカースは2dで決定します。",
"What the item already has stays; you pay only for what is new.": "すでに施されている加工はそのまま残り、新しく加える分だけ支払います。",
"The item stays with the character. The smith makes +1 / +2 for the GM's price and any upgrade or Abyss enhancement that has a price.": "アイテムはキャラクターの手元に残ります。鍛冶屋はGMが決めた価格で+1/+2を、価格のある加工やアビス強化も施します。",
"only when buying (the smithy won't add it to an owned item)": "購入時のみ（所持品には鍛冶屋で追加できない）",
"A shot without a loaded bullet deals no damage (cast a bullet spell first).": "弾丸を込めていない射撃はダメージを与えません（先に弾丸の魔法を使ってください）。",
"How is it cast?": "どの動作で行使しますか？",
"Minor Action (no check)": "補助動作（判定なし）",
"Major Action (with a check)": "主動作（判定あり）",
"Minor Action: no check, success value 0.": "補助動作：行使判定なし、達成値0。",
"Bullet loaded: its damage or effect comes with the next shot that hits.": "弾丸を装填：次に命中した射撃でダメージや効果が発生します。",
"not for shields": "盾には不可",
"the item is already magic": "すでに魔法の品",
"Abyss Shards": "アビスシャード",
"Bullet (loads the next gun shot)": "弾丸（次の銃撃に装填）",
"Bullet": "弾丸",
"Power roll result": "威力表の出目",
"Custom forging": "オーダーメイド",
"Min. Strength and Power": "必要筋力と威力",
"Shot protection": "防弾",
"Repair": "修理",
"Left": "残り",
"Armor: shot protection, uses": "防具：防弾の回数",
"Repair per use, G": "1回の修理費、G",
"Side initiative is off": "陣営ごとの先制はオフです",
"Side initiative not rolled yet": "先制判定はまだ行われていません",
"The party acts first": "PC側が先攻",
"The enemies act first": "敵側が先攻",
"Roll side initiative": "先制判定を行う",
"Re-roll": "振り直す",
"Nobody in the combat: add tokens to the tracker.": "戦闘に参加者がいません。トークンをトラッカーに追加してください。",
"Side initiative": "陣営ごとの先制",
"Re-roll side initiative? It is rolled once per combat — re-roll only if the combatants changed.": "先制判定を振り直しますか？ 先制は戦闘ごとに1回だけです。参加者が変わった場合のみ振り直してください。",
"Clear targets after applying damage and effects": "ダメージや効果の適用後にターゲットを解除する",
"Off: the target stays selected after a hit, keep attacking. On: targets are cleared, as before.": "オフ：攻撃後もターゲットが選択されたまま、続けて攻撃できます。オン：従来どおりターゲットを解除します。",
"The item of this card no longer exists.": "このカードのアイテムはもう存在しません。",
"This gun has no «Max magazine» set (weapon sheet).": "この銃には「最大装弾数」が設定されていません（武器シート）。",
"No bullets in the inventory (gun ammunition).": "所持品に弾丸がありません（銃用の弾薬）。",
"Load": "装填",
"Reload (major action)": "リロード（主動作）",
"In the magazine": "弾倉",
"No bullets in the magazine. Reload now (a major action)? Shoot with the next action.": "弾倉に弾丸がありません。今リロードしますか（主動作）？射撃は次の行動で。",
"The choice is remembered; change it on the weapon sheet.": "選択は記憶されます。変更は武器シートで。",
"Shoot": "射撃",
"in the magazine": "弾倉",
"recovered": "回収",
"recovered, +1": "回収、+1",
"Max magazine": "最大装弾数",
"Loaded": "装填済み",
"Reload": "リロード",
"Ammunition is chosen once the weapon is on a character.": "矢弾は武器がキャラクターの所持品にあるときに選べます。",
"Ammunition": "矢弾",
"— ask —": "— 毎回聞く —",
"Shooting": "射撃",
"Tick which weapons the ammunition is for.": "どの武器用の矢弾かチェックしてください。",
"Gun: max magazine": "銃：最大装弾数",
"For which weapons": "対応する武器",
"Damage ±": "ダメージ ±",
"Power ±": "威力 ±",
"Crit ±": "クリティカル値 ±",
"After the shot": "射撃後",
"magic damage (shot protection reduces it)": "魔法ダメージ（防弾加工で軽減される）",
"silvered": "銀製",
"For a gun the bullet is only loaded into the magazine; the gun's damage comes from the bullet spell.": "銃の弾丸は弾倉に装填するだけです。銃のダメージは弾丸の魔法によります。",
"Ammunition uses the fields above; bonus rows are not used.": "矢弾は上の欄の数値を使います。ボーナス行は使いません。",
"The gun's magazine is empty: reload first (gun sheet).": "銃の弾倉が空です。先にリロードしてください（銃のシート）。",
"spent": "消費",
"always recovered": "常に回収",
"recovered on a miss": "外れたら回収",
"lost only on a critical hit": "クリティカルで命中したときだけ失う",
"bow": "弓",
"crossbow": "クロスボウ",
"gun": "銃",
"Click: for the next attack, right click: pin.": "クリック：次の攻撃に。右クリック：固定。",
"Talents": "特技",
"Form": "形式",
"Magazine": "弾倉",
"Talent dialog before every attack": "攻撃のたびに特技ダイアログを出す",
"Off: talents are declared with the buttons under the weapon on the sheet, the dialog opens with Shift+click. On: the dialog before every attack, as before.": "オフ：特技はシートの武器の下のボタンで宣言し、ダイアログはShift+クリックで開きます。オン：従来どおり攻撃のたびにダイアログを出します。",
"The character has no spells.": "このキャラクターは魔法を持っていません。",
"MP is paid now. The spell goes off at the target of the next melee attack with this weapon.": "MPは今消費します。この武器での次の近接攻撃の対象に、魔法が発動します。",
"Put on": "武器に込める",
"counter": "カウンター",
"attack": "攻撃",
"Counter succeeded: the attack is cancelled": "カウンター成功：攻撃は無効になります",
"Counter failed: the attack hits, damage with a roll of 12": "カウンター失敗：攻撃は命中し、ダメージの出目は12として扱います",
"Monsters evade": "魔物が回避",
"when attacked in melee, your own attack with an equipped weapon instead of evading; once per round": "近接攻撃を受けたとき、回避の代わりに装備中の武器で攻撃する（1ラウンドに1回）",
"accuracy rolled twice, best kept; two shots are spent": "命中力判定を2回行い、良い方を採用（矢弾を2つ消費）",
"the spell is put on the weapon (MP now) and goes off at the same target with the next melee attack": "魔法を武器に込め（MPはその場で消費）、次の近接攻撃と同じ対象に発動する",
"the target's Defense counts as half, critical threshold +1": "対象の防護点を半分として扱う。クリティカル値+1",
"the target's Defense is half, 0 on a critical; critical threshold +1": "対象の防護点を半分、クリティカル時は0として扱う。クリティカル値+1",
"the target's Defense is half, 0 on a critical; critical immunity does not apply": "対象の防護点を半分、クリティカル時は0として扱う。クリティカル無効は効かない",
"Goes off with the next attack. Click: remove (MP is not refunded).": "次の攻撃で発動します。クリックで解除（MPは戻りません）。",
"Spell on the weapon": "武器に魔法を込める",
"Tier": "段階",
"Second roll (dropped)": "2回目の判定（不採用）",
"mod": "修正",
"Modifier for this roll only (then back to 0)": "この判定だけの修正値（判定後に0に戻ります）",
"a button on the enemy's attack card": "敵の攻撃カードにボタン",
"accuracy twice, two shots": "命中力判定2回、矢弾2つ",
"goes off with the next attack": "次の攻撃で発動",
"accuracy beats evasion by N": "命中が回避をN上回る",
"Armor piercing": "鎧貫き",
"target's Defense halved": "対象の防護点が半分",
"Smithy setup (GM)": "鍛冶屋の設定（GM）",
"Prices from your rulebook, by the item's rank (SS counts as S). Empty or 0 means the smith doesn't do it.": "ルールブックの価格を、アイテムのランク別に入力します（SSはSと同じ）。空欄か0なら、鍛冶屋はその加工を行いません。",
"What the smith can do": "鍛冶屋ができること",
"The smith uses priced upgrades from the world and compendiums. Make new ones in the item constructor.": "鍛冶屋は、ワールドとコンペンディウムにある価格つきの加工を使います。新しい加工はアイテムビルダーで作成してください。",
"New upgrade": "新しい加工",
"New curse": "新しいカース",
"Smithy setup": "鍛冶屋の設定",
"Smithy prices saved.": "鍛冶屋の価格を保存しました。",
"Critical immunity": "クリティカル無効",
"from edged weapons": "刃の武器から",
"from everything": "すべてから",
"Weapon +1": "武器 +1",
"Weapon +2": "武器 +2",
"Armor and shield +1": "鎧・盾 +1",
"Armor and shield +2": "鎧・盾 +2",
"Custom forging, per ±1": "筋力合わせ（±1ごと）",
"The resist roll against this attack was already made: re-check its outcome by hand.": "この攻撃への抵抗判定はすでに行われています。結果は手動で確認してください。",
"Riding stunts": "騎芸",
"Mounted": "騎乗中",
"A stunt toggle: on when you mount, off when you dismount. Bonuses only while on.": "騎芸のスイッチ：騎乗したらオン、降りたらオフ。オンの間だけボーナスが入ります。",
"Save as a riding stunt (Rider tab)": "騎芸として保存（ライダーのタブ）",
"Rider stunts": "ライダーの騎芸",
"The token will be friendly: it acts with the party in the side initiative": "トークンは友好になります：陣営ごとの先制でパーティ側として行動します",
"Ally (mount, familiar)": "味方（騎獣・使い魔）",
"Drag items here — from a catalog above, the Items directory or a sheet": "ここにアイテムをドラッグ——上のカタログ、アイテム一覧、シートから",
"Catalog:": "カタログ：",
"Contracted elements:": "契約している属性：",
"Untick the special spells of other gods.": "他の神の特殊神聖魔法はチェックを外してください。",
"A caster knows every spell of their school up to the class level. Ticked: the ones not on the sheet yet.": "魔法使いは技能レベルまでの自分の系統の魔法をすべて習得しています。チェック済み：まだシートにないもの。",
"Add the ticked ones": "チェックしたものを追加",
"School spells": "系統の魔法",
"Add every spell of your school up to the class level (known ones are skipped)": "技能レベルまでの系統魔法をすべて追加（習得済みは除外）",
"World items": "ワールドのアイテム",
"Search…": "検索…",
"Add to cart": "カートに追加",
"Choose what the talent applies to:": "この特技の対象を選んでください：",
"Done": "完了",
"Cast": "行使",
"acc": "命中",
"dmg": "ダメージ",
"Str": "筋力",
"A token is needed: target someone or put your character on the scene.": "コマが必要です：対象を選ぶか、自分のキャラクターをシーンに置いてください。",
"Every sheet already matches the compendiums.": "すべてのシートはコンペンディウムと一致しています。",
"Items taken from compendiums earlier get the new rules and effects. Quantity, equipment, upgrades and choices already made stay.": "以前コンペンディウムから取ったアイテムに新しいルールと効果を反映します。個数・装備・強化・選択済みの内容はそのままです。",
"Update from compendiums": "コンペンディウムから更新",
"Update the ticked ones": "チェックしたものを更新",
"Update sheets from compendiums": "コンペンディウムからシートを更新"
}));
export const JA_TPL = [
[
"Character creation · 2/4 · background (${})",
"キャラクター作成 · 2/4 · 生まれ（${}）"
],
[
"Background: rolled ${} — ${}.",
"生まれ：出目${} — ${}。"
],
[
"${}: which class?",
"${}：どの技能にしますか？"
],
[
"Base: Skill ${}, Body ${}, Mind ${}. The book suggests rolling three times and picking one set. Modifier = value / 6 (rounded down).",
"初期値：技${}、体${}、心${}。ルールブックでは3回振って1組を選ぶことを推奨しています。ボーナス＝能力値÷6（端数切り捨て）。"
],
[
"Set ${}",
"セット${}"
],
[
"Free experience: <b class=\"sw25-cg-left\">${}</b> of ${}. No class may start above level 2; unspent experience is kept.",
"未使用経験点：<b class=\"sw25-cg-left\">${}</b> / ${}。作成時にレベル3以上にできる技能はありません。使わなかった経験点は保持されます。"
],
[
"Not enough experience: ${} over budget. Remove a level.",
"経験点が${}不足しています。レベルを下げてください。"
],
[
"Character wizard: background class not found (${}) — add it manually.",
"キャラクター作成ウィザード：生まれの技能が見つかりません（${}）— 手動で追加してください。"
],
[
"Classes: ${} · free experience ${} · ${} G for equipment",
"技能：${} · 未使用経験点 ${} · 装備購入用 ${} G"
],
[
"${} (poison ${}/round)",
"${}（毒 ${}/ラウンド）"
],
[
"Card: ${} ${}",
"カード：${} ${}"
],
[
"<div class=\"sw25-cast-mp\">Poison: −${} HP at the end of each of the target's turns, 6 rounds (${}); 1 round on a successful resistance</div>",
"<div class=\"sw25-cast-mp\">毒：対象の手番終了時ごとにHP −${}、6ラウンド（${}）。抵抗に成功すると1ラウンド</div>"
],
[
"${}: needs ${} Edge, you have ${}.",
"${}：陣気${}が必要です（現在${}）。"
],
[
"${} has already been used this round: “${}”.",
"${}はこのラウンドすでに使用されています：「${}」。"
],
[
"Rank ${} (${}) is not available yet: the highest rank allowed now is ${}${}.",
"ランク${}（${}）はまだ使えません：現在使用できる最高ランクは${}${}です。"
],
[
"${} — choice",
"${} — 選択"
],
[
"Next round a rank ${} stratagem of any type is available.",
"次のラウンドは、任意のタイプのランク${}の鼓咆が使用できます。"
],
[
"${}: needs ${} (${}), you have ${}.",
"${}：${}（${}）が必要です（現在${}）。"
],
[
"${} — how much to spend (${}: ${})",
"${} — 消費量（${}：${}）"
],
[
"<p>Cost ${}–${}. The more Qi, the stronger the effect.</p>",
"<p>消費 ${}–${}。命脈点を多く使うほど効果が強くなります。</p>"
],
[
"${}: select a target first (no Qi spent).",
"${}：先にターゲットを選択してください（命脈点は消費されていません）。"
],
[
"<b>No target selected — apply ${} damage manually.</b>",
"<b>ターゲットが選択されていません — ${}ダメージを手動で適用してください。</b>"
],
[
"<i>Apply the effect manually${}.</i>",
"<i>効果を手動で適用してください${}。</i>"
],
[
"<b>No “${}” counter.</b>",
"<b>「${}」カウンターがありません。</b>"
],
[
"Dark Hunter's HP: ${} → <b>${}</b> (−${})",
"ダークハンターのHP：${} → <b>${}</b>（−${}）"
],
[
"${}: select a target.",
"${}：ターゲットを選択してください。"
],
[
" <i>(dice sum ${}${}${})</i>",
" <i>（出目合計 ${}${}${}）</i>"
],
[
"Power ${}${}, crit. threshold 10",
"威力${}${}、C値10"
],
[
"Check (Spirit Power ${}): ${} + ${} = <b>${}</b>${}",
"判定（精神力 ${}）：${} + ${} = <b>${}</b>${}"
],
[
"for ${} rd.",
"${}ラウンド間"
],
[
"${}: HP is above 0, no Death Check is needed.",
"${}：HPが0より大きいため、生死判定は不要です。"
],
[
"${}: added the “${}” item to the sheet automatically (it was missing) — from now on the roll is calculated by itself.",
"${}：「${}」アイテムがなかったため、シートに自動で追加しました。以後、ロールは自動で計算されます。"
],
[
"${}: there is no “Death Check” item (type: check) on the sheet and no sample among the world items either — add it by hand (the checks compendium), otherwise nothing can calculate the roll.",
"${}：シートに「生死判定」アイテム（種類：判定）がなく、ワールドのアイテムにも見本がありません。手動で追加してください（判定の辞典から）。追加しないとロールを計算できません。"
],
[
"Successful checks in a row: ${}/${}",
"連続成功：${}/${}"
],
[
"Success — number ${} in a row: the character wakes up at 1 HP",
"成功 — ${}回連続：キャラクターはHP1で目を覚まします"
],
[
"Target number (|HP|): <strong>${}</strong> · Roll: 2d(${},${}) + base ${} = <strong>${}</strong>",
"目標値（|HP|）：<strong>${}</strong> · ロール：2d(${},${}) + 基準値 ${} = <strong>${}</strong>"
],
[
"\"${}\" appears more than once (${} and ${}) — the first is used",
"「${}」が複数あります（${}と${}）— 最初のものを使用します"
],
[
"\"${}\" check",
"「${}」判定"
],
[
"The item has ${} more hand-made effect(s); this window does not touch them (Effects tab).",
"このアイテムには手動で作成した効果が他に${}個あります。このウィンドウではそれらを変更しません（バフ・デバフタブ）。"
],
[
"${}: effect saved — ${}.",
"${}：効果を保存しました — ${}。"
],
[
"${}: text effect removed.",
"${}：テキスト効果を削除しました。"
],
[
"Strength ${}, ${} for a Fencer",
"筋力${}、フェンサーは${}"
],
[
"Strength ${}",
"筋力${}"
],
[
"${}: not enough Strength (${}, ${} needed). The item can only be held.",
"${}：筋力が足りません（${}、必要${}）。このアイテムは所持のみ可能です。"
],
[
"[GM] ${} Allowed by the GM.",
"[GM] ${} GMにより許可されました。"
],
[
"${} seconds (${} ${})",
"${}秒（${} ${}）"
],
[
"${} min. (${} ${})",
"${}分（${} ${}）"
],
[
"${} h",
"${}時間"
],
[
"${} d.",
"${}日"
],
[
"Check: ${}",
"判定：${}"
],
[
"Rank ${}",
"ランク${}"
],
[
"school \"${}\" is not in the system list — on the sheet the spell goes under \"${}\"",
"魔法系統「${}」はシステムの一覧にありません — シートでは「${}」に分類されます"
],
[
"Level ${}",
"${}レベル"
],
[
"effect: ${}",
"効果：${}"
],
[
"${} Material Card ${}",
"${}のマテリアルカード ${}"
],
[
"<p>Loot${}.${}${}</p>",
"<p>戦利品${}。${}${}</p>"
],
[
"${}: none left in the inventory.",
"${}：所持品に残っていません。"
],
[
"${} — which card color?",
"${} — どの色のカードを使いますか？"
],
[
"${}: add material cards",
"${}：マテリアルカードを追加"
],
[
"Elements used: ${}.",
"使用した属性：${}。"
],
[
" Level ${}",
" ${}レベル"
],
[
"${}${}${} / Magic Power ${}",
"${}${}${} / 魔力 ${}"
],
[
"Generator: ${} abilities lost the save schema (dice1.resist) — please report it.",
"ジェネレーター：${}個の能力で抵抗スキーマ（dice1.resist）が失われました。報告してください。"
],
[
"Monsters created: ${}. They are in the Actors directory.",
"魔物を作成しました：${}体。アクターディレクトリにあります。"
],
[
"Items to create in the world: ${}.",
"ワールドに作成するアイテム：${}。"
],
[
"Already exist (skipped): ${}.",
"既存のためスキップ：${}。"
],
[
"monsters: ${}",
"魔物：${}"
],
[
"created in the world (Items tab): ${}",
"ワールドに作成（アイテムタブ）：${}"
],
[
"skills/techniques skipped: ${} (not supported yet)",
"技能・特技をスキップ：${}（未対応）"
],
[
"already in the world: ${}",
"ワールドに既存：${}"
],
[
"not recognised: ${}",
"認識できません：${}"
],
[
"warnings: ${} (see the F12 console)",
"警告：${}（F12コンソールを参照）"
],
[
"ytsheet: ${} items created.",
"ytsheet：${}個のアイテムを作成しました。"
],
[
"Could not read JSON: ${}",
"JSONを読み込めませんでした：${}"
],
[
"Parsed monsters: ${}.",
"解析した魔物：${}。"
],
[
"Items created: ${}.",
"作成したアイテム：${}。"
],
[
"Nothing found (skipped: ${}). Monsters, spells and items are supported.",
"何も見つかりませんでした（スキップ：${}）。対応しているのは魔物、魔法、アイテムです。"
],
[
"ytsheet: monsters ${}${}.",
"ytsheet：魔物 ${}${}。"
],
[
"Lines applied: ${} of ${}.",
"適用した行：${} / ${}。"
],
[
"“${}” has already been used ${}${}${}.",
"「${}」はすでに使用済みです${}${}${}。"
],
[
"<b>${}</b>: full rest — HP ${} → <b>${}</b>, MP ${} → <b>${}</b>, abilities restored${}.",
"<b>${}</b>：完全休息 — HP ${} → <b>${}</b>、MP ${} → <b>${}</b>、能力が回復しました${}。"
],
[
"<b>${}</b>: new day — daily abilities restored${}.",
"<b>${}</b>：新しい日 — 1日ごとの能力が回復しました${}。"
],
[
"<b>${}</b>: an hour has passed${}.",
"<b>${}</b>：1時間が経過しました${}。"
],
[
"<b>${}</b>: already slept 6 hours today — more sleep restores nothing.",
"<b>${}</b>：今日はすでに6時間眠っています — これ以上眠っても回復しません。"
],
[
" <i>(${} h counted: no more than 6 per day)</i>",
" <i>（${}時間分を計上：1日6時間まで）</i>"
],
[
"<b>${}</b>: slept ${} h — HP ${} → <b>${}</b>, MP ${} → <b>${}</b>${}",
"<b>${}</b>：${}時間睡眠 — HP ${} → <b>${}</b>、MP ${} → <b>${}</b>${}"
],
[
"HP ${}/${} · MP ${}/${} · slept ${} h${}",
"HP ${}/${} · MP ${}/${} · 睡眠 ${}時間${}"
],
[
"${} per ${}${}. Used: ${}. Right-click to reset.",
"${}回 / ${}${}。使用：${}。右クリックでリセット。"
],
[
"Sample: ${}",
"見本：${}"
],
[
"SW25: samples built — ${} characters, ${} monsters.",
"SW25：見本を作成しました — キャラクター${}体、魔物${}体。"
],
[
" Not found in the compendiums: ${}.",
" 辞典に見つかりません：${}。"
],
[
"sections: ${}",
"部位：${}"
],
[
"table rows: ${}",
"表の行：${}"
],
[
"Section “${}”",
"部位「${}」"
],
[
"<p>What should be added to the section “${}”?</p>",
"<p>部位「${}」に何を追加しますか？</p>"
],
[
"Attack (${})",
"攻撃（${}）"
],
[
"<b>${}</b>: section “${}” is disabled — its actions and abilities are unavailable.",
"<b>${}</b>：部位「${}」が機能停止しました — その部位の行動と能力は使用できません。"
],
[
"<b>${}</b>: section “${}” is back in action.",
"<b>${}</b>：部位「${}」が機能を回復しました。"
],
[
"<p>Remove the section “${}” from “${}”?</p>",
"<p>「${2}」から部位「${1}」を削除しますか？</p>"
],
[
"Target section: ${}",
"対象部位：${}"
],
[
"${}: target — ${}",
"${}：対象 — ${}"
],
[
"${}: which section do you attack?",
"${}：どの部位を攻撃しますか？"
],
[
"Keys 1–${}, Enter — select",
"キー1–${}、Enter — 選択"
],
[
"“${}” has no price — enter it in the table.",
"「${}」に価格がありません — 表に入力してください。"
],
[
"${} cannot afford it (${} G of ${} G).",
"${}は購入できません（所持 ${} G / 必要 ${} G）。"
],
[
"${}: area ${} m${}, targets ${}${}",
"${}：範囲${}m${}、対象${}${}"
],
[
"${}: line ${} m, targets ${}",
"${}：射線${}m、対象${}"
],
[
"${}: no targets.",
"${}：対象がいません。"
],
[
"SW25: starter compendiums built (classes, checks, racial abilities, techniques) — ${} items.",
"SW25：スターター辞典を作成しました（技能、判定、種族特徴、練技）— ${}個のアイテム。"
],
[
"effect from text: ${}${} — check it with the Effects button on the item sheet",
"テキストからの効果：${}${} — アイテムシートの「バフ・デバフ」ボタンで確認してください"
],
[
"school \"${}\" is unknown — set to Truespeech, fix it by hand",
"魔法系統「${}」は不明です — 真語魔法に設定しました。手動で修正してください"
],
[
"element \"${}\" is not in the system list — left empty",
"属性「${}」はシステムの一覧にありません — 空欄のままです"
],
[
"power ${} (C${}) was taken from the text — check it",
"威力${}（C値${}）をテキストから取得しました — 確認してください"
],
[
"cost \"${}\" has no MP number — set to 0",
"消費「${}」にMPの数値がありません — 0に設定しました"
],
[
"${}: not created — ${}",
"${}：作成されませんでした — ${}"
],
[
"weapon category \"${}\" is unknown — the category field is empty",
"武器カテゴリ「${}」は不明です — カテゴリ欄は空欄です"
],
[
"usage \"${}\" is unknown — the field is empty, the value is in the description",
"用法「${}」は不明です — 欄は空欄にし、値は説明に記載しました"
],
[
"power \"${}\" has two values — the first is used",
"威力「${}」に2つの値があります — 最初の値を使用します"
],
[
"crit \"${}\" is not a number — set to 10",
"C値「${}」は数値ではありません — 10に設定しました"
],
[
"armour category \"${}\" is unknown",
"防具カテゴリ「${}」は不明です"
],
[
"body part \"${}\" is unknown — set to \"other\"",
"装備部位「${}」は不明です — 「その他」に設定しました"
],
[
"${}: roll error — see the console (F12) for details.",
"${}：ロールエラー — 詳細はコンソール（F12）を参照してください。"
],
[
"${}: power roll error — see the console (F12) for details.",
"${}：威力ロールエラー — 詳細はコンソール（F12）を参照してください。"
],
[
"${m[1]} of ${m[2]} selected",
"${m[1]} / ${m[2]} 件選択"
],
[
"Attack (${m[1]})",
"攻撃（${m[1]}）"
],
[
"Section ${m[1]}",
"部位 ${m[1]}"
],
[
"Sections: ${m[1]} — check the main section",
"部位数：${m[1]} — メイン部位を確認してください"
],
[
"lv. ${m[1]}",
"Lv.${m[1]}"
],
[
"immune to damage from ${}",
"${}によるダメージを受けない"
],
[
"half damage from ${}",
"${}によるダメージを半減"
],
[
"damage from ${} +${}",
"${}によるダメージ+${}"
],
[
"check = adventurer level + ${} bonus",
"判定＝冒険者レベル＋${}ボーナス"
],
[
"+${} to the result",
"達成値+${}"
],
[
"with ${} weapons",
"〈${}〉の武器で"
],
[
"for the “${}” check",
"「${}」判定に"
],
[
"${} times a day",
"1日${}回"
],
[
"up to ${} rounds a day",
"1日${}ラウンドまで"
],
[
"two attacks, one with each weapon${}",
"それぞれの武器で1回ずつ、計2回攻撃${}"
],
[
"one accuracy roll against ${} targets, damage to each",
"1回の命中力判定で${}体まで攻撃し、ダメージは対象ごと"
],
[
"damage ×2 on a margin of ${}+ (manual for now)",
"${}以上の差で命中したらダメージ2倍（現在は手動）"
],
[
"Before the accuracy roll${} ${} may be declared.",
"命中力判定の前に${}、${}を宣言できる。"
],
[
" Until the next turn: ${}.",
" 次の手番開始まで：${}。"
],
[
" For this attack: ${}.",
" この攻撃に：${}。"
],
[
" Risk for 1 round: ${}.",
" リスク（1ラウンド）：${}。"
],
[
" In these attacks: ${}.",
" これらの攻撃で：${}。"
],
[
" Requires: ${}.",
" 習得条件：${}。"
],
[
" While on: no ${}.",
" 有効な間：${}不可。"
],
[
", ${} MP",
"、MP${}"
],
[
", −${} MP",
"、MP−${}"
],
[
" From level 6: ${}.",
" 6レベル以降：${}。"
],
[
" From level 11: ${}.",
" 11レベル以降：${}。"
],
[
"lv ${}+",
"Lv${}以上"
],
[
"You may declare: ${}",
"宣言できる数：${}"
],
[
"${}: declare a talent?",
"${}：特技を宣言しますか？"
],
[
"Risk: ${}",
"リスク：${}"
],
[
"Not enough MP (${} of ${}).",
"MPが足りません（${}／${}）。"
],
[
"Turned off (${}).",
"オフにしました（${}）。"
],
[
"Tier ${}: lower tiers of “${}” stop counting.",
"段階${}：「${}」の下位段階は効果を失います。"
],
[
"${}: no spells while it is on.",
"${}：有効な間は魔法を使えません。"
],
[
"No more than ${} targets.",
"対象は${}体までです。"
],
[
"While the character has ${}: ${}.",
"${}を持っている間：${}。"
],
[
"A sheet button ${}: ${}.",
"シートのボタン${}：${}。"
],
[
"Always ${}: ${}.",
"常時 ${}：${}。"
],
[
"Always: ${}.",
"常時：${}。"
],
[
"Toggle ${}: on — ${}, off — ${}. While on${}: ${}.",
"切り替え${}：オン — ${}、オフ — ${}。有効な間${}：${}。"
],
[
"Button ${} (${})${}: ${}.",
"ボタン${}（${}）${}：${}。"
],
[
"On the character's check cards, a button ${}: ${}.",
"このキャラクターの判定カードにボタン${}：${}。"
],
[
"Turned on (${}).",
"オンにしました（${}）。"
],
[
"dual attack ${}",
"二刀攻撃 ${}"
],
[
"While the character has ${}, ${}: ${}.",
"${}を持っている間、${}：${}。"
],
[
"Sword Shards ×${}",
"剣のかけら×${}"
],
[
"${}: Sword Shards",
"${}：剣のかけら"
],
[
"Fortitude and Willpower +${}",
"生命抵抗力・精神抵抗力+${}"
],
[
"Spread: HP ${} of ${}, MP ${} of ${}.",
"配分：HP ${}／${}、MP ${}／${}。"
],
[
"${}: ${} Sword Shards.",
"${}：剣のかけら${}個。"
],
[
"${}: shards removed.",
"${}：剣のかけらを外しました。"
],
[
"Sword Shard (200G/-) x${}",
"剣のかけら（200G）x${}"
],
[
"Custom-Forged: Minimum Strength ${}, Power as well.",
"オーダーメイド：必要筋力${}、威力も同じだけ。"
],
[
"Fairy (${})",
"妖精：${}"
],
[
"Fairy Weapon: damage type by password (Minor Action) — ${}.",
"妖精の武器：合言葉（補助動作）で属性付与 — ${}。"
],
[
"Abyss ${}: ${}.",
"アビス強化${}：${}。"
],
[
"Abyss Curse «${}» (${}): ${}",
"呪い「${}」（${}）：${}"
],
[
"Abyss Shards: ${}.",
"アビスシャード：${}。"
],
[
"${}: curse (carried)",
"${}：呪い（所持）"
],
[
"${}: upgrades",
"${}：強化"
],
[
"${}: Abyss curse",
"${}：アビスカース"
],
[
"Curse ${} is already there — rerolling.",
"呪い${}は既にある — 振り直し。"
],
[
"${} G per point, power follows",
"1点ごとに${}G、威力も連動"
],
[
"${}: upgrades applied.",
"${}：強化を適用しました。"
],
[
"Combat feats: ${} of ${}.",
"戦闘特技：${}／${}。"
],
[
"Next, by hand: ${}.",
"この後は手動で：${}。"
],
[
"High level: ${}",
"高レベル：${}"
],
[
"Character creation · ability growth (${})",
"キャラクター作成・能力値成長（${}）"
],
[
"Spread ${} growths over the abilities. The book's “average growth” scheme is filled in: most to the highest one.",
"成長${}回を能力値に振り分けます。ルールブックの「平均的な成長」を入力済み：最も高い能力値に多く。"
],
[
"${} of ${} spread.",
"${}／${}を振り分け済み。"
],
[
"Character creation · combat feats (${})",
"キャラクター作成・戦闘特技（${}）"
],
[
"Slots: ${} (one on adventurer level 1, 3, 5…). Check the requirements in the book. Automatic class feats are added by themselves.",
"取得数：${}（冒険者レベル1、3、5…ごとに1つ）。前提はルールブックで確認。自動取得特技は自動で追加されます。"
],
[
"Free experience: <b class=\"sw25-cg-left\">${}</b> of ${} (background + ${}). Main class around the average level ${}; Scout, Sage, Ranger no more than 2 levels lower. Unspent experience is kept.",
"使用可能経験点：<b class=\"sw25-cg-left\">${}</b>／${}（生まれ＋${}）。メイン技能は平均レベル${}前後、スカウト・セージ・レンジャーは2レベル下まで。余った経験点は保持されます。"
],
[
"High level ${}: ${} ability growths, reputation ${}, ${} abyss shards.",
"高レベル${}：能力値成長${}回、名誉点${}、アビスシャード${}個。"
],
[
"${}: adventurer rank",
"${}：冒険者ランク"
],
[
"<b>${}</b>: rank «${}» (−${} reputation). Famous items whose reputation cost is up to ${} give it back.",
"<b>${}</b>：ランク「${}」（名誉点−${}）。必要名誉点${}以下の名誉アイテム分は返還。"
],
[
"<b>${}</b>: disgrace +${} (total ${}).",
"<b>${}</b>：不名誉点+${}（合計${}）。"
],
[
"<b>${}</b>: disgrace −${} for ${} reputation (${} left).",
"<b>${}</b>：不名誉点−${}、名誉点${}で相殺（残り${}）。"
],
[
"<b>${}</b>: rank lowered to «${}», disgrace +${}.",
"<b>${}</b>：ランクを「${}」に降格、不名誉点+${}。"
],
[
"${}: cost <b>${}</b> MP, MP now ${}. How much does a mako stone pay (one stone per cost)?",
"${}：消費<b>${}</b>MP、現在MP${}。魔晶石からいくら払う？（1回につき1個）"
],
[
"Stone: ${} → ${}. MP: ${} → ${}.",
"魔晶石：${} → ${}。MP：${} → ${}。"
],
[
"Mako Stone: −${} MP, the stone broke.",
"魔晶石：−${}MP、魔晶石は砕けた。"
],
[
"Mako Stone: −${} MP (${} left).",
"魔晶石：−${}MP（残り${}）。"
],
[
"${}: the Guild refuses service because of the disgrace.",
"${}：不名誉のためギルドの利用停止。"
],
[
"Sword of Genesis★${}",
"始まりの剣★${}"
],
[
"Material: ${} (${} G) or Strongly ${} (${} G, recovered afterwards).",
"素材：${}（${}G）または強化素材（${}G、後で回収可）。"
],
[
"Material: ${} (or Magical Bones, 500 G). Consumed.",
"素材：${}（または魔法の骨、500G）。消費される。"
],
[
"${}: creations",
"${}：作成物"
],
[
"Needs Conjurer level ${}.",
"コンジャラーレベル${}が必要。"
],
[
"No material: ${}. Untick the box if it is covered another way.",
"素材がない：${}。別途用意済みならチェックを外してください。"
],
[
"Not enough MP: ${} needed, ${} left.",
"MP不足：必要${}、残り${}。"
],
[
"MP −${}.",
"MP−${}。"
],
[
"Material: ${} −1.",
"素材：${} −1。"
],
[
"Damage to the familiar (${}) goes to the master: ${}.",
"ファミリアへのダメージ（${}）は主人が受ける：${}。"
],
[
"from the familiar's MP (${}, needs contact)",
"ファミリアのMPから（${}、接触が必要）"
],
[
"${}: cost <b>${}</b> MP, MP now ${}. What pays part of it (one Mako Stone per cost)?",
"${}：消費<b>${}</b>MP、現在MP${}。一部を何で払う？（魔晶石は1回1個）"
],
[
"Stone: ${} → ${}.",
"魔晶石：${} → ${}。"
],
[
"Familiar: ${} → ${}.",
"ファミリア：${} → ${}。"
],
[
"MP: ${} → ${}.",
"MP：${} → ${}。"
],
[
"Familiar MP: −${} (${} left).",
"ファミリアのMP：−${}（残り${}）。"
],
[
"No more than ${} items for this golem.",
"このゴーレムには${}個まで。"
],
[
"«${}» needs its base item.",
"「${}」には元になるアイテムが必要です。"
],
[
"${}: enhanced copy",
"${}：強化コピー"
],
[
"Size: ${}. Up to ${}. Compendium «SW25: Golem Enhancing Items».",
"サイズ：${}。${}個まで。コンペンディウム「SW25: ゴーレム強化パーツ」。"
],
[
"In other golems: ${}.",
"他のゴーレムで使用中：${}。"
],
[
"Enhancements: ${}.",
"強化パーツ：${}。"
],
[
"SW25: starter compendiums built — ${} items.",
"SW25：スターターコンペンディウムを作成 — ${}アイテム。"
],
[
"SW25: new entries (${}) — in the compendium «${}».",
"SW25：新しい項目（${}）— コンペンディウム「${}」に追加。"
],
[
"${}: not enough MP — ${} needed, ${} available (${} own + ${}).",
"${1}：MPが足りません — 必要${2}、使用可能${3}（自分${4}＋${5}）。"
],
[
"${}: curse (not in use)",
"${1}：呪い（未使用時）"
],
[
"sections: ${}, total HP ${}",
"部位数：${1}、合計HP ${2}"
],
[
"Core section: ${}",
"コア部位：${1}"
],
[
"Smithy: ${}",
"鍛冶屋：${1}"
],
[
"Conjurer: level ${}.",
"コンジャラー：レベル${1}。"
],
[
"Material: ${}",
"素材：${1}"
],
[
" or ${}",
" または ${1}"
],
[
"Size: ${}.",
"サイズ：${1}。"
],
[
"Up to ${}.",
"最大${1}個。"
],
[
"${}: creation",
"${1}：作成物"
],
[
"Magic Weapon +${}: Accuracy +${}, Extra Damage +${}.",
"魔法の武器+${1}：命中+${2}、追加ダメージ+${3}。"
],
[
"Magic +${}: Defense +${}.",
"魔法の防具+${1}：防護点+${2}。"
],
[
"Rolled ${}, but there is no curse with that number — pick one or make it in the constructor.",
"出目は${1}ですが、その番号の呪いがありません。手で選ぶか、ビルダーで作成してください。"
],
[
"Abyss Shards: ${} needed, ${} carried",
"アビスシャード：必要${}、所持${}"
],
[
"${}: not enough Abyss Shards (${} of ${}).",
"${}：アビスシャードが足りません（所持${}／必要${}）。"
],
[
"Custom-forged: Min. Strength ${}, Power ${}.",
"オーダーメイド：必要筋力${}、威力${}。"
],
[
"Custom ${}",
"オーダーメイド${}"
],
[
"Shot protection (guns): the damage is reduced by the armor's own Defense, ${} times; repairs at the smithy.",
"防弾（ガン）：防具自身の防護点だけダメージを軽減、${}回まで。修理は鍛冶屋で。"
],
[
"redetermine the curse (Abyss Shards: ${})",
"アビスカースを再決定（アビスシャード：${}）"
],
[
"${} G per ±1",
"±1ごとに${}G"
],
[
"Left: ${} of ${}",
"残り：${}／${}"
],
[
"${} G each",
"1回${}G"
],
[
"Abyss Curse «${}»",
"アビスカース「${}」"
],
[
"Curse ${}: «${}» → «${}».",
"アビスカース${}：「${}」→「${}」。"
],
[
"Shot protection repaired: +${} (${} of ${} left).",
"防弾を修理：+${}（残り${}／${}）。"
],
[
"${}: shot protection −${} (${} of ${} left).",
"${}：防弾 −${}（残り${}／${}）。"
],
[
"${}: active effects could not be applied — see the console (F12).",
"${}：効果を適用できませんでした。詳細はコンソール（F12）を確認してください。"
],
[
"${}: the magazine is full (${}).",
"${}：弾倉は満杯です（${}）。"
],
[
"${}: reload",
"${}：リロード"
],
[
"Free slots: ${}. How many bullets of each kind?",
"空き：${}。それぞれ何発装填しますか？"
],
[
"${}: the magazine is empty",
"${}：弾倉が空です"
],
[
"${}: out of ammunition.",
"${}：矢弾が尽きました。"
],
[
"${}: which ammunition?",
"${}：どの矢弾を使いますか？"
],
[
"Only ${} may be declared: the extra talents were not applied.",
"宣言できるのは${}個までです。超えた分の特技は適用されません。"
],
[
"Armor piercing: Defense ${} → ${}",
"鎧貫き：防護点 ${} → ${}"
],
[
"${}: not enough MP (${} of ${}).",
"${}：MPが足りません（${}／${}）。"
],
[
"${}: on the weapon «${}»",
"${}：武器「${}」に込めた"
],
[
"MP −${} (${} → ${})",
"MP −${}（${} → ${}）"
],
[
"MP already paid (on the weapon «${}»)",
"MPは消費済み（武器「${}」に込めた魔法）"
],
[
"${}: a counter was already used this round.",
"${}：このラウンドはすでにカウンターを使いました。"
],
[
"${}: no equipped melee weapon.",
"${}：装備中の近接武器がありません。"
],
[
"Counter: ${}",
"カウンター：${}"
],
[
"damage ×2 if accuracy beats the target's evasion by ${} or more",
"命中力判定の達成値が対象の回避を${}以上上回れば、ダメージ2倍"
],
[
"Upgrades: ${}, Abyss enhancements: ${}, Abyss curses: ${}.",
"加工：${}、アビス強化：${}、アビスカース：${}。"
],
[
"recovered, +${}",
"回収、+${}"
],
[
"Only ${} may be declared: applied — ${}.",
"宣言できるのは${}個まで。適用：${}。"
],
[
"${}: two shots at once need 2, you have ${}.",
"${}：2発同時に撃つには2つ必要です（残り${}）。"
],
[
"Character creation · riding stunts (${})",
"キャラクター作成・騎芸（${}）"
],
[
"Stunts: ${} (one per Rider level). Check the level and prerequisite stunts in the book.",
"騎芸：${}個（ライダー技能レベルごとに1つ）。習得レベルと前提の騎芸はルールブックで確認してください。"
],
[
"Riding stunts: ${} of ${}.",
"騎芸：${}／${}。"
],
[
"Not enough Strength: ${} of ${} — can only be held",
"筋力不足：${}／${}——持つことしかできません"
],
[
"${} has no spellcasting class.",
"${}には魔法技能がありません。"
],
[
"${}: every school spell up to the class level is already on the sheet (or none are in the compendiums).",
"${}：技能レベルまでの系統魔法はすべてシートにあります（またはコンペンディウムにありません）。"
],
[
"${}: school spells",
"${}：系統の魔法"
],
[
"${}: ${} spells added.",
"${}：魔法を${}個追加しました。"
],
[
"${}: none left.",
"${}：残っていません。"
],
[
"${} left",
"残り${}"
],
[
"Items updated: ${}.",
"更新したアイテム：${}。"
]
];
