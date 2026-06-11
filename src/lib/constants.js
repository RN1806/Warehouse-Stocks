export const INDUSTRIES = [
  'Construction',
  'Paint',
  'Plastic',
  'Agriculture',
  'Cosmetic & Personal Care',
  'Household',
  'Textile',
  'Food',
  'Lubricant',
  'Water Treatment',
  'S Plus',
]

export const INDUSTRY_ICONS = {
  'Construction':            '🏗️',
  'Paint':                   '🎨',
  'Plastic':                 '🧪',
  'Agriculture':             '🌾',
  'Cosmetic & Personal Care':'💄',
  'Household':               '🏠',
  'Textile':                 '🧵',
  'Food':                    '🍽️',
  'Lubricant':               '⚙️',
  'Water Treatment':         '💧',
  'S Plus':                  '➕',
}

// Suppliers from Sheet1 of Supplier_List.xlsx, organized by industry category
// Sorted alphabetically within each category
export const SUPPLIERS_BY_CATEGORY = {
  'Paint & Construction': [
    'Anhui Black Cat','Baxsn','CDI','Celotech','Celanese',
    'Hebei Yicheng','Indian Chemical','Indofill','Innovative Polymer',
    'Lingwe','LOCA','Louis T','Momentive','Nouryon','Phomera',
    'Poly Coat','Ruisil','Siam Luck','Shinetsu','Sudarshan',
    'Vencorex','Zhejiang Camp',
  ],
  'S Plus': [
    'Aati','Bifrost','Calibre','Cosmeplus','Derypol',
    'Dongying Hi-Tech Spring Chemical Industry',
    'Environ Chem','I plus','JC Chem','Silox India',
    'Startec','Thai Food','Utika','Velhoki','WC','YFZ','Yunfu','Zhechem',
  ],
  'Personal Care & Home Care': [
    'ABP','ALL PLUS','Amhwa','Apical','Bronson',
    'Chesir','DKSH','EOC','Evonik','GVD','Green Phamahol',
    'Infinita','JINKE','Lapox','Munzing','Natura','Royal',
    'Runhe','Sharon','Shinehigh','Soho Aneco','Sojuvant',
    'Sydney','Tanatex','Thai Sanguanwat','Union','Vogele',
  ],
  'Plastics': [
    'Goldstab','HCA','Mitsubishi','Sudarshan',
  ],
  'Agriculture': [
    'Ajanta','GGC','Jackhem','Nouryon','Runhe','Sudarshan',
  ],
  'Lubricant': [
    'Chorus','DL Chemical','Environ','Evonik','Italmatch',
    'Jackhem','Mohini','Nouryon','Sakpiroon','SFC',
    'Shijiazhuang','Syner','TBIO','Work lube',
  ],
}

// All suppliers flat + sorted A-Z
export const ALL_SUPPLIERS = [...new Set(
  Object.values(SUPPLIERS_BY_CATEGORY).flat()
)].sort((a, b) => a.localeCompare(b))

// Amount units for packaging
export const AMOUNT_UNITS = ['g', 'kg', 'ml', 'L', 'bottles', 'bags', 'pcs', 'drums', 'cans']

export const SUPPLIER_CATEGORIES = [
  'Paint & Construction',
  'S Plus',
  'Personal Care & Home Care',
  'Agriculture',
  'Lubricant',
  'Plastics',
  'Other',
]

// Gram presets 5–1000g
export const GRAM_PRESETS = [5, 10, 25, 50, 100, 250, 500, 1000]

// Kg presets 1–30kg
export const KG_PRESETS = [1, 2, 5, 10, 15, 20, 25, 30]
