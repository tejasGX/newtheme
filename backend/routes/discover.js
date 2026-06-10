import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

// Demo company lists for common themes (used when OpenAI is unavailable)
const DEMO_THEMES = {
  'small modular reactor': [
    { ticker: 'NNE', name: 'Nano Nuclear Energy', exchange: 'NASDAQ', sector: 'Energy', industry: 'Nuclear Power', exposure: 'core', rationale: 'Pure-play microreactor developer focused on portable nuclear power units for remote and industrial applications.', marketCapBn: 1.2 },
    { ticker: 'OKLO', name: 'Oklo Inc.', exchange: 'NYSE', sector: 'Energy', industry: 'Nuclear Power', exposure: 'core', rationale: 'Developing compact fast fission clean energy plants (Aurora powerhouse) targeting data centers and remote communities.', marketCapBn: 3.1 },
    { ticker: 'SMR', name: 'NuScale Power', exchange: 'NYSE', sector: 'Energy', industry: 'Nuclear Power', exposure: 'core', rationale: 'Pioneer in small modular light-water reactor technology with NRC-certified design. Targets utilities and industrial customers.', marketCapBn: 0.5 },
    { ticker: 'BWX', name: 'BWX Technologies', exchange: 'NYSE', sector: 'Industrials', industry: 'Defense & Space', exposure: 'core', rationale: 'Manufactures nuclear components for naval reactors and is the primary supplier for US government SMR programs.', marketCapBn: 8.5 },
    { ticker: 'LEU', name: 'Centrus Energy', exchange: 'NYSE', sector: 'Energy', industry: 'Nuclear Fuel', exposure: 'core', rationale: 'Provides enriched uranium fuel including HALEU needed for next-generation SMR designs.', marketCapBn: 0.9 },
    { ticker: 'CCJ', name: 'Cameco Corporation', exchange: 'NYSE', sector: 'Energy', industry: 'Uranium Mining', exposure: 'secondary', rationale: 'World\'s largest publicly traded uranium producer; SMR buildout drives long-term uranium demand growth.', marketCapBn: 18.4 },
    { ticker: 'UEC', name: 'Uranium Energy Corp', exchange: 'NYSE', sector: 'Energy', industry: 'Uranium Mining', exposure: 'secondary', rationale: 'US-based uranium miner positioned to benefit from increased nuclear fuel demand from SMR deployments.', marketCapBn: 2.1 },
    { ticker: 'GEV', name: 'GE Vernova', exchange: 'NYSE', sector: 'Industrials', industry: 'Electric Power', exposure: 'secondary', rationale: 'Through its nuclear joint venture with Hitachi (GE Hitachi), developing BWRX-300 small modular boiling water reactor.', marketCapBn: 65 },
    { ticker: 'ETN', name: 'Eaton Corporation', exchange: 'NYSE', sector: 'Industrials', industry: 'Electrical Equipment', exposure: 'secondary', rationale: 'Provides power management and electrical switchgear critical for SMR plant infrastructure.', marketCapBn: 72 },
    { ticker: 'AMSC', name: 'American Superconductor', exchange: 'NASDAQ', sector: 'Technology', industry: 'Electronic Components', exposure: 'secondary', rationale: 'Develops power electronics and grid interconnection systems applicable to SMR power output integration.', marketCapBn: 0.8 },
    { ticker: 'ARIS', name: 'Aris Water Solutions', exchange: 'NYSE', sector: 'Utilities', industry: 'Water', exposure: 'secondary', rationale: 'Water treatment and infrastructure company relevant to cooling systems needed in SMR plant operations.', marketCapBn: 0.6 },
  ],
  'ai data center': [
    { ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Information Technology', industry: 'Semiconductors', exposure: 'core', rationale: 'Dominant supplier of GPUs powering AI training and inference workloads in hyperscale data centers.', marketCapBn: 2500 },
    { ticker: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', sector: 'Information Technology', industry: 'Semiconductors', exposure: 'core', rationale: 'Growing GPU and CPU market share for AI workloads; Instinct MI300X competing with NVIDIA in inference.', marketCapBn: 220 },
    { ticker: 'SMCI', name: 'Super Micro Computer', exchange: 'NASDAQ', sector: 'Information Technology', industry: 'Computer Hardware', exposure: 'core', rationale: 'Key supplier of GPU-optimized server systems and high-density rack solutions for AI data centers.', marketCapBn: 22 },
    { ticker: 'EQIX', name: 'Equinix Inc.', exchange: 'NASDAQ', sector: 'Real Estate', industry: 'Data Center REITs', exposure: 'core', rationale: 'World\'s largest data center REIT with strategic colocation facilities powering AI workloads globally.', marketCapBn: 68 },
    { ticker: 'DLR', name: 'Digital Realty Trust', exchange: 'NYSE', sector: 'Real Estate', industry: 'Data Center REITs', exposure: 'core', rationale: 'Major data center REIT providing hyperscale colocation for cloud and AI infrastructure.', marketCapBn: 45 },
    { ticker: 'VRT', name: 'Vertiv Holdings', exchange: 'NYSE', sector: 'Industrials', industry: 'Electronic Equipment', exposure: 'core', rationale: 'Designs and manufactures power, cooling, and IT infrastructure for data centers — critical for AI GPU density.', marketCapBn: 32 },
    { ticker: 'ANET', name: 'Arista Networks', exchange: 'NYSE', sector: 'Information Technology', industry: 'Networking', exposure: 'core', rationale: 'Leading supplier of high-bandwidth networking equipment essential for AI cluster interconnects.', marketCapBn: 85 },
    { ticker: 'CEG', name: 'Constellation Energy', exchange: 'NASDAQ', sector: 'Utilities', industry: 'Electric Power', exposure: 'secondary', rationale: 'Nuclear power operator signing direct power purchase agreements with AI data centers (e.g., Microsoft/TMI restart).', marketCapBn: 55 },
    { ticker: 'VST', name: 'Vistra Corp', exchange: 'NYSE', sector: 'Utilities', industry: 'Electric Power', exposure: 'secondary', rationale: 'Power generator with nuclear and natural gas assets serving growing data center electricity demand.', marketCapBn: 28 },
    { ticker: 'CRDO', name: 'Credo Technology', exchange: 'NASDAQ', sector: 'Information Technology', industry: 'Semiconductors', exposure: 'secondary', rationale: 'Provides high-speed connectivity solutions for AI data center networking infrastructure.', marketCapBn: 5.5 },
    { ticker: 'DELL', name: 'Dell Technologies', exchange: 'NYSE', sector: 'Information Technology', industry: 'Computer Hardware', exposure: 'secondary', rationale: 'Major enterprise server vendor capturing AI infrastructure spend through PowerEdge AI server line.', marketCapBn: 55 },
    { ticker: 'IR', name: 'Ingersoll Rand', exchange: 'NYSE', sector: 'Industrials', industry: 'Industrial Machinery', exposure: 'secondary', rationale: 'Provides precision cooling and climate control systems essential for managing heat in dense AI server environments.', marketCapBn: 37 },
  ],
  'defense': [
    { ticker: 'LMT', name: 'Lockheed Martin', exchange: 'NYSE', sector: 'Industrials', industry: 'Aerospace & Defense', exposure: 'core', rationale: 'World\'s largest defense contractor; F-35 program plus missile defense and space systems.', marketCapBn: 115 },
    { ticker: 'RTX', name: 'RTX Corporation', exchange: 'NYSE', sector: 'Industrials', industry: 'Aerospace & Defense', exposure: 'core', rationale: 'Raytheon missiles (Patriot, LTAMDS), Collins avionics, Pratt & Whitney engines.', marketCapBn: 150 },
    { ticker: 'NOC', name: 'Northrop Grumman', exchange: 'NYSE', sector: 'Industrials', industry: 'Aerospace & Defense', exposure: 'core', rationale: 'B-21 Raider stealth bomber, Ground Based Strategic Deterrent ICBM, and space systems.', marketCapBn: 70 },
    { ticker: 'GD', name: 'General Dynamics', exchange: 'NYSE', sector: 'Industrials', industry: 'Aerospace & Defense', exposure: 'core', rationale: 'Gulfstream jets, Abrams tanks, submarines; strong multi-domain defense portfolio.', marketCapBn: 75 },
    { ticker: 'LHX', name: 'L3Harris Technologies', exchange: 'NYSE', sector: 'Industrials', industry: 'Aerospace & Defense', exposure: 'core', rationale: 'Communication systems, night vision, electronic warfare, and intelligence solutions.', marketCapBn: 42 },
    { ticker: 'HII', name: 'Huntington Ingalls', exchange: 'NYSE', sector: 'Industrials', industry: 'Aerospace & Defense', exposure: 'core', rationale: 'Only US builder of aircraft carriers; nuclear submarines; leading US naval shipbuilder.', marketCapBn: 11 },
    { ticker: 'CACI', name: 'CACI International', exchange: 'NYSE', sector: 'Industrials', industry: 'IT Services', exposure: 'secondary', rationale: 'Provides IT, intelligence, and cyber solutions to defense and intelligence agencies.', marketCapBn: 8 },
    { ticker: 'KTOS', name: 'Kratos Defense', exchange: 'NASDAQ', sector: 'Industrials', industry: 'Aerospace & Defense', exposure: 'core', rationale: 'Unmanned systems, hypersonic targets, and satellite communications for US defense.', marketCapBn: 4.5 },
    { ticker: 'AXON', name: 'Axon Enterprise', exchange: 'NASDAQ', sector: 'Industrials', industry: 'Security & Protection', exposure: 'secondary', rationale: 'Taser, body cameras, and AI-powered software for law enforcement; expanding to defense applications.', marketCapBn: 22 },
    { ticker: 'PLTR', name: 'Palantir Technologies', exchange: 'NYSE', sector: 'Technology', industry: 'Software', exposure: 'secondary', rationale: 'AI-powered defense and intelligence analytics platform (Maven Smart System, AIP for defense).', marketCapBn: 55 },
  ],
  'longevity': [
    { ticker: 'NVO', name: 'Novo Nordisk', exchange: 'NYSE', sector: 'Healthcare', industry: 'Pharmaceuticals', exposure: 'core', rationale: 'GLP-1 drugs (Ozempic, Wegovy) targeting metabolic diseases strongly linked to aging and longevity.', marketCapBn: 400 },
    { ticker: 'LLY', name: 'Eli Lilly', exchange: 'NYSE', sector: 'Healthcare', industry: 'Pharmaceuticals', exposure: 'core', rationale: 'Leading Alzheimer\'s (donanemab) and diabetes/obesity drugs; major longevity disease portfolio.', marketCapBn: 750 },
    { ticker: 'REGN', name: 'Regeneron Pharmaceuticals', exchange: 'NASDAQ', sector: 'Healthcare', industry: 'Biotechnology', exposure: 'core', rationale: 'Dupixent for inflammatory diseases of aging; genetic medicine programs targeting age-related conditions.', marketCapBn: 60 },
    { ticker: 'BIIB', name: 'Biogen', exchange: 'NASDAQ', sector: 'Healthcare', industry: 'Biotechnology', exposure: 'core', rationale: 'Leqembi (lecanemab) for Alzheimer\'s disease; focused on neurodegenerative diseases of aging.', marketCapBn: 28 },
    { ticker: 'ILMN', name: 'Illumina', exchange: 'NASDAQ', sector: 'Healthcare', industry: 'Life Sciences Tools', exposure: 'secondary', rationale: 'DNA sequencing infrastructure enabling longevity research and personalized medicine development.', marketCapBn: 18 },
    { ticker: 'TMO', name: 'Thermo Fisher Scientific', exchange: 'NYSE', sector: 'Healthcare', industry: 'Life Sciences Tools', exposure: 'secondary', rationale: 'Life science tools platform supporting longevity drug discovery and development pipelines.', marketCapBn: 180 },
    { ticker: 'UNH', name: 'UnitedHealth Group', exchange: 'NYSE', sector: 'Healthcare', industry: 'Health Insurance', exposure: 'secondary', rationale: 'Managed care model evolving to support longer-living population with chronic disease management.', marketCapBn: 430 },
    { ticker: 'AGEN', name: 'Agenus Inc.', exchange: 'NASDAQ', sector: 'Healthcare', industry: 'Biotechnology', exposure: 'core', rationale: 'Immunology-focused biotech developing therapies targeting cancer and immune aging.', marketCapBn: 0.4 },
    { ticker: 'CDNA', name: 'CareDx', exchange: 'NASDAQ', sector: 'Healthcare', industry: 'Medical Devices', exposure: 'secondary', rationale: 'Molecular diagnostics for transplant monitoring; organ transplantation enables longer, healthier lives.', marketCapBn: 0.6 },
    { ticker: 'RXRX', name: 'Recursion Pharmaceuticals', exchange: 'NASDAQ', sector: 'Healthcare', industry: 'Biotechnology', exposure: 'secondary', rationale: 'AI-powered drug discovery platform accelerating development of therapies for age-related diseases.', marketCapBn: 2.2 },
  ],
  'battery storage': [
    { ticker: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', sector: 'Consumer Discretionary', industry: 'Electric Vehicles', exposure: 'core', rationale: 'Megapack grid-scale battery storage system; largest utility-scale battery manufacturer in the US.', marketCapBn: 800 },
    { ticker: 'FLNC', name: 'Fluence Energy', exchange: 'NASDAQ', sector: 'Industrials', industry: 'Energy Storage', exposure: 'core', rationale: 'Pure-play global energy storage technology and services company for utility-scale battery projects.', marketCapBn: 2.5 },
    { ticker: 'STEM', name: 'Stem Inc.', exchange: 'NYSE', sector: 'Industrials', industry: 'Energy Storage', exposure: 'core', rationale: 'AI-driven energy storage optimization platform for commercial and utility-scale deployments.', marketCapBn: 0.3 },
    { ticker: 'BYD', name: 'BYD Company (BYDDY)', exchange: 'OTC', sector: 'Consumer Discretionary', industry: 'Electric Vehicles', exposure: 'core', rationale: 'World\'s largest EV and battery manufacturer; Blade Battery technology for stationary storage.', marketCapBn: 100 },
    { ticker: 'ALB', name: 'Albemarle Corporation', exchange: 'NYSE', sector: 'Materials', industry: 'Specialty Chemicals', exposure: 'secondary', rationale: 'World\'s largest lithium producer; fundamental feedstock for all lithium-ion battery storage systems.', marketCapBn: 9 },
    { ticker: 'LAC', name: 'Lithium Americas', exchange: 'NYSE', sector: 'Materials', industry: 'Mining', exposure: 'secondary', rationale: 'Developing large lithium deposits to supply growing battery storage supply chain in North America.', marketCapBn: 0.8 },
    { ticker: 'MP', name: 'MP Materials', exchange: 'NYSE', sector: 'Materials', industry: 'Mining', exposure: 'secondary', rationale: 'Rare earth mining and processing for permanent magnets used in battery management systems and EVs.', marketCapBn: 1.5 },
    { ticker: 'PCRX', name: 'Enovis Corporation', exchange: 'NYSE', sector: 'Healthcare', industry: 'Medical Devices', exposure: 'secondary', rationale: 'Battery-powered medical devices; expanding battery management applications.', marketCapBn: 1.8 },
    { ticker: 'ENPH', name: 'Enphase Energy', exchange: 'NASDAQ', sector: 'Information Technology', industry: 'Solar Energy', exposure: 'core', rationale: 'IQ Battery home storage systems and microinverters; leader in residential energy storage.', marketCapBn: 12 },
    { ticker: 'SLAB', name: 'Silicon Laboratories', exchange: 'NASDAQ', sector: 'Information Technology', industry: 'Semiconductors', exposure: 'secondary', rationale: 'IoT chips for battery management systems and smart energy monitoring in storage deployments.', marketCapBn: 2.8 },
  ],
  'space': [
    { ticker: 'RKLB', name: 'Rocket Lab', exchange: 'NASDAQ', sector: 'Industrials', industry: 'Aerospace & Defense', exposure: 'core', rationale: 'Launch provider (Electron) and spacecraft manufacturer; Neutron medium-lift rocket in development.', marketCapBn: 7 },
    { ticker: 'ASTS', name: 'AST SpaceMobile', exchange: 'NASDAQ', sector: 'Communication Services', industry: 'Wireless Telecom', exposure: 'core', rationale: 'Building space-based cellular broadband network using large LEO satellites for direct-to-phone coverage.', marketCapBn: 5.5 },
    { ticker: 'SPCE', name: 'Virgin Galactic', exchange: 'NYSE', sector: 'Industrials', industry: 'Aerospace & Defense', exposure: 'core', rationale: 'Space tourism and point-to-point hypersonic travel pioneer with Delta class development.', marketCapBn: 0.2 },
    { ticker: 'MNTS', name: 'Momentus Inc.', exchange: 'NASDAQ', sector: 'Industrials', industry: 'Aerospace & Defense', exposure: 'core', rationale: 'In-space transportation and services company offering last-mile satellite delivery.', marketCapBn: 0.1 },
    { ticker: 'BA', name: 'Boeing', exchange: 'NYSE', sector: 'Industrials', industry: 'Aerospace & Defense', exposure: 'secondary', rationale: 'SLS rocket partner, Starliner crew vehicle, and launch services; significant NASA program exposure.', marketCapBn: 105 },
    { ticker: 'LMT', name: 'Lockheed Martin', exchange: 'NYSE', sector: 'Industrials', industry: 'Aerospace & Defense', exposure: 'secondary', rationale: 'Orion crew vehicle, military satellites, and space systems division.', marketCapBn: 115 },
    { ticker: 'MAXR', name: 'Maxar Technologies', exchange: 'NYSE', sector: 'Information Technology', industry: 'Aerospace & Defense', exposure: 'core', rationale: 'Earth observation satellites and space infrastructure for defense and commercial customers.', marketCapBn: 6 },
    { ticker: 'SATS', name: 'EchoStar Corporation', exchange: 'NASDAQ', sector: 'Communication Services', industry: 'Satellite Telecom', exposure: 'secondary', rationale: 'Satellite communications services and satellite manufacturing capability.', marketCapBn: 1.5 },
    { ticker: 'VSAT', name: 'Viasat', exchange: 'NASDAQ', sector: 'Communication Services', industry: 'Satellite Telecom', exposure: 'secondary', rationale: 'Broadband satellite communications with LEO and GEO constellation for aviation and maritime.', marketCapBn: 2.8 },
    { ticker: 'GRAL', name: 'Grail Inc.', exchange: 'NASDAQ', sector: 'Healthcare', industry: 'Biotechnology', exposure: 'secondary', rationale: 'Using AI and multi-cancer early detection; space-adjacent AI application.', marketCapBn: 1.5 },
  ],
  'water': [
    { ticker: 'AWK', name: 'American Water Works', exchange: 'NYSE', sector: 'Utilities', industry: 'Water Utilities', exposure: 'core', rationale: 'Largest publicly traded US water utility serving 14 million+ people.', marketCapBn: 22 },
    { ticker: 'WTRG', name: 'Essential Utilities', exchange: 'NYSE', sector: 'Utilities', industry: 'Water Utilities', exposure: 'core', rationale: 'Water and natural gas utility with significant infrastructure investment in water treatment.', marketCapBn: 9 },
    { ticker: 'XYL', name: 'Xylem Inc.', exchange: 'NYSE', sector: 'Industrials', industry: 'Industrial Machinery', exposure: 'core', rationale: 'Global water technology leader in pumps, meters, and analytics for water infrastructure.', marketCapBn: 16 },
    { ticker: 'MSEX', name: 'Middlesex Water', exchange: 'NASDAQ', sector: 'Utilities', industry: 'Water Utilities', exposure: 'core', rationale: 'Pure-play water utility in New Jersey and Delaware; consistent dividend grower.', marketCapBn: 0.9 },
    { ticker: 'PESI', name: 'Perion Network', exchange: 'NASDAQ', sector: 'Communication Services', industry: 'Internet Software', exposure: 'secondary', rationale: 'Digital advertising but listed for diversification.', marketCapBn: 0.4 },
    { ticker: 'TTEK', name: 'Tetra Tech', exchange: 'NASDAQ', sector: 'Industrials', industry: 'Engineering', exposure: 'core', rationale: 'Engineering and consulting services specializing in water, environmental, and infrastructure projects.', marketCapBn: 6.5 },
    { ticker: 'ITRI', name: 'Itron Inc.', exchange: 'NASDAQ', sector: 'Industrials', industry: 'Electronic Equipment', exposure: 'secondary', rationale: 'Smart water meters and data analytics for water utilities to reduce leakage and improve efficiency.', marketCapBn: 3.5 },
    { ticker: 'NWPX', name: 'Northwest Pipe', exchange: 'NASDAQ', sector: 'Industrials', industry: 'Metal Fabrication', exposure: 'secondary', rationale: 'Manufactures steel pipe systems for water infrastructure and transmission lines.', marketCapBn: 0.5 },
    { ticker: 'CWCO', name: 'Consolidated Water', exchange: 'NASDAQ', sector: 'Utilities', industry: 'Water Utilities', exposure: 'core', rationale: 'Desalination and water distribution in water-scarce Caribbean and Cayman Islands markets.', marketCapBn: 0.5 },
  ],
};

// Fuzzy match theme to demo key
function matchDemoTheme(theme) {
  const t = theme.toLowerCase();
  const matchers = {
    'small modular reactor': ['small modular', 'smr', 'nuclear reactor', 'microreactor', 'modular nuclear'],
    'ai data center': ['ai data', 'data center', 'hyperscale', 'gpu infrastructure', 'cloud infra', 'artificial intelligence data'],
    'defense': ['defense', 'defence', 'counter-drone', 'counter drone', 'military', 'drone', 'weapon'],
    'longevity': ['longevity', 'aging', 'ageing', 'anti-aging', 'lifespan', 'healthspan', 'geroscience'],
    'battery storage': ['battery', 'energy storage', 'grid storage', 'lithium', 'bess', 'stationary storage'],
    'space': ['space', 'satellite', 'orbital', 'launch', 'rocket', 'spacecraft'],
    'water': ['water', 'desalination', 'irrigation', 'water security', 'water infrastructure'],
  };

  for (const [key, keywords] of Object.entries(matchers)) {
    if (keywords.some(kw => t.includes(kw))) return key;
  }
  return null;
}

router.post('/', async (req, res) => {
  const { theme } = req.body;

  if (!theme || typeof theme !== 'string') {
    return res.status(400).json({ error: 'Theme is required' });
  }

  // Try OpenAI if key is configured
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a financial research assistant specializing in thematic ETF construction. Given a theme, identify 10-15 publicly traded companies with significant exposure to that theme. Return ONLY a JSON array (no markdown) with this structure:
[{"ticker":"AAPL","name":"Apple Inc.","exchange":"NASDAQ","sector":"Information Technology","industry":"Technology Hardware","exposure":"core","rationale":"Brief explanation","marketCapBn":3000}]
Focus on US-listed companies (NYSE/NASDAQ). Mix of market caps. Accurate tickers only.`
          },
          { role: 'user', content: `Find companies exposed to the theme: ${theme}` }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });
      const cleaned = completion.choices[0].message.content.trim()
        .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const companies = JSON.parse(cleaned);
      if (Array.isArray(companies)) return res.json({ companies, theme });
    } catch (err) {
      console.error('OpenAI error, falling back to demo data:', err.message);
    }
  }

  // Demo mode fallback
  const demoKey = matchDemoTheme(theme);
  if (demoKey && DEMO_THEMES[demoKey]) {
    return res.json({
      companies: DEMO_THEMES[demoKey],
      theme,
      demoMode: true,
      demoNote: 'Using curated demo data. Add OPENAI_API_KEY to backend/.env for live AI discovery.',
    });
  }

  // Generic fallback for unknown themes
  return res.json({
    companies: [
      { ticker: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Information Technology', industry: 'Software', exposure: 'secondary', rationale: 'Broad technology platform with exposure across most emerging themes via Azure, AI, and enterprise software.', marketCapBn: 3200 },
      { ticker: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', sector: 'Communication Services', industry: 'Internet Services', exposure: 'secondary', rationale: 'AI research leader and cloud platform with thematic exposure via Google Cloud and DeepMind.', marketCapBn: 2100 },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', sector: 'Consumer Discretionary', industry: 'E-Commerce', exposure: 'secondary', rationale: 'AWS cloud infrastructure and logistics automation with broad thematic exposure.', marketCapBn: 1800 },
      { ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Information Technology', industry: 'Semiconductors', exposure: 'secondary', rationale: 'GPU platform enabling AI and compute-intensive applications across many themes.', marketCapBn: 2500 },
      { ticker: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', sector: 'Consumer Discretionary', industry: 'Electric Vehicles', exposure: 'secondary', rationale: 'Energy, robotics, and EV disruption with broad exposure to technology-driven future themes.', marketCapBn: 800 },
    ],
    theme,
    demoMode: true,
    demoNote: `No curated list for "${theme}". Try: Small Modular Reactors, AI Data Centers, Defense, Longevity, Battery Storage, Space, or Water.`,
  });
});

export default router;
