export const company = {
  legalName: "SAM'S Ltd.",
  businessName: "Sam's Mobile Cleaning Services",
  tagline: "Professional mobile car care at your location.",
  /** Registered office / mailing — not the service site (we come to you). */
  address: "64 Fair Lawn Road, GT",
  poBox: "PO Box 540 GT, KY1-1107",
  landLine: "949-4444",
  cell: "345 927-7227",
  email: "sam@samsmobile.ky",
  /** Public site (canonical + contact link). */
  websiteUrl: "https://samsmobile.ky",
  /** Cayman Islands WhatsApp (same as cell). E.164 digits without + for wa.me links. */
  whatsAppDigits: "13459277227",
} as const

/** Pre-filled WhatsApp message — customer adds their service address or drops a location pin in chat. */
export const whatsAppBookingMessage =
  "Hi Sam's Mobile Cleaning — I'd like a mobile wash. My service location (home / workplace / business) is:\n\n(You can attach a location pin from the menu in WhatsApp if that's easier.)"

export function whatsAppHref(message: string = whatsAppBookingMessage): string {
  return `https://wa.me/${company.whatsAppDigits}?text=${encodeURIComponent(message)}`
}

export const operators = [
  {
    id: "markland",
    name: "Markland Moore",
    role: "Car washer · Mobile unit",
    bio: "Markland Moore has been employed with Sam's Mobile Cleaning for the past seven years, where he works as a dedicated Car Washer. He is known for being a reliable, honest, and hardworking individual who takes pride in delivering high-quality service. Focused and professional, Markland consistently provides a positive experience for customers and is a valued member of the team.",
  },
  {
    id: "kevin",
    name: "Kevin Campbell",
    role: "Car washer · Mobile unit",
    bio: "Kevin Campbell has been with Sam's Mobile Cleaning for the past three years as a car washer. He's a reliable, honest, and hardworking guy who always puts in the effort to get the job done right. Friendly and easygoing, Kevin takes pride in his work and enjoys making sure every customer is happy with a clean car.",
  },
] as const

export type OperatorId = (typeof operators)[number]["id"]

export const priceTable = {
  headers: ["Small vehicles", "Medium vehicles", "Large vehicles"] as const,
  rows: [
    { name: "Interior deals", key: "interior" as const, values: [23, 28, 32] },
    { name: "Exterior deals", key: "exterior" as const, values: [23, 28, 32] },
    { name: "Wash & vacuum", key: "wash_vacuum" as const, values: [30, 35, 45] },
    {
      name: "Wax / polishing (add-on)",
      key: "wax" as const,
      values: [10, 15, 20],
      prefix: "+",
    },
    {
      name: "Engine bay cleaning (add-on)",
      key: "addon_engine_bay" as const,
      values: [10, 15, 20],
      prefix: "+",
    },
    {
      name: "Light stain removal (add-on)",
      key: "addon_light_stain" as const,
      values: [10, 10, 10],
      prefix: "+",
    },
    {
      name: "Light bug and tar removal (add-on)",
      key: "addon_light_bug_tar" as const,
      values: [10, 10, 10],
      prefix: "+",
    },
    {
      name: "Heavy tar, asphalt, or chemical staining (add-on)",
      key: "addon_heavy_tar" as const,
      values: [15, 15, 15],
      prefix: "+",
    },
    {
      name: "Mold, pet odor, or biohazard cleanup (add-on)",
      key: "addon_mold_biohazard" as const,
      values: [15, 15, 15],
      prefix: "+",
    },
  ],
  fullDetailingNote:
    "Full detailing ranges between $100.00 and $350.00 depending on the condition of the vehicle. We'll confirm the price after we assess your vehicle.",
} as const

/** Optional extras booked with a main package (not standalone). Order = line order in estimates. */
export const ADDON_SERVICE_KEYS = [
  "wax",
  "addon_engine_bay",
  "addon_light_stain",
  "addon_light_bug_tar",
  "addon_heavy_tar",
  "addon_mold_biohazard",
] as const

export type AddonServiceKey = (typeof ADDON_SERVICE_KEYS)[number]

export type ServiceKey =
  | "interior"
  | "exterior"
  | "wash_vacuum"
  | "full_detail"
  | AddonServiceKey

export type VehicleSize = "small" | "medium" | "large"

export const vehicleSizeLabels: Record<VehicleSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
}

export const serviceOptions: {
  key: "interior" | "exterior" | "wash_vacuum" | "full_detail"
  label: string
  description: string
}[] = [
  {
    key: "interior",
    label: "Interior deal",
    description: "Refresh the cabin—vacuuming, wipe-downs, glass, light stain work, and deodorizing.",
  },
  {
    key: "exterior",
    label: "Exterior deal",
    description: "Hand wash, wheels & tires, rinse and dry, windows, light bug/tar, door jambs.",
  },
  {
    key: "wash_vacuum",
    label: "Wash & vacuum",
    description: "Quick exterior wash plus interior vacuum—great for regular upkeep.",
  },
  {
    key: "full_detail",
    label: "Full detailing",
    description: "Deep interior and exterior service priced on inspection ($100–$350 range).",
  },
]

/** Labels and hints for booking toggles — keys match `ADDON_SERVICE_KEYS`. */
export const addonBookingOptions: {
  key: AddonServiceKey
  label: string
  hint: string
}[] = [
  {
    key: "wax",
    label: "Wax / polish",
    hint: "Extra protection and gloss on top of your selected wash package.",
  },
  {
    key: "addon_engine_bay",
    label: "Engine bay cleaning",
    hint: "Degrease and dress — safe products for your engine compartment.",
  },
  {
    key: "addon_light_stain",
    label: "Light stain removal",
    hint: "Spot treatment for minor interior stains.",
  },
  {
    key: "addon_light_bug_tar",
    label: "Light bug and tar removal",
    hint: "Extra bug and tar treatment beyond standard wash coverage.",
  },
  {
    key: "addon_heavy_tar",
    label: "Heavy tar, asphalt, or chemical staining",
    hint: "Extra decontamination when light bug/tar isn’t enough.",
  },
  {
    key: "addon_mold_biohazard",
    label: "Mold, pet odor, or biohazard cleanup",
    hint: "Special handling — we’ll confirm scope before work begins.",
  },
]

export const dealDetails = {
  interior: {
    title: "Interior vehicle wash",
    included: [
      "Vacuuming of seats, carpets, floor mats, and trunk",
      "Wipe down of interior surfaces including dashboard, center console, door panels, cup holders",
      "Cleaning of interior windows and mirrors",
      "Dust removal from vents and hard to reach areas like the roof and trunk space",
      "Interior deodorizing",
    ],
  },
  exterior: {
    title: "Exterior vehicle wash",
    included: [
      "Hand wash of vehicle exterior",
      "Removal of dirt, dust, and road grime",
      "Cleaning of wheels and tires",
      "Tire shine",
      "Rinse and spot free drying",
      "Exterior window & mirror cleaning",
      "Wipe down of door jambs",
    ],
  },
  washVacuum: {
    title: "Wash & vacuum",
    exterior: [
      "Vacuuming of seats, carpets, floor mats, and trunk",
      "Wipe down of interior surfaces including dashboard, center console, door panels, cup holders",
      "Cleaning of interior windows and mirrors",
      "Dust removal from vents and hard to reach areas",
      "Interior deodorizing for a fresh scent",
    ],
    interior: [
      "Vacuuming of seats and carpets",
      "Vacuuming of floor mats",
      "Light interior tidy up",
      "Interior window cleaning",
    ],
  },
  fullDetail: {
    title: "Full detailing",
    exterior: [
      "Thorough hand wash",
      "Deep cleaning of wheels and tires",
      "Bug, tar, and grime removal",
      "Exterior window and mirror cleaning",
      "Door jamb cleaning",
      "Tire shine",
      "Hand drying for a clean, streak-free finish",
    ],
    interior: [
      "Complete vacuuming of seats, carpets, mats, trunk",
      "Shampooing or deep cleaning of carpets and seats (cloth or leather safe products)",
      "Full wipe down and detailing of all interior surfaces",
      "Interior window and mirror cleaning",
      "Stain treatment where possible",
      "Interior deodorizing for a fresh, clean scent",
    ],
  },
} as const

export const vehicleExamples = {
  small: {
    title: "Small vehicles",
    definition: [
      "Compact cars and small crossovers",
      "2 rows of seating",
      "No truck bed",
      "Fits easily in a standard parking space",
    ],
  },
  medium: {
    title: "Medium vehicles",
    definition: [
      "Larger than a typical compact car",
      "2–3 rows of seating",
      "May include a short truck bed",
      "Requires more time and materials than a small vehicle",
    ],
  },
  large: {
    title: "Large vehicles",
    definition: [
      "3 rows of seating or extended cargo space",
      "Full-size truck or SUV",
      "Long truck bed",
      "Commercial or work vehicle",
      "Requires more time, water, and cleaning materials",
    ],
  },
} as const
