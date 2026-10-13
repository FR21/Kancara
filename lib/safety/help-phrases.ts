// The sentences on a meeting card and on the finder's page, in the language of the place the trip visits. They
// are written here, not translated on the fly, so a card can be made without a connection and reads the same
// every time. {name} is the member's nickname.

export type HelpPhrases = {
  /** The language's own name, shown on the finder's page where the reader picks one. */
  language: string;
  /** Printed large on the card. */
  ask: string;
  /** Under it: what to do. */
  call: string;
  scan: string;
  /** The finder's page. */
  finderTitle: string;
  finderLead: string;
  /** Where the plan has the group at the moment the card is scanned. */
  groupAt: string;
  withThem: string;
  shareLocation: string;
  callLead: string;
  callSecond: string;
  thanks: string;
  expired: string;
};

export const HELP_LANGUAGES = ["en", "id", "ja", "ko", "zh", "th", "vi", "ms", "ar", "fr", "de", "es"] as const;
export type HelpLanguage = (typeof HELP_LANGUAGES)[number];

export const HELP_PHRASES: Record<HelpLanguage, HelpPhrases> = {
  en: {
    language: "English",
    ask: "I am separated from my group. Please help me.",
    call: "Please call this number:",
    scan: "Or scan this code to tell my group where I am.",
    finderTitle: "{name} is separated from their group",
    finderLead: "Thank you for stopping. One tap tells the group that {name} is safe with you.",
    groupAt: "The group is planned to be at {place}.",
    withThem: "I am with {name}",
    shareLocation: "Also send my location, once",
    callLead: "Call the group leader",
    callSecond: "Call the second number",
    thanks: "The group has been told. Please stay with {name} until someone arrives or calls.",
    expired: "This card is no longer in use.",
  },
  id: {
    language: "Bahasa Indonesia",
    ask: "Saya terpisah dari rombongan. Tolong bantu saya.",
    call: "Tolong hubungi nomor ini:",
    scan: "Atau pindai kode ini untuk memberi tahu rombongan saya.",
    finderTitle: "{name} terpisah dari rombongannya",
    finderLead: "Terima kasih sudah berhenti. Satu ketukan memberi tahu rombongan bahwa {name} aman bersama Anda.",
    groupAt: "Menurut rencana, rombongan sedang berada di {place}.",
    withThem: "Saya bersama {name}",
    shareLocation: "Kirim juga lokasi saya, satu kali",
    callLead: "Telepon ketua rombongan",
    callSecond: "Telepon nomor kedua",
    thanks: "Rombongan sudah diberi tahu. Mohon temani {name} sampai ada yang datang atau menelepon.",
    expired: "Kartu ini sudah tidak dipakai.",
  },
  ja: {
    language: "日本語",
    ask: "グループとはぐれてしまいました。助けてください。",
    call: "この番号に電話してください：",
    scan: "または、このコードを読み取ってグループに知らせてください。",
    // The zero-width spaces mark where the line may break; the page then keeps every other pair of characters
    // together, so the verb is never split after its first character.
    finderTitle: "{name}さんが\u200bグループと\u200bはぐれています",
    finderLead: "お立ち寄りいただきありがとうございます。ボタンを押すと、{name}さんがあなたと一緒にいて無事だとグループに伝わります。",
    groupAt: "予定では、グループは今 {place} にいます。",
    withThem: "{name}さんと一緒にいます",
    shareLocation: "現在地も一度だけ送る",
    callLead: "グループのリーダーに電話する",
    callSecond: "もう一つの番号に電話する",
    thanks: "グループに連絡しました。迎えが来るか電話があるまで、{name}さんのそばにいてください。",
    expired: "このカードは現在使われていません。",
  },
  ko: {
    language: "한국어",
    ask: "일행과 떨어졌습니다. 도와주세요.",
    call: "이 번호로 전화해 주세요:",
    scan: "또는 이 코드를 스캔해 일행에게 알려 주세요.",
    finderTitle: "{name} 님이 일행과 떨어졌습니다",
    finderLead: "멈춰 주셔서 감사합니다. 버튼을 누르면 {name} 님이 당신과 함께 안전하게 있다고 일행에게 전달됩니다.",
    groupAt: "일정상 일행은 지금 {place}에 있습니다.",
    withThem: "{name} 님과 함께 있습니다",
    shareLocation: "제 위치도 한 번만 보내기",
    callLead: "일행 대표에게 전화하기",
    callSecond: "두 번째 번호로 전화하기",
    thanks: "일행에게 알렸습니다. 누군가 오거나 전화할 때까지 {name} 님 곁에 있어 주세요.",
    expired: "이 카드는 더 이상 사용되지 않습니다.",
  },
  zh: {
    language: "中文",
    ask: "我和同伴走散了，请帮帮我。",
    call: "请拨打这个号码：",
    scan: "或者扫描此二维码，告诉我的同伴我在哪里。",
    finderTitle: "{name} 和同伴走散了",
    finderLead: "感谢您停下来帮忙。点一下按钮，就能告诉同伴 {name} 和您在一起，很安全。",
    groupAt: "按计划，同伴现在应该在 {place}。",
    withThem: "我和 {name} 在一起",
    shareLocation: "同时发送一次我的位置",
    callLead: "给领队打电话",
    callSecond: "拨打第二个号码",
    thanks: "已通知同伴。在有人赶来或来电之前，请陪在 {name} 身边。",
    expired: "这张卡片已停止使用。",
  },
  th: {
    language: "ไทย",
    ask: "ฉันพลัดหลงกับกลุ่ม กรุณาช่วยฉันด้วย",
    call: "กรุณาโทรไปที่หมายเลขนี้:",
    scan: "หรือสแกนโค้ดนี้เพื่อแจ้งกลุ่มของฉัน",
    finderTitle: "{name} พลัดหลงกับกลุ่ม",
    finderLead: "ขอบคุณที่หยุดช่วย แตะปุ่มเดียวเพื่อแจ้งกลุ่มว่า {name} ปลอดภัยและอยู่กับคุณ",
    groupAt: "ตามแผน กลุ่มควรอยู่ที่ {place}",
    withThem: "ฉันอยู่กับ {name}",
    shareLocation: "ส่งตำแหน่งของฉันด้วย หนึ่งครั้ง",
    callLead: "โทรหาหัวหน้ากลุ่ม",
    callSecond: "โทรหมายเลขที่สอง",
    thanks: "แจ้งกลุ่มแล้ว กรุณาอยู่กับ {name} จนกว่าจะมีคนมาหรือโทรมา",
    expired: "บัตรนี้ไม่ได้ใช้งานแล้ว",
  },
  vi: {
    language: "Tiếng Việt",
    ask: "Tôi bị lạc đoàn. Xin hãy giúp tôi.",
    call: "Xin hãy gọi số này:",
    scan: "Hoặc quét mã này để báo cho đoàn của tôi.",
    finderTitle: "{name} bị lạc đoàn",
    finderLead: "Cảm ơn bạn đã dừng lại. Chỉ một lần chạm để báo cho đoàn rằng {name} đang an toàn bên bạn.",
    groupAt: "Theo kế hoạch, đoàn đang ở {place}.",
    withThem: "Tôi đang ở cùng {name}",
    shareLocation: "Gửi kèm vị trí của tôi, một lần",
    callLead: "Gọi trưởng đoàn",
    callSecond: "Gọi số thứ hai",
    thanks: "Đã báo cho đoàn. Xin hãy ở cùng {name} cho đến khi có người đến hoặc gọi.",
    expired: "Thẻ này không còn được dùng nữa.",
  },
  ms: {
    language: "Bahasa Melayu",
    ask: "Saya terpisah daripada kumpulan saya. Tolong bantu saya.",
    call: "Sila hubungi nombor ini:",
    scan: "Atau imbas kod ini untuk memberitahu kumpulan saya.",
    finderTitle: "{name} terpisah daripada kumpulannya",
    finderLead: "Terima kasih kerana berhenti. Satu ketikan memberitahu kumpulan bahawa {name} selamat bersama anda.",
    groupAt: "Mengikut rancangan, kumpulan berada di {place}.",
    withThem: "Saya bersama {name}",
    shareLocation: "Hantar juga lokasi saya, sekali sahaja",
    callLead: "Telefon ketua kumpulan",
    callSecond: "Telefon nombor kedua",
    thanks: "Kumpulan telah diberitahu. Sila temani {name} sehingga ada yang datang atau menelefon.",
    expired: "Kad ini tidak lagi digunakan.",
  },
  ar: {
    language: "العربية",
    ask: "لقد انفصلت عن مجموعتي. أرجو مساعدتي.",
    call: "يرجى الاتصال بهذا الرقم:",
    scan: "أو امسح هذا الرمز لإبلاغ مجموعتي بمكاني.",
    finderTitle: "{name} انفصل عن مجموعته",
    finderLead: "شكرًا لتوقفك. بضغطة واحدة تعلم المجموعة أن {name} بأمان معك.",
    groupAt: "وفق الخطة، المجموعة موجودة الآن في {place}.",
    withThem: "أنا مع {name}",
    shareLocation: "أرسل موقعي أيضًا، مرة واحدة",
    callLead: "اتصل بقائد المجموعة",
    callSecond: "اتصل بالرقم الثاني",
    thanks: "تم إبلاغ المجموعة. يرجى البقاء مع {name} حتى يصل أحد أو يتصل.",
    expired: "هذه البطاقة لم تعد مستخدمة.",
  },
  fr: {
    language: "Français",
    ask: "J'ai perdu mon groupe. Aidez-moi, s'il vous plaît.",
    call: "Merci d'appeler ce numéro :",
    scan: "Ou scannez ce code pour prévenir mon groupe.",
    finderTitle: "{name} a perdu son groupe",
    finderLead: "Merci de vous être arrêté. Un seul geste prévient le groupe que {name} est en sécurité avec vous.",
    groupAt: "D'après le programme, le groupe se trouve à {place}.",
    withThem: "Je suis avec {name}",
    shareLocation: "Envoyer aussi ma position, une seule fois",
    callLead: "Appeler le responsable du groupe",
    callSecond: "Appeler le second numéro",
    thanks: "Le groupe est prévenu. Merci de rester avec {name} jusqu'à ce que quelqu'un arrive ou appelle.",
    expired: "Cette carte n'est plus utilisée.",
  },
  de: {
    language: "Deutsch",
    ask: "Ich habe meine Gruppe verloren. Bitte helfen Sie mir.",
    call: "Bitte rufen Sie diese Nummer an:",
    scan: "Oder scannen Sie diesen Code, um meine Gruppe zu benachrichtigen.",
    finderTitle: "{name} hat die Gruppe verloren",
    finderLead: "Danke, dass Sie angehalten haben. Ein Tipp sagt der Gruppe, dass {name} bei Ihnen in Sicherheit ist.",
    groupAt: "Laut Plan ist die Gruppe gerade hier: {place}.",
    withThem: "Ich bin bei {name}",
    shareLocation: "Auch meinen Standort senden, einmalig",
    callLead: "Die Gruppenleitung anrufen",
    callSecond: "Die zweite Nummer anrufen",
    thanks: "Die Gruppe wurde benachrichtigt. Bitte bleiben Sie bei {name}, bis jemand kommt oder anruft.",
    expired: "Diese Karte wird nicht mehr verwendet.",
  },
  es: {
    language: "Español",
    ask: "Me he separado de mi grupo. Por favor, ayúdeme.",
    call: "Por favor, llame a este número:",
    scan: "O escanee este código para avisar a mi grupo.",
    finderTitle: "{name} se ha separado de su grupo",
    finderLead: "Gracias por detenerse. Con un toque avisa al grupo de que {name} está a salvo con usted.",
    groupAt: "Según el plan, el grupo está ahora en {place}.",
    withThem: "Estoy con {name}",
    shareLocation: "Enviar también mi ubicación, una sola vez",
    callLead: "Llamar al responsable del grupo",
    callSecond: "Llamar al segundo número",
    thanks: "El grupo ha sido avisado. Por favor, quédese con {name} hasta que alguien llegue o llame.",
    expired: "Esta tarjeta ya no está en uso.",
  },
};

const LANGUAGE_OF: Record<string, HelpLanguage> = {
  ID: "id", JP: "ja", KR: "ko", CN: "zh", TW: "zh", HK: "zh", MO: "zh", TH: "th", VN: "vi", MY: "ms", BN: "ms",
  SA: "ar", AE: "ar", EG: "ar", QA: "ar", FR: "fr", BE: "fr", DE: "de", AT: "de", CH: "de", ES: "es", MX: "es",
};

/**
 * The languages a card is written in: those of the countries the trip visits, then English, each once. A country
 * whose language is not written here is covered by English alone.
 */
export function helpLanguages(countryCodes: string[]): HelpLanguage[] {
  const local = countryCodes.flatMap((code) => LANGUAGE_OF[code.toUpperCase()] ?? []);
  return [...new Set<HelpLanguage>([...local, "en"])];
}

export function isHelpLanguage(value: unknown): value is HelpLanguage {
  return HELP_LANGUAGES.some((language) => language === value);
}
