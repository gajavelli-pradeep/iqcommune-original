/**
 * Where sessions happen: the cities worth suggesting, and every Indian state.
 *
 * These are suggestions, not a closed set. Both forms offer them through a
 * datalist, so a practitioner in a town that is on nobody's tier list can still
 * type it — which matters, because the network is meant to reach beyond the
 * places a list like this remembers.
 *
 * Tier 1 and tier 2 are kept apart rather than flattened into one array. Which
 * tier a city sits in is a real fact about it — the classification behind
 * India's HRA city grades, X and Y — and matching or pricing may want to read it
 * later. Joining them for the picker costs one line; separating them again
 * afterwards would cost a judgement call per city.
 *
 * Each city is paired with its state here, not kept as a bare name — the form's
 * City field uses that pairing to fill State automatically once a listed city is
 * chosen (client, 2026-08-18), and a mapping kept next to the names it describes
 * cannot drift out of step with them the way two parallel lists could.
 */

interface CityEntry {
  name: string;
  state: string;
}

/** The eight X-grade metros. */
const TIER_1: readonly CityEntry[] = [
  { name: "Ahmedabad", state: "Gujarat" },
  { name: "Bengaluru", state: "Karnataka" },
  { name: "Chennai", state: "Tamil Nadu" },
  // "Delhi NCR" rather than the bare union territory name: the client's own
  // list names it this way, and NCR's satellite towns — Noida, Gurugram,
  // Faridabad — stay as their own tier-2 entries below rather than folding
  // into it, so someone typing one of those still finds it.
  { name: "Delhi NCR", state: "Delhi" },
  { name: "Hyderabad", state: "Telangana" },
  { name: "Kolkata", state: "West Bengal" },
  { name: "Mumbai", state: "Maharashtra" },
  { name: "Pune", state: "Maharashtra" },
];

/**
 * Y-grade cities.
 *
 * Client's final list (2026-08-18, "First Set of Cities.xlsx") — 72 cities,
 * replacing the earlier 96. Names and states are the client's own spelling,
 * including the older names some cities are still searched by (e.g.
 * "Belagavi (Belgaum)"), not a broader HRA reference list.
 */
const TIER_2: readonly CityEntry[] = [
  { name: "Agra", state: "Uttar Pradesh" },
  { name: "Ajmer", state: "Rajasthan" },
  { name: "Amritsar", state: "Punjab" },
  { name: "Asansol", state: "West Bengal" },
  { name: "Aurangabad", state: "Maharashtra" },
  { name: "Belagavi (Belgaum)", state: "Karnataka" },
  { name: "Bhavnagar", state: "Gujarat" },
  { name: "Bhopal", state: "Madhya Pradesh" },
  { name: "Bhubaneswar", state: "Odisha" },
  { name: "Bikaner", state: "Rajasthan" },
  { name: "Bilaspur", state: "Chhattisgarh" },
  { name: "Chandigarh", state: "Chandigarh" },
  { name: "Coimbatore", state: "Tamil Nadu" },
  { name: "Cuttack", state: "Odisha" },
  { name: "Dehradun", state: "Uttarakhand" },
  { name: "Dhanbad", state: "Jharkhand" },
  { name: "Durgapur", state: "West Bengal" },
  { name: "Erode", state: "Tamil Nadu" },
  { name: "Faridabad", state: "Haryana" },
  { name: "Ghaziabad", state: "Uttar Pradesh" },
  { name: "Kalaburagi (Gulbarga)", state: "Karnataka" },
  { name: "Guntur", state: "Andhra Pradesh" },
  { name: "Gurugram", state: "Haryana" },
  { name: "Guwahati", state: "Assam" },
  { name: "Gwalior", state: "Madhya Pradesh" },
  { name: "Hubli-Dharwad", state: "Karnataka" },
  { name: "Indore", state: "Madhya Pradesh" },
  { name: "Jaipur", state: "Rajasthan" },
  { name: "Jalandhar", state: "Punjab" },
  { name: "Jamnagar", state: "Gujarat" },
  { name: "Jamshedpur", state: "Jharkhand" },
  { name: "Jodhpur", state: "Rajasthan" },
  { name: "Kakinada", state: "Andhra Pradesh" },
  { name: "Kanpur", state: "Uttar Pradesh" },
  { name: "Kochi", state: "Kerala" },
  { name: "Kota", state: "Rajasthan" },
  { name: "Kozhikode", state: "Kerala" },
  { name: "Kurnool", state: "Andhra Pradesh" },
  { name: "Ludhiana", state: "Punjab" },
  { name: "Lucknow", state: "Uttar Pradesh" },
  { name: "Madurai", state: "Tamil Nadu" },
  { name: "Malappuram", state: "Kerala" },
  { name: "Mangalore", state: "Karnataka" },
  { name: "Meerut", state: "Uttar Pradesh" },
  { name: "Mysuru", state: "Karnataka" },
  { name: "Nagpur", state: "Maharashtra" },
  { name: "Navi Mumbai", state: "Maharashtra" },
  { name: "Nellore", state: "Andhra Pradesh" },
  { name: "Noida", state: "Uttar Pradesh" },
  { name: "Patna", state: "Bihar" },
  { name: "Prayagraj (Allahabad)", state: "Uttar Pradesh" },
  { name: "Puducherry", state: "Puducherry" },
  { name: "Raipur", state: "Chhattisgarh" },
  { name: "Rajahmundry", state: "Andhra Pradesh" },
  { name: "Rajkot", state: "Gujarat" },
  { name: "Ranchi", state: "Jharkhand" },
  { name: "Rourkela", state: "Odisha" },
  { name: "Salem", state: "Tamil Nadu" },
  { name: "Shimla", state: "Himachal Pradesh" },
  { name: "Surat", state: "Gujarat" },
  { name: "Thanjavur", state: "Tamil Nadu" },
  { name: "Thiruvananthapuram", state: "Kerala" },
  { name: "Thrissur", state: "Kerala" },
  { name: "Tiruchirappalli", state: "Tamil Nadu" },
  { name: "Tirupati", state: "Andhra Pradesh" },
  { name: "Udaipur", state: "Rajasthan" },
  { name: "Vadodara", state: "Gujarat" },
  { name: "Varanasi", state: "Uttar Pradesh" },
  { name: "Vellore", state: "Tamil Nadu" },
  { name: "Vijayawada", state: "Andhra Pradesh" },
  { name: "Visakhapatnam", state: "Andhra Pradesh" },
  { name: "Warangal", state: "Telangana" },
];

/** The tier-1 city names, metros first — for the picker and the HRA grade. */
export const TIER_1_CITIES: readonly string[] = TIER_1.map((city) => city.name);

/** The tier-2 city names — for the picker and the HRA grade. */
export const TIER_2_CITIES: readonly string[] = TIER_2.map((city) => city.name);

/**
 * What the city picker offers, metros first.
 *
 * Not sorted into one alphabetical run: the eight metros cover most of what
 * gets typed here, and a datalist shows its options in document order until the
 * first keystroke narrows them.
 */
export const CITIES: readonly string[] = [...TIER_1_CITIES, ...TIER_2_CITIES];

/**
 * City name → its state, for the form's autofill. Built from the same list the
 * picker offers, so a city the datalist suggests always has an answer here —
 * and a city typed in free-hand, not being one of these, correctly has none.
 */
export const CITY_STATE: Readonly<Record<string, string>> = Object.fromEntries(
  [...TIER_1, ...TIER_2].map((city) => [city.name, city.state]),
);

/**
 * The reverse of `CITY_STATE` — a state's listed cities, for the same autofill
 * the other direction (client, 2026-08-18): State picked first narrows City's
 * suggestions to the ones actually in it, rather than all 80. A state with no
 * entry (one of ours that no listed city happens to sit in, or a free-typed
 * one) leaves City offering everything, same as today.
 */
export const STATE_CITIES: Readonly<Record<string, readonly string[]>> = [...TIER_1, ...TIER_2].reduce<
  Record<string, string[]>
>((byState, city) => {
  (byState[city.state] ??= []).push(city.name);
  return byState;
}, {});

/** The 28 states and 8 union territories, as one list — a form asks for one answer. */
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // Union territories, after the states rather than interleaved: someone
  // scanning for their state should not have to step over Lakshadweep to reach
  // Madhya Pradesh.
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;
