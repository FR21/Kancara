/**
 * Field Pass (Paspor Lapangan 1 Kartu) & Offline Companion Engine.
 * Provides destination-aware localized addresses, dietary safety cards,
 * pocket field phrases with offline TTS, emergency contacts (Police, Ambulance, KBRI),
 * and 1-tap offline caching for trips.
 */

export type FieldPhrase = {
  id: string;
  category: "dining" | "transport" | "emergency" | "directions";
  labelId: string;
  labelEn: string;
  localText: string;
  romanized: string;
  langTag: string;
};

export type EmergencyContacts = {
  police: string;
  ambulance: string;
  embassyName: string;
  embassyPhone: string;
  embassyAddress?: string;
};

export type AccommodationInfo = {
  name: string;
  address: string;
  localName?: string;
  localAddress?: string;
  langTag: string;
};

export type DietaryPassInfo = {
  memberCount: number;
  dietBadges: string[];
  localScriptText: string;
  romanized?: string;
  explanationId: string;
  explanationEn: string;
  langTag: string;
};

export type FieldPassData = {
  tripId: string;
  tripName: string;
  destination: string;
  destinationFlag: string;
  countryName: string;
  langTag: string;
  accommodation: AccommodationInfo;
  dietary: DietaryPassInfo;
  phrases: FieldPhrase[];
  emergency: EmergencyContacts;
  downloadedAt: string | null;
};

// Preset database for destination languages, emergency numbers & KBRI
type DestinationProfile = {
  country: string;
  flag: string;
  langTag: string;
  emergency: EmergencyContacts;
  samplePhrases: {
    bill: { local: string; rom: string };
    toilet: { local: string; rom: string };
    takeMeHere: { local: string; rom: string };
    help: { local: string; rom: string };
  };
  dietaryTemplates: {
    halal: (count: number) => string;
    vegetarian: (count: number) => string;
    nutAllergy: (count: number) => string;
    seafoodAllergy: (count: number) => string;
    generalSafe: (count: number, restrictions: string) => string;
  };
};

const DESTINATION_PROFILES: Record<string, DestinationProfile> = {
  japan: {
    country: "Jepang",
    flag: "🇯🇵",
    langTag: "ja-JP",
    emergency: {
      police: "110",
      ambulance: "119",
      embassyName: "KBRI Tokyo",
      embassyPhone: "+81-3-3441-4201",
      embassyAddress: "5-2-9 Higashi-Gotanda, Shinagawa-ku, Tokyo 141-0022",
    },
    samplePhrases: {
      bill: { local: "お会計をお願いします。", rom: "O-kaikei o onegaishimasu." },
      toilet: { local: "お手洗いはどこですか？", rom: "O-tearai wa doko desu ka?" },
      takeMeHere: { local: "ここへ連れて行ってください。", rom: "Koko e tsurete itte kudasai." },
      help: { local: "すみません、助けてください！", rom: "Sumimasen, tasukete kudasai!" },
    },
    dietaryTemplates: {
      halal: (count) =>
        `私たちは${count}人です。宗教上の理由により、豚肉・豚肉エキス・アルコール（みりんや料理酒を含む）を食べられません。これらが入っていない料理を教えていただけますか？`,
      vegetarian: (count) =>
        `私たちは${count}人で、ベジタリアンです。肉、魚、出汁（ダシ）を含む動物性の食材は一切食べられません。野菜のみの料理はありますか？`,
      nutAllergy: (count) =>
        `私たちは${count}人です。重度のナッツアレルギー（ピーナッツ、落花生、ナッツ類全般）があります。ピーナッツ油や微量の混入も避けていただけますか？`,
      seafoodAllergy: (count) =>
        `私たちは${count}人です。甲殻類・魚介類のアレルギーがあります。エビ、カニ、魚だしを使わない料理をお願いできますか？`,
      generalSafe: (count, res) =>
        `私たちは${count}人です。次の食事制限（${res}）があります。該当する食材を使用していないか、ご確認いただけますでしょうか？`,
    },
  },

  korea: {
    country: "Korea Selatan",
    flag: "🇰🇷",
    langTag: "ko-KR",
    emergency: {
      police: "112",
      ambulance: "119",
      embassyName: "KBRI Seoul",
      embassyPhone: "+82-2-783-5675",
      embassyAddress: "380 Yeouidaebang-ro, Yeongdeungpo-gu, Seoul 07342",
    },
    samplePhrases: {
      bill: { local: "계산해 주세요.", rom: "Gyesanhae juseyo." },
      toilet: { local: "화장실이 어디예요?", rom: "Hwajangshil-i eodiyeyo?" },
      takeMeHere: { local: "이 주소로 가주세요.", rom: "I juso-ro gajuseyo." },
      help: { local: "도와주세요!", rom: "Dowajuseyo!" },
    },
    dietaryTemplates: {
      halal: (count) =>
        `저희는 ${count}명입니다. 돼지고기와 알코올을 먹을 수 없습니다 (할랄). 돼지고기나 돈골 육수가 들어가지 않은 메뉴를 부탁드립니다.`,
      vegetarian: (count) =>
        `저희는 ${count}명이며, 채식주의자(비건/베지테리언)입니다. 고기, 생선, 멸치 육수 등이 들어가지 않은 음식을 부탁드립니다.`,
      nutAllergy: (count) =>
        `저희는 ${count}명입니다. 심한 견과류(땅콩) 알레르기가 있습니다. 땅콩 기름이나 견과류 가루가 들어가지 않도록 주의 부탁드립니다.`,
      seafoodAllergy: (count) =>
        `저희는 ${count}명입니다. 해산물(새우, 게, 조개) 알레르기가 있습니다. 해산물 성분이 들어가지 않은 요리를 부탁드립니다.`,
      generalSafe: (count, res) =>
        `저희는 ${count}명입니다. 식이 제한(${res})이 있습니다. 이 성분이 들어가지 않았는지 확인 부탁드립니다.`,
    },
  },

  thailand: {
    country: "Thailand",
    flag: "🇹🇭",
    langTag: "th-TH",
    emergency: {
      police: "191",
      ambulance: "1669",
      embassyName: "KBRI Bangkok",
      embassyPhone: "+66-2-252-3135",
      embassyAddress: "600-602 Petchburi Road, Ratchathewi, Bangkok 10400",
    },
    samplePhrases: {
      bill: { local: "เช็คบิลด้วยครับ/ค่ะ", rom: "Check bill duay khrap/kha." },
      toilet: { local: "ห้องน้ำอยู่ที่ไหนครับ/ค่ะ?", rom: "Hong nam yoo tee nai khrap/kha?" },
      takeMeHere: { local: "ช่วยไปที่นี่หน่อยครับ/ค่ะ", rom: "Chuay pai tee nee noi khrap/kha." },
      help: { local: "ช่วยด้วยครับ/ค่ะ!", rom: "Chuay duay khrap/kha!" },
    },
    dietaryTemplates: {
      halal: (count) =>
        `พวกเรามากัน ${count} คน ทานหมู น้ำมันหมู และแอลกอฮอล์ไม่ได้ (อาหารฮาลาล) รบกวนแนะนำเมนูที่ไม่มีหมูด้วยครับ/ค่ะ`,
      vegetarian: (count) =>
        `พวกเรา ${count} คน ทานเจ/มังสวิรัติ ไม่ทานเนื้อสัตว์ทุกชนิด น้ำปลา หรือส่วนผสมจากสัตว์ครับ/ค่ะ`,
      nutAllergy: (count) =>
        `พวกเรา ${count} คน แพ้ถั่วลิสงอย่างรุนแรง กรุณาอย่าใส่ถั่ว น้ำมันถั่ว หรือโรยถั่วป่นในอาหารเด็ดขาดครับ/ค่ะ`,
      seafoodAllergy: (count) =>
        `พวกเรา ${count} คน แพ้อาหารทะเล (กุ้ง หอย ปู) กรุณาอย่าใส่ของทะเลและน้ำปลาครับ/ค่ะ`,
      generalSafe: (count, res) =>
        `พวกเรา ${count} คน มีข้อจำกัดด้านอาหาร (${res}) รบกวนตรวจสอบส่วนผสมให้ด้วยครับ/ค่ะ`,
    },
  },

  singapore: {
    country: "Singapura",
    flag: "🇸🇬",
    langTag: "en-SG",
    emergency: {
      police: "999",
      ambulance: "995",
      embassyName: "KBRI Singapura",
      embassyPhone: "+65-6737-7422",
      embassyAddress: "7 Chatsworth Road, Singapore 249761",
    },
    samplePhrases: {
      bill: { local: "Can I get the bill, please?", rom: "Can I get the bill, please?" },
      toilet: { local: "Where is the restroom?", rom: "Where is the restroom?" },
      takeMeHere: { local: "Please take me to this address.", rom: "Please take me to this address." },
      help: { local: "Excuse me, I need emergency assistance!", rom: "Excuse me, I need emergency assistance!" },
    },
    dietaryTemplates: {
      halal: (count) =>
        `We are a group of ${count}. We only consume Halal food (strictly no pork, lard, or alcohol). Please recommend suitable dishes.`,
      vegetarian: (count) =>
        `We are a group of ${count} vegetarians. Strictly no meat, seafood, or animal stock.`,
      nutAllergy: (count) =>
        `We are a group of ${count}. Severe peanut and tree nut allergy! Please ensure zero nuts and no peanut oil.`,
      seafoodAllergy: (count) =>
        `We are a group of ${count} with severe seafood & crustacean allergy.`,
      generalSafe: (count, res) =>
        `We are a group of ${count} with dietary restrictions: ${res}. Please confirm dishes without these ingredients.`,
    },
  },

  malaysia: {
    country: "Malaysia",
    flag: "🇲🇾",
    langTag: "ms-MY",
    emergency: {
      police: "999",
      ambulance: "999",
      embassyName: "KBRI Kuala Lumpur",
      embassyPhone: "+60-3-2116-4011",
      embassyAddress: "No. 233, Jalan Tun Razak, 50400 Kuala Lumpur",
    },
    samplePhrases: {
      bill: { local: "Boleh minta bil / kira?", rom: "Boleh minta bil / kira?" },
      toilet: { local: "Tandas di mana ya?", rom: "Tandas di mana ya?" },
      takeMeHere: { local: "Tolong hantar saya ke alamat ini.", rom: "Tolong hantar saya ke alamat ini." },
      help: { local: "Tolong, kami perlukan bantuan kecemasan!", rom: "Tolong, kami perlukan bantuan kecemasan!" },
    },
    dietaryTemplates: {
      halal: (count) =>
        `Kami rombongan ${count} orang. Kami hanya makan makanan Halal (tiada daging babi, minyak babi, atau alkohol).`,
      vegetarian: (count) =>
        `Kami ${count} orang vegetarian. Tidak makan daging, ayam, atau makanan laut.`,
      nutAllergy: (count) =>
        `Kami ${count} orang ada alahan kacang tanah yang teruk. Mohon jangan letak sebarang kacang atau minyak kacang.`,
      seafoodAllergy: (count) =>
        `Kami ${count} orang ada alahan makanan laut (udang, ketam, sotong).`,
      generalSafe: (count, res) =>
        `Kami ${count} orang ada pantangan makan: ${res}. Mohon pastikan tiada bahan tersebut.`,
    },
  },

  france: {
    country: "Prancis",
    flag: "🇫🇷",
    langTag: "fr-FR",
    emergency: {
      police: "17",
      ambulance: "15",
      embassyName: "KBRI Paris",
      embassyPhone: "+33-1-45-03-07-60",
      embassyAddress: "47-49 Rue Cortambert, 75116 Paris",
    },
    samplePhrases: {
      bill: { local: "L'addition, s'il vous plaît.", rom: "L'addition, s'il vous plaît." },
      toilet: { local: "Où sont les toilettes, s'il vous plaît ?", rom: "Où sont les toilettes, s'il vous plaît ?" },
      takeMeHere: { local: "Pouvez-vous m'emmener à cette adresse ?", rom: "Pouvez-vous m'emmener à cette adresse ?" },
      help: { local: "Au secours ! Aidez-moi, s'il vous plaît !", rom: "Au secours ! Aidez-moi, s'il vous plaît !" },
    },
    dietaryTemplates: {
      halal: (count) =>
        `Nous sommes ${count} personnes. Nous ne consommons ni porc ni alcool (régime Halal). Pourriez-vous nous indiquer des plats appropriés ?`,
      vegetarian: (count) =>
        `Nous sommes ${count} personnes et nous sommes végétariens. Pas de viande ni de poisson, s'il vous plaît.`,
      nutAllergy: (count) =>
        `Nous sommes ${count} personnes avec une allergie sévère aux arachides et aux fruits à coque. Merci de vérifier la composition.`,
      seafoodAllergy: (count) =>
        `Nous sommes ${count} personnes avec une allergie aux fruits de mer et crustacés.`,
      generalSafe: (count, res) =>
        `Nous sommes ${count} personnes avec des restrictions alimentaires : ${res}. Merci de vérifier qu'aucun plat n'en contienne.`,
    },
  },

  default: {
    country: "Destinasi Internasional",
    flag: "🌐",
    langTag: "en-US",
    emergency: {
      police: "112",
      ambulance: "112",
      embassyName: "Perwakilan RI / Kemlu Hotline",
      embassyPhone: "+62-812-9007-007",
      embassyAddress: "Portal Peduli WNI: peduliwni.kemlu.go.id",
    },
    samplePhrases: {
      bill: { local: "Could we have the bill, please?", rom: "Could we have the bill, please?" },
      toilet: { local: "Where is the restroom / toilet?", rom: "Where is the restroom / toilet?" },
      takeMeHere: { local: "Please take me to this address.", rom: "Please take me to this address." },
      help: { local: "Excuse me, I need emergency assistance!", rom: "Excuse me, I need emergency assistance!" },
    },
    dietaryTemplates: {
      halal: (count) =>
        `We are a group of ${count}. We strictly do not consume pork, lard, or alcohol (Halal dietary requirements). Could you please recommend suitable dishes?`,
      vegetarian: (count) =>
        `We are a party of ${count} vegetarians. We cannot eat meat, poultry, seafood, or animal broth.`,
      nutAllergy: (count) =>
        `We are a group of ${count} with severe peanut and tree nut allergies. Please ensure zero peanuts, nuts, or nut oils are used in our food.`,
      seafoodAllergy: (count) =>
        `We are a group of ${count} with severe seafood/shellfish allergies. Please ensure no shrimp, crab, or fish sauce.`,
      generalSafe: (count, res) =>
        `We are a party of ${count} with dietary restrictions: ${res}. Please confirm dishes free from these ingredients.`,
    },
  },
};

export function detectDestinationProfile(destination: string): DestinationProfile {
  const d = (destination || "").toLowerCase().trim();
  if (
    d.includes("japan") ||
    d.includes("jepang") ||
    d.includes("tokyo") ||
    d.includes("osaka") ||
    d.includes("kyoto") ||
    d.includes("sapporo") ||
    d.includes("fukuoka") ||
    d.includes("hokkaido") ||
    d.includes("okinawa") ||
    d.includes("nagoya") ||
    d.includes("hiroshima")
  ) {
    return DESTINATION_PROFILES.japan;
  }

  if (
    d.includes("korea") ||
    d.includes("seoul") ||
    d.includes("busan") ||
    d.includes("jeju") ||
    d.includes("incheon")
  ) {
    return DESTINATION_PROFILES.korea;
  }

  if (
    d.includes("thai") ||
    d.includes("bangkok") ||
    d.includes("phuket") ||
    d.includes("chiang mai") ||
    d.includes("krabi") ||
    d.includes("pattaya")
  ) {
    return DESTINATION_PROFILES.thailand;
  }

  if (d.includes("singapore") || d.includes("singapura")) {
    return DESTINATION_PROFILES.singapore;
  }

  if (d.includes("malaysia") || d.includes("kuala lumpur") || d.includes("penang") || d.includes("johor")) {
    return DESTINATION_PROFILES.malaysia;
  }

  if (d.includes("france") || d.includes("prancis") || d.includes("paris") || d.includes("nice") || d.includes("lyon")) {
    return DESTINATION_PROFILES.france;
  }

  return DESTINATION_PROFILES.default;
}

const FIELD_PASS_KEY_PREFIX = "kancara-field-pass:";

/**
 * Builds the complete FieldPassData from the trip card, draft, and locale.
 */
export function buildFieldPassData(
  tripId: string,
  tripName: string,
  destination: string,
  memberCount: number,
  needs: string[],
  customNeeds: string[],
  lodgingText?: string,
): FieldPassData {
  const profile = detectDestinationProfile(destination);
  const count = Math.max(1, memberCount);

  // Extract dietary restrictions
  const allNeeds = [...needs, ...customNeeds].map((n) => n.toLowerCase());
  const hasHalal = allNeeds.some((n) => n.includes("halal") || n.includes("muslim"));
  const hasNutAllergy = allNeeds.some((n) => n.includes("nut") || n.includes("kacang") || n.includes("allergy"));
  const hasVeg = allNeeds.some((n) => n.includes("veg") || n.includes("vegan"));
  const hasSeafood = allNeeds.some((n) => n.includes("seafood") || n.includes("udang") || n.includes("fish"));

  const dietBadges: string[] = [];
  let localScriptText = "";
  let explanationId = "";
  let explanationEn = "";

  if (hasNutAllergy) {
    dietBadges.push("🚫 Alergi Kacang (Nut Allergy)");
    localScriptText = profile.dietaryTemplates.nutAllergy(count);
    explanationId = `Rombongan ${count} orang memiliki alergi kacang parah. Bebas kacang dan minyak kacang.`;
    explanationEn = `Party of ${count} has severe peanut/nut allergy.`;
  } else if (hasHalal) {
    dietBadges.push("🕌 Halal (No Pork / No Alcohol)");
    localScriptText = profile.dietaryTemplates.halal(count);
    explanationId = `Rombongan ${count} orang hanya makan makanan Halal (tanpa babi & alkohol).`;
    explanationEn = `Party of ${count} strictly consumes Halal food (no pork, no alcohol).`;
  } else if (hasVeg) {
    dietBadges.push("🥗 Vegetarian / Vegan");
    localScriptText = profile.dietaryTemplates.vegetarian(count);
    explanationId = `Rombongan ${count} orang adalah vegetarian (tanpa daging & kaldu hewani).`;
    explanationEn = `Party of ${count} are vegetarians (no meat or animal stock).`;
  } else if (hasSeafood) {
    dietBadges.push("🦐 Alergi Seafood");
    localScriptText = profile.dietaryTemplates.seafoodAllergy(count);
    explanationId = `Rombongan ${count} orang memiliki alergi makanan laut & udang.`;
    explanationEn = `Party of ${count} has severe seafood allergy.`;
  } else if (allNeeds.length > 0) {
    dietBadges.push(`⚠️ Pantangan: ${allNeeds.join(", ")}`);
    localScriptText = profile.dietaryTemplates.generalSafe(count, allNeeds.join(", "));
    explanationId = `Rombongan ${count} orang dengan pantangan khusus: ${allNeeds.join(", ")}`;
    explanationEn = `Party of ${count} with special dietary requirements: ${allNeeds.join(", ")}`;
  } else {
    dietBadges.push("✅ Makanan Aman & Umum");
    localScriptText = profile.dietaryTemplates.generalSafe(count, "makanan umum higienis");
    explanationId = `Rombongan ${count} orang tanpa pantangan diet khusus.`;
    explanationEn = `Party of ${count} with no strict dietary restrictions.`;
  }

  // Accommodation
  const hotelName = lodgingText?.trim() || `${destination} Central Hotel`;
  const hotelAddress = `${destination} Downtown Area`;

  // Phrases
  const phrases: FieldPhrase[] = [
    {
      id: "bill",
      category: "dining",
      labelId: "Minta Bon / Tagihan",
      labelEn: "Ask for the Bill",
      localText: profile.samplePhrases.bill.local,
      romanized: profile.samplePhrases.bill.rom,
      langTag: profile.langTag,
    },
    {
      id: "toilet",
      category: "directions",
      labelId: "Di mana toilet?",
      labelEn: "Where is the toilet?",
      localText: profile.samplePhrases.toilet.local,
      romanized: profile.samplePhrases.toilet.rom,
      langTag: profile.langTag,
    },
    {
      id: "address",
      category: "transport",
      labelId: "Tolong antar ke sini",
      labelEn: "Take me to this address",
      localText: profile.samplePhrases.takeMeHere.local,
      romanized: profile.samplePhrases.takeMeHere.rom,
      langTag: profile.langTag,
    },
    {
      id: "help",
      category: "emergency",
      labelId: "Tolong kami (Darurat)!",
      labelEn: "Emergency Assistance!",
      localText: profile.samplePhrases.help.local,
      romanized: profile.samplePhrases.help.rom,
      langTag: profile.langTag,
    },
  ];

  return {
    tripId,
    tripName: tripName || `Trip to ${destination}`,
    destination,
    destinationFlag: profile.flag,
    countryName: profile.country,
    langTag: profile.langTag,
    accommodation: {
      name: hotelName,
      address: hotelAddress,
      langTag: profile.langTag,
    },
    dietary: {
      memberCount: count,
      dietBadges,
      localScriptText,
      explanationId,
      explanationEn,
      langTag: profile.langTag,
    },
    phrases,
    emergency: profile.emergency,
    downloadedAt: null,
  };
}

/**
 * Saves the FieldPassData into localStorage and triggers offline caching of key URLs.
 */
export async function saveFieldPassOffline(tripId: string, passData: FieldPassData): Promise<boolean> {
  try {
    const updated = {
      ...passData,
      downloadedAt: new Date().toISOString(),
    };
    localStorage.setItem(FIELD_PASS_KEY_PREFIX + tripId, JSON.stringify(updated));

    // Also warm the CacheStorage if available
    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const cache = await caches.open("kancara-offline-2-data");
        const urlsToCache = [
          `/api/trips/${encodeURIComponent(tripId)}/plan`,
          `/trips/${encodeURIComponent(tripId)}`,
          `/trips/${encodeURIComponent(tripId)}/dietary-scan`,
          `/trips/${encodeURIComponent(tripId)}/translator`,
          `/trips/${encodeURIComponent(tripId)}/packing`,
        ];
        await Promise.all(
          urlsToCache.map((url) =>
            fetch(url)
              .then((res) => {
                if (res.ok) cache.put(url, res.clone());
              })
              .catch(() => undefined),
          ),
        );
      } catch {
        // Cache warming is best-effort
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Reads back the saved FieldPassData from localStorage.
 */
export function getSavedFieldPassOffline(tripId: string): FieldPassData | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(FIELD_PASS_KEY_PREFIX + tripId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Checks if this trip is already downloaded for offline use.
 */
export function isFieldPassDownloaded(tripId: string): boolean {
  return getSavedFieldPassOffline(tripId) !== null;
}

/**
 * Removes the offline field pass.
 */
export function removeFieldPassOffline(tripId: string) {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(FIELD_PASS_KEY_PREFIX + tripId);
  } catch {
    // No-op
  }
}

/**
 * Plays speech audio offline via the browser's native SpeechSynthesis API.
 */
export function playOfflineVoice(text: string, langTag: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langTag;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
