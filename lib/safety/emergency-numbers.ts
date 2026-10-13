// National emergency numbers by country. They ship inside the app, so they are there without a connection and
// without anyone having filled them in. A country that is not listed falls back to 112, which mobile networks
// around the world pass on to the local emergency service.

export const EMERGENCY_SERVICES = ["general", "police", "ambulance", "fire", "tourist"] as const;
export type EmergencyService = (typeof EMERGENCY_SERVICES)[number];
export type EmergencyNumber = { service: EmergencyService; phone: string };

const one = (phone: string): EmergencyNumber[] => [{ service: "general", phone }];
const three = (police: string, ambulance: string, fire: string): EmergencyNumber[] => [
  { service: "police", phone: police },
  { service: "ambulance", phone: ambulance },
  { service: "fire", phone: fire },
];

// 112 reaches every emergency service in these countries, and is the only number most of them use.
const ONLY_112 = ["BG", "CY", "DK", "EE", "ES", "FI", "HR", "IE", "IS", "LT", "LU", "LV", "MT", "NL", "PT", "RO", "SE", "SI", "SK", "TR"];
/** 112 for everything, beside the direct lines a country also keeps for each service. */
const with112 = (police: string, ambulance: string, fire: string): EmergencyNumber[] => [...one("112"), ...three(police, ambulance, fire)];

const NUMBERS: Record<string, EmergencyNumber[]> = {
  ...Object.fromEntries(ONLY_112.map((code) => [code, one("112")])),
  AT: with112("133", "144", "122"),
  BE: [...one("112"), { service: "police", phone: "101" }],
  CH: with112("117", "144", "118"),
  CZ: with112("158", "155", "150"),
  DE: [...one("112"), { service: "police", phone: "110" }],
  FR: with112("17", "15", "18"),
  GR: with112("100", "166", "199"),
  HU: with112("107", "104", "105"),
  IT: with112("113", "118", "115"),
  NO: three("112", "113", "110"),
  PL: with112("997", "999", "998"),
  RU: with112("102", "103", "101"),
  GB: one("999"),
  ID: with112("110", "119", "113"),
  JP: three("110", "119", "119"),
  KR: [...three("112", "119", "119"), { service: "tourist", phone: "1330" }],
  CN: three("110", "120", "119"),
  TW: three("110", "119", "119"),
  HK: one("999"),
  MO: one("999"),
  SG: three("999", "995", "995"),
  MY: one("999"),
  TH: [...three("191", "1669", "199"), { service: "tourist", phone: "1155" }],
  VN: three("113", "115", "114"),
  KH: three("117", "119", "118"),
  PH: one("911"),
  IN: with112("100", "108", "101"),
  LK: three("119", "110", "110"),
  NP: three("100", "102", "101"),
  BD: one("999"),
  AU: one("000"),
  NZ: one("111"),
  US: one("911"),
  CA: one("911"),
  MX: one("911"),
  BR: three("190", "192", "193"),
  AR: three("911", "107", "100"),
  CL: three("133", "131", "132"),
  CO: one("123"),
  PE: three("105", "106", "116"),
  SA: [...one("911"), ...three("999", "997", "998")],
  AE: three("999", "998", "997"),
  QA: one("999"),
  BH: one("999"),
  KW: one("112"),
  JO: one("911"),
  IL: three("100", "101", "102"),
  EG: three("122", "123", "180"),
  ZA: [...one("112"), { service: "police", phone: "10111" }, { service: "ambulance", phone: "10177" }],
  KE: one("999"),
};

const WORLDWIDE = one("112");

/** The numbers to call in the countries a trip visits, each country once, in the order the trip lists them. */
export function emergencyNumbers(countryCodes: string[]): { countryCode: string | null; numbers: EmergencyNumber[] }[] {
  const listed = [...new Set(countryCodes.map((code) => code.toUpperCase()))];
  const known = listed.filter((code) => NUMBERS[code]).map((code) => ({ countryCode: code, numbers: NUMBERS[code] }));
  // Somewhere the list does not cover still gets the number that works almost everywhere.
  return known.length === listed.length && known.length > 0 ? known : [...known, { countryCode: null, numbers: WORLDWIDE }];
}
