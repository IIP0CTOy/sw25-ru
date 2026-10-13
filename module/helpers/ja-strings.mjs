/**
 * Japanese UI layer (2026-10-13). The interface strings of this system are written as
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
"Initiative: you may use “Warleader level + Intelligence mod. + 1” — apply manually.": "先制判定：「ウォーリーダー技能レベル＋知力ボーナス＋1」を使用できます — 手動で適用してください。",
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
"This round the Warleader's songs affect only the chosen side — apply manually.": "このラウンド、ウォーリーダーの鼓咆は選択した側にのみ効果を及ぼします — 手動で適用してください。",
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
"The Warleader": "ウォーリーダー",
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
"Animals": "動物",
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
"Constructs": "魔法生物",
"Copy texts for translation": "翻訳用テキストをコピー",
"Could not find the “Level + Name” line — enter it manually": "「レベル＋名前」の行が見つかりません — 手動で入力してください",
"Create selected": "選択した魔物を作成",
"Daemons": "魔神",
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
"Fairies": "妖精",
"Fire +N": "炎 +N",
"Fireball": "火球",
"Fortitude (bonus)": "生命抵抗力（基本値）",
"Fortitude/Willpower not found": "生命抵抗力／精神抵抗力が見つかりません",
"Gaze": "視線",
"Habitat": "生息地",
"Half": "半減",
"Hit with save (Fortitude, half)": "抵抗付きの攻撃（生命抵抗力、半減）",
"Humanoids": "人族",
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
"Mythical beasts": "幻獣",
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
"Plants": "植物",
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
"🗨 declared": "🗨 宣言"
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
]
];
