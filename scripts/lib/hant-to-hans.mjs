/**
 * Traditional (Hong Kong) → Simplified conversion.
 *
 * The site authors Chinese in Traditional Chinese only. Simplified strings are
 * derived here at build time, never hand-written, so the two can never drift.
 *
 * Two rules, in order:
 *   1. WORDS — whole words converted first. This covers both grammatical
 *      differences (甚麼 → 什么) and vocabulary the two places write with the
 *      same characters but different words (伺服器 → 服务器, 程式 → 程序).
 *      Without this step the output is Cantonese-shaped Simplified Chinese:
 *      correct characters, wrong language.
 *   2. PAIRS — one character for one character, then quote marks 「」→“”.
 *
 * A Han character that is in neither table is a hard error: new text must be
 * reviewed by a human before it can reach a page, rather than silently passing
 * through as Traditional inside a Simplified page.
 */

const PHRASES = [
  ["甚麼", "什么"],
];

// Vocabulary, not script. These words are written with the same characters in
// both scripts, so a one-for-one map leaves Hong Kong terms sitting inside
// Simplified text — 伺服器 instead of 服务器, 程式 instead of 程序. Converting
// the characters alone produces Cantonese-shaped Simplified Chinese, which is not
// what a mainland reader expects. Whole words are converted first.
const LOCALE = [
  ["伺服器", "服务器"], // 伺服器 is Taiwan/HK; 伺服器 never appears in mainland text
  ["協定", "协议"], // a protocol, not 协定 (an agreement)
  ["回覆", "回复"],
  ["紀錄", "记录"], // noun; 記錄 (verb) converts character by character
  ["設定", "设置"],
  ["選單", "菜单"],
  ["登入", "登录"],
  ["程式", "程序"],
  ["檔案", "文件"], // a computer file; 档案 means an archive in mainland usage
  ["原始碼", "源代码"],
  ["儀表板", "仪表盘"], // dashboard
  ["個人資料", "个人信息"],
];

// 「」 and 『』 are the Hong Kong/Taiwan quote marks; mainland text uses “” and ‘’.
const PUNCT = [
  ["「", "“"],
  ["」", "”"],
  ["『", "‘"],
  ["』", "’"],
];

// One-way pairs. Characters that are identical in both scripts are in
// IDENTICAL below and are deliberate, not oversights.
const PAIRS = [
  "並并", "乾干", "佈布", "佔占", "來来", "係系", "倉仓", "個个", "偵侦", "備备",
  "傳传", "內内", "兩两", "刪删", "則则", "創创", "動动", "務务", "匯汇", "協协",
  "參参", "問问", "啟启", "單单", "圍围", "圖图", "團团", "執执", "報报", "塊块",
  "壓压", "學学", "實实", "審审", "寫写", "寶宝", "對对", "導导", "層层", "師师",
  "帳帐", "帶带", "幾几", "庫库", "廠厂", "張张", "強强", "後后", "從从", "愛爱",
  "態态", "憶忆", "應应", "戲戏", "掃扫", "掛挂", "換换", "擇择", "擊击", "據据",
  "攜携", "敗败", "數数", "斷断", "於于", "時时", "暫暂", "書书", "會会", "東东",
  "條条", "業业", "構构", "標标", "樣样", "樹树", "機机", "橫横", "檔档", "權权",
  "歷历", "歸归", "決决", "況况", "淨净", "淺浅", "測测", "準准", "滿满", "瀏浏",
  "為为", "無无", "營营", "狀状", "獎奖", "獻献", "現现", "環环", "產产", "畫画",
  "疊叠", "療疗", "癒愈", "發发", "監监", "確确", "碼码", "礎础", "種种", "筆笔",
  "範范", "簡简", "籤签", "粵粤", "紀纪", "約约", "級级", "組组", "結结", "絕绝",
  "絡络", "給给", "統统", "經经", "綠绿", "網网", "綴缀", "線线", "編编", "練练",
  "縫缝", "總总", "繞绕", "繭茧", "習习", "聯联", "聲声", "與与", "舊旧", "蓋盖",
  "處处", "號号", "術术", "衝冲", "裏里", "補补", "裝装", "規规", "視视", "親亲",
  "覺觉", "覽览", "觀观", "觸触", "計计", "訊讯", "討讨", "記记", "訪访", "設设",
  "註注", "試试", "話话", "該该", "認认", "語语", "誠诚", "誤误", "說说", "誰谁",
  "課课", "談谈", "請请", "論论", "講讲", "證证", "譯译", "讀读", "變变", "讓让",
  "負负", "貨货", "責责", "費费", "資资", "質质", "躍跃", "輪轮", "輯辑", "輸输",
  "轉转", "辦办", "迴回", "這这", "連连", "進进", "遊游", "運运", "過过", "遞递",
  "選选", "還还", "邊边", "邏逻", "郵邮", "釋释", "錄录", "錯错", "鎖锁", "鐘钟",
  "長长", "門门", "開开", "間间", "閘闸", "閱阅", "關关", "隊队", "階阶", "隱隐",
  "雙双", "離离", "難难", "雲云", "電电", "靜静", "頁页", "頂顶", "項项", "順顺",
  "須须", "預预", "領领", "頭头", "頻频", "題题", "額额", "類类", "顯显", "風风",
  "驗验", "體体", "麼么", "點点", "齊齐", "著着", "沒没",
  "軟软", "聽听", "買买", "賣卖", "錢钱", "車车", "歲岁", "價价", "節节", "溫温",
  "戶户", "隻只", "髮发", "臺台", "裡里", "稱称", "維维", "譜谱", "賴赖", "隨随", "賽赛", "織织", "終终", "廣广", "馬马", "亞亚", "劃划", "獨独", "聞闻", "獲获", "戰战", "艦舰", "詞词", "擋挡",
  "幣币", "們们", "議议", "嗎吗", "許许", "識识", "蟲虫", "檢检",
  "鍵键", "欄栏", "複复", "適适", "憑凭", "別别", "夠够", "製制", "虛虚", "評评", "義义",
  "擔担", "屆届", "驅驱", "儀仪", "禮礼", "舉举", "綫线",
];

// Han characters whose Traditional and Simplified forms are identical. This is a
// closed list on purpose: it is the human-reviewed set the site is allowed to use.
const IDENTICAL =
  "一三上下不且中串主久之乎也了事亦二互五交人仍付令以仰件任份伺位住何作你使例供依便保信修值偏做像元先免入全公六共其具兼再出分切列利到制刻前力功加包化十升卡印即原去又及取受口句另只叫可台各合吉同向含呈告呼品哪哲商器四回因固在地址坐型域基堂塞填士外多大天失奇契套好始子字存它安完官定宜客室家容密小少尚就尾屏履工差己已常平年序度建式引形影待很得循微心必忠怎性悄意成我或截房手才打扣扮批找承技把拆拒括持指按授排接控描提插援搬播操擎支收改放故教散整文料新方旁日明易是普景智更替最月有服未本材松板析架查校核格框案桌楚次款此步段每比永求治法活流海消深清渡港漂演然片版物玩生由留疑登白的目相看真睡知短研硬示社祥私科秒移稀程究空突窗立站端第等答算管箱簿精系素索繁缺置署翻考者而聊肯育背能自至色英落行被西要角解言走起跑跟跨路跳追退送透逐通造道那部都配醒重量金附陌限院隙集零需非靠面音首香高黑模理用介布里品牌念碑名源致映展彭期母聆袖博水促往投股卷挑他旗拼抓否禁";

// Added 2026-11-16 for the hire page copy. Each of these is written the same
// way in Traditional and Simplified; reviewed one by one, not inferred.
const IDENTICAL_HIRE = "表除果些半思想假抄七今拿身如覆律省爬逆速率";

// Added 2026-11-16 when the hire copy was rewritten out of Cantonese into
// standard written Chinese. Same form in both scripts; reviewed one by one.
const IDENTICAL_WRITTEN = "和照遵副草享健守所稿康效司杭典州摘翡翠";

const PUNCT_MAP = new Map(PUNCT);
const CHAR_MAP = new Map(PAIRS.map((p) => [p[0], p[1]]));
const IDENTICAL_SET = new Set([...IDENTICAL, ...IDENTICAL_HIRE, ...IDENTICAL_WRITTEN]);

// Every Traditional form the tables know. An authored zh-Hans that contains one
// of these has kept Traditional characters — the commonest way hand-written
// Simplified goes wrong.
const TRADITIONAL_ONLY = new Set([...PAIRS.map((p) => p[0]), ...PUNCT.map((p) => p[0])]);

/** Return the Traditional characters found in a string, or "" if it is clean. */
export function findTraditional(text) {
  const found = new Set();
  for (const ch of text) if (TRADITIONAL_ONLY.has(ch)) found.add(ch);
  return [...found].join("");
}

// Longest first, so 個人資料 is matched before any shorter rule it contains.
const WORDS = [...LOCALE, ...PHRASES].sort((a, b) => b[0].length - a[0].length);

const HAN = /[㐀-䶿一-鿿豈-﫿]/;

class ConversionError extends Error {
  constructor(chars, sample) {
    const list = [...chars].join("");
    super(
      `Unmapped Traditional Han character(s): ${list}\n` +
        `Add them to scripts/lib/hant-to-hans.mjs (PAIRS or IDENTICAL) after review.\n` +
        `First seen in: ${sample}`,
    );
    this.name = "ConversionError";
  }
}

/**
 * Convert a Traditional Chinese string to Simplified.
 * Throws ConversionError if any Han character has not been reviewed.
 */
export function toSimplified(input) {
  if (typeof input !== "string") throw new TypeError("toSimplified expects a string");

  let result = "";
  let i = 0;
  while (i < input.length) {
    const word = WORDS.find(([from]) => input.startsWith(from, i));
    if (word) {
      result += word[1];
      i += word[0].length;
      continue;
    }
    const ch = input[i];
    if (CHAR_MAP.has(ch)) {
      result += CHAR_MAP.get(ch);
    } else if (PUNCT_MAP.has(ch)) {
      result += PUNCT_MAP.get(ch);
    } else if (HAN.test(ch) && !IDENTICAL_SET.has(ch)) {
      throw new ConversionError(new Set([ch]), input);
    } else {
      result += ch;
    }
    i += 1;
  }
  return result;
}

/** Convert every zh-Hant string in a data tree to a parallel zh-Hans tree. */
export function addSimplified(value, path = "$", problems = []) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((item, i) => addSimplified(item, `${path}[${i}]`, problems));
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = addSimplified(child, `${path}.${key}`, problems);
    }
    const hant = value["zh-Hant"];
    if (typeof hant === "string") {
      const authored = value["zh-Hans"];
      if (typeof authored === "string") {
        // An authored zh-Hans is a different written language (Mandarin), not a
        // script conversion of the Cantonese zh-Hant, so it is used as given.
        // It must still be genuine Simplified text: a Traditional character that
        // slipped through means the two versions drifted.
        const traditional = findTraditional(authored);
        if (traditional) {
          problems.push(`${path}: authored zh-Hans contains Traditional characters: ${traditional}`);
        }
        out["zh-Hans"] = authored;
      } else {
        try {
          out["zh-Hans"] = toSimplified(hant);
        } catch (err) {
          problems.push(`${path}: ${err.message.split("\n")[0]}`);
          out["zh-Hans"] = hant; // keep rendering; the build fails afterwards.
        }
      }
    }
    return out;
  }
  return value;
}

export { ConversionError };
