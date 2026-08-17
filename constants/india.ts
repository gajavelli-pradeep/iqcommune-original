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
 */

/** The eight X-grade metros. */
export const TIER_1_CITIES = [
  "Ahmedabad",
  "Bengaluru",
  "Chennai",
  "Delhi",
  "Hyderabad",
  "Kolkata",
  "Mumbai",
  "Pune",
] as const;

/** Y-grade cities. */
export const TIER_2_CITIES = [
  "Agra", "Ajmer", "Aligarh", "Amravati", "Amritsar", "Asansol", "Aurangabad",
  "Bareilly", "Belagavi", "Bhavnagar", "Bhiwandi", "Bhilai", "Bhopal",
  "Bhubaneswar", "Bikaner", "Bilaspur", "Bokaro Steel City", "Chandigarh",
  "Coimbatore", "Cuttack", "Dehradun", "Dhanbad", "Durgapur", "Erode",
  "Faridabad", "Firozabad", "Ghaziabad", "Gorakhpur", "Guntur", "Gurugram",
  "Guwahati", "Gwalior", "Hubballi-Dharwad", "Indore", "Jabalpur", "Jaipur",
  "Jalandhar", "Jammu", "Jamnagar", "Jamshedpur", "Jhansi", "Jodhpur",
  "Kakinada", "Kalaburagi", "Kannur", "Kanpur", "Karnal", "Kochi", "Kolhapur",
  "Kollam", "Kota", "Kozhikode", "Kurnool", "Lucknow", "Ludhiana", "Madurai",
  "Malappuram", "Mangaluru", "Mathura", "Meerut", "Moradabad", "Mysuru",
  "Nagpur", "Nanded", "Nashik", "Nellore", "Noida", "Patna", "Prayagraj",
  "Puducherry", "Raipur", "Rajahmundry", "Rajkot", "Ranchi", "Ratlam",
  "Rourkela", "Salem", "Sangli", "Shimla", "Siliguri", "Solapur", "Srinagar",
  "Surat", "Thiruvananthapuram", "Thrissur", "Tiruchirappalli", "Tirunelveli",
  "Tiruppur", "Ujjain", "Vadodara", "Varanasi", "Vasai-Virar", "Vellore",
  "Vijayawada", "Visakhapatnam", "Warangal",
] as const;

/**
 * What the city picker offers, metros first.
 *
 * Not sorted into one alphabetical run: the eight metros cover most of what
 * gets typed here, and a datalist shows its options in document order until the
 * first keystroke narrows them.
 */
export const CITIES: readonly string[] = [...TIER_1_CITIES, ...TIER_2_CITIES];

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
