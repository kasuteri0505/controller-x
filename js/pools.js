/* ════════════════════════════════════════════════════════════════
   SUI NETWORK SUPPORT
   RPC: Sui JSON-RPC (sui_getObject)
   Suporta: Cetus · Turbos · KriyaDEX · Aftermath · FlowX
   ════════════════════════════════════════════════════════════════ */

// Sui public RPCs (sem API key)
const SUI_RPCS = [
  'https://fullnode.mainnet.sui.io',
  'https://sui-mainnet-rpc.nodereal.io',
  'https://rpc.mainnet.sui.io',
  'https://sui.getblock.io/mainnet/json',
];

// Map known Sui coin types → { symbol, cgId }
const SUI_COIN_TYPES = {
  '0x2::sui::SUI':                                                                      { symbol:'SUI',  cgId:'sui' },
  '0x5d4b302506645c37ff133b98c4b50a406ae2a9c1808e05c633c921f9d74a03b2::coin::COIN':    { symbol:'USDC', cgId:'usd-coin' },
  '0xb231fcda8bbddb31f2ef02e6161444aec64a514e2c89279584ac9806ce9cf037::coin::COIN':     { symbol:'USDC', cgId:'usd-coin' },  // wormhole USDC
  '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN':    { symbol:'USDT', cgId:'tether' },
  '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN':    { symbol:'WETH', cgId:'ethereum' },
  '0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN':    { symbol:'WBTC', cgId:'wrapped-bitcoin' },
  '0x6864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS':   { symbol:'CETUS',cgId:'cetus-protocol' },
  '0x1e8b532cca6569cab9f9b9ebc73f8c13885012ade714729aa3b450e0339ac766::coin::COIN':    { symbol:'WSOL', cgId:'solana' },
  '0xdbe380b13a6d0f5cdedd58de8f04625263f113b3f9db32b3e1983f49e2841676::coin::COIN':    { symbol:'APT',  cgId:'aptos' },
  '0x3a5143bb1196e3bcdfab6203d1683ae29edd26294fc8bfeafe4aaa9d2704652::coin::COIN':     { symbol:'CETUS',cgId:'cetus-protocol' },
};

// Extract 0x + 64-char hex object ID from any Sui URL
function extractSuiObjectId(url) {
  // Full 64-char object ID
  const full = url.match(/0x([0-9a-fA-F]{64})/);
  if(full) return '0x' + full[1];
  // id= query param (may be shorter with leading zeros removed)
  const idParam = url.match(/[?&#]id=(0x[0-9a-fA-F]+)/i);
  if(idParam) {
    const raw = idParam[1].slice(2);
    return '0x' + raw.padStart(64,'0');
  }
  // Last path segment starting with 0x
  const pathSeg = url.match(/\/(0x[0-9a-fA-F]{10,})/);
  if(pathSeg) {
    const raw = pathSeg[1].slice(2);
    return '0x' + raw.padStart(64,'0');
  }
  return null;
}

// Sui JSON-RPC caller
async function suiRpcCall(method, params) {
  for(const rpc of SUI_RPCS) {
    try {
      const r = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc:'2.0', id:1, method, params }),
        signal: AbortSignal.timeout(10000),
      });
      if(!r.ok) continue;
      const d = await r.json();
      if(d.error) continue;
      if(d.result !== undefined) return d.result;
    } catch(e) { /* try next */ }
  }
  return null;
}

// Decode Sui Move tick (u32 two's-complement for negative ticks)
function decodeSuiTick(raw) {
  const n = typeof raw === 'object' && raw !== null ? parseInt(raw.bits ?? raw) : parseInt(raw);
  // Sui CLMM uses u32 where negative ticks are encoded as (2^32 + tick)
  if(n >= 2147483648) return n - 4294967296; // 2^31 threshold
  return n;
}

// Parse coin type string to get symbol — tries known list, then extracts from type string
function parseSuiCoinTypeToSymbol(coinTypeStr) {
  if(!coinTypeStr) return { symbol:'UNKNOWN', cgId:'' };
  const known = SUI_COIN_TYPES[coinTypeStr];
  if(known) return known;

  // Extract module name as fallback symbol (last segment before ::)
  // e.g. "0xABC::my_token::MY_TOKEN" → "MY_TOKEN"
  const parts = coinTypeStr.split('::');
  const sym = (parts[parts.length-1]||'TOKEN').toUpperCase();
  return { symbol: sym, cgId:'' };
}

// Fetch a Sui object with full content
async function suiGetObject(objectId) {
  return await suiRpcCall('sui_getObject', [
    objectId,
    {
      showType:    true,
      showOwner:   true,
      showContent: true,
      showDisplay: true,
    }
  ]);
}

// Main Sui position fetcher — handles multiple DEX formats
async function fetchSuiPosition(objectId, exchange) {
  // Show a Sui-specific loading message
  const resEl = document.getElementById('np-url-result');
  if(resEl) resEl.innerHTML = `<div style="font-size:13px;color:var(--text2);display:flex;align-items:center;gap:8px;padding:.5rem 0">
    <span style="display:inline-block;width:10px;height:10px;border:2px solid var(--border2);border-top-color:var(--text);border-radius:50%;animation:spin .8s linear infinite"></span>
    Consultando Sui RPC — lendo objeto Move <code style="font-size:11px;color:var(--text3)">${objectId.slice(0,18)}…</code>
  </div>`;

  const obj = await suiGetObject(objectId);

  if(!obj || obj.error || !obj.data) {
    throw new Error(`Objeto Sui ${objectId.slice(0,10)}… não encontrado na rede. Verifique o Object ID.`);
  }

  const data    = obj.data;
  const objType = data.type || '';
  const content = data.content;

  // Must have content to parse
  if(!content || !content.fields) {
    // Try to give a helpful error
    if(objType.includes('Pool') || objType.includes('pool')) {
      throw new Error(`Este é um Pool Object, não uma Position. Cole a URL da sua posição específica (não do pool).`);
    }
    throw new Error(`Objeto encontrado mas sem dados de posição legíveis. Tipo: ${objType.slice(0,60)}`);
  }

  const fields = content.fields;

  // ── Detect DEX from type string and delegate parser ──
  const typeLow = objType.toLowerCase();

  if(typeLow.includes('cetus') || typeLow.includes('::position::position')) {
    return parseSuiCLMMPosition(objectId, fields, objType, 'Cetus');
  }
  if(typeLow.includes('turbos')) {
    return parseSuiCLMMPosition(objectId, fields, objType, 'Turbos Finance');
  }
  if(typeLow.includes('kriya')) {
    return parseSuiCLMMPosition(objectId, fields, objType, 'KriyaDEX');
  }
  if(typeLow.includes('flowx')) {
    return parseSuiCLMMPosition(objectId, fields, objType, 'FlowX Finance');
  }
  if(typeLow.includes('aftermath') || typeLow.includes('af_lp')) {
    return parseSuiAMMPosition(objectId, fields, objType, 'Aftermath Finance');
  }

  // Generic fallback — try to extract coin types from the Move type string
  return parseSuiGenericPosition(objectId, fields, objType, exchange || 'Sui DEX');
}

// ── Parser: CLMM positions (Cetus, Turbos, KriyaDEX, FlowX) ──
// These all follow the Uniswap v3 CLMM model on Sui
async function parseSuiCLMMPosition(objectId, fields, objType, exchange) {
  // Extract coin type params from type string
  // e.g. "0xABC::position::Position<0xDEF::sui::SUI, 0xGHI::coin::COIN>"
  const typeParams = extractSuiTypeParams(objType);
  const coinTypeA  = typeParams[0] || '';
  const coinTypeB  = typeParams[1] || '';

  const infoA = parseSuiCoinTypeToSymbol(coinTypeA);
  const infoB = parseSuiCoinTypeToSymbol(coinTypeB);

  // Read tick range — field names vary by protocol
  const tickLower = decodeSuiTick(
    fields.tick_lower_index ?? fields.tick_lower ?? fields.lower_tick ?? 0
  );
  const tickUpper = decodeSuiTick(
    fields.tick_upper_index ?? fields.tick_upper ?? fields.upper_tick ?? 0
  );

  // Liquidity
  const liquidity = parseInt(
    fields.liquidity ?? fields.current_liquidity ?? 0
  );

  // Token amounts (may or may not be present depending on DEX)
  const rawAmtA = parseInt(fields.coin_a_amount ?? fields.amount_a ?? fields.amount0 ?? 0);
  const rawAmtB = parseInt(fields.coin_b_amount ?? fields.amount_b ?? fields.amount1 ?? 0);
  const decA = 9; // SUI standard — most Sui tokens use 9 decimals
  const decB = (infoB.symbol==='USDC'||infoB.symbol==='USDT') ? 6 : 9;

  const amtA = rawAmtA > 0 ? (rawAmtA / Math.pow(10, decA)).toFixed(6) : '';
  const amtB = rawAmtB > 0 ? (rawAmtB / Math.pow(10, decB)).toFixed(6) : '';

  // Fee tier
  const feeBps = parseInt(fields.fee_rate ?? fields.fee ?? fields.tick_spacing ?? 0);
  const feePct  = feeBps > 100 ? (feeBps / 10000).toFixed(2)  // already in bps
                : feeBps > 0   ? (feeBps / 100).toFixed(2)    // might be in 100ths
                : '0.30';

  // Price range from ticks (same formula as Uniswap v3)
  const decAdj    = Math.pow(10, decB - decA);
  const priceLow  = (Math.pow(1.0001, tickLower) / decAdj).toFixed(6);
  const priceHigh = (Math.pow(1.0001, tickUpper) / decAdj).toFixed(6);

  // Get live prices from CoinGecko
  let priceA=0, priceB=0, logoA='', logoB='';
  try {
    const ids = [infoA.cgId, infoB.cgId].filter(Boolean).join(',');
    if(ids) {
      const pr = await cgFetch(`/simple/price?ids=${ids}&vs_currencies=usd`);
      if(infoA.cgId) priceA = pr[infoA.cgId]?.usd||0;
      if(infoB.cgId) priceB = pr[infoB.cgId]?.usd||0;
    }
    // Search for tokens not in known list
    if(!priceA && infoA.symbol!=='UNKNOWN') {
      try {
        const s = await cgFetch(`/search?query=${encodeURIComponent(infoA.symbol)}`);
        const coin = s.coins?.[0];
        if(coin) { logoA=coin.large||coin.thumb||''; const pr2=await cgFetch(`/simple/price?ids=${coin.id}&vs_currencies=usd`); priceA=pr2[coin.id]?.usd||0; }
      } catch(e) {}
    }
    if(!priceB && infoB.symbol!=='UNKNOWN') {
      try {
        const s = await cgFetch(`/search?query=${encodeURIComponent(infoB.symbol)}`);
        const coin = s.coins?.[0];
        if(coin) { logoB=coin.large||coin.thumb||''; const pr2=await cgFetch(`/simple/price?ids=${coin.id}&vs_currencies=usd`); priceB=pr2[coin.id]?.usd||0; }
      } catch(e) {}
    }
  } catch(e) {}

  const usdA = amtA && priceA ? (parseFloat(amtA)*priceA).toFixed(2) : '';
  const usdB = amtB && priceB ? (parseFloat(amtB)*priceB).toFixed(2) : '';

  // Pool ID
  const poolId = fields.pool_id ?? fields.pool ?? fields.pool_key ?? '';

  return {
    source:   'sui_onchain',
    exchange,
    network:  'Sui',
    objectId,
    poolId:   typeof poolId === 'string' ? poolId : '',
    name:     `${infoA.symbol}/${infoB.symbol} ${exchange}`,
    fee:      feePct,
    liquidity,
    token0: {
      symbol:  infoA.symbol,
      name:    infoA.symbol,
      coinType:coinTypeA,
      id:      infoA.cgId,
      logo:    logoA,
      price:   priceA,
      decimals:decA,
      qty:     amtA,
      usd:     usdA,
    },
    token1: {
      symbol:  infoB.symbol,
      name:    infoB.symbol,
      coinType:coinTypeB,
      id:      infoB.cgId,
      logo:    logoB,
      price:   priceB,
      decimals:decB,
      qty:     amtB,
      usd:     usdB,
    },
    rangeMin:  priceLow,
    rangeMax:  priceHigh,
    feesUSD:   '0.00',
    date:      new Date().toISOString().split('T')[0],
    suiNote:   tickLower===0&&tickUpper===0 ? 'Ticks não disponíveis nesta posição — intervalo de preço não calculável.' : '',
  };
}

// ── Parser: AMM positions (Aftermath, standard AMM) ──
async function parseSuiAMMPosition(objectId, fields, objType, exchange) {
  const typeParams = extractSuiTypeParams(objType);
  const infoA = parseSuiCoinTypeToSymbol(typeParams[0]||'');
  const infoB = parseSuiCoinTypeToSymbol(typeParams[1]||'');

  // AMM LP tokens typically hold a balance
  const rawAmtA = parseInt(fields.balance_a ?? fields.coin_a ?? fields.amount_a ?? 0);
  const rawAmtB = parseInt(fields.balance_b ?? fields.coin_b ?? fields.amount_b ?? 0);

  let priceA=0, priceB=0;
  try {
    const ids=[infoA.cgId,infoB.cgId].filter(Boolean).join(',');
    if(ids){ const pr=await cgFetch(`/simple/price?ids=${ids}&vs_currencies=usd`);
      if(infoA.cgId) priceA=pr[infoA.cgId]?.usd||0;
      if(infoB.cgId) priceB=pr[infoB.cgId]?.usd||0; }
  } catch(e) {}

  const decA=9, decB=(infoB.symbol==='USDC'||infoB.symbol==='USDT')?6:9;
  const amtA = rawAmtA>0?(rawAmtA/Math.pow(10,decA)).toFixed(6):'';
  const amtB = rawAmtB>0?(rawAmtB/Math.pow(10,decB)).toFixed(6):'';

  return {
    source:'sui_onchain', exchange, network:'Sui', objectId,
    name:`${infoA.symbol}/${infoB.symbol} ${exchange}`,
    fee:'0.30',
    token0:{ symbol:infoA.symbol, name:infoA.symbol, coinType:typeParams[0]||'',
             id:infoA.cgId, logo:'', price:priceA, decimals:decA, qty:amtA, usd:amtA&&priceA?(parseFloat(amtA)*priceA).toFixed(2):'' },
    token1:{ symbol:infoB.symbol, name:infoB.symbol, coinType:typeParams[1]||'',
             id:infoB.cgId, logo:'', price:priceB, decimals:decB, qty:amtB, usd:amtB&&priceB?(parseFloat(amtB)*priceB).toFixed(2):'' },
    rangeMin:'', rangeMax:'', feesUSD:'0.00',
    date:new Date().toISOString().split('T')[0],
  };
}

// ── Parser: Generic fallback for unknown Sui DEX ──
async function parseSuiGenericPosition(objectId, fields, objType, exchange) {
  // Try to get coin types from type parameters
  const typeParams = extractSuiTypeParams(objType);
  if(typeParams.length >= 2) {
    return parseSuiCLMMPosition(objectId, fields, objType, exchange);
  }

  // Last resort: return a partial result so user can fill in manually
  return {
    source:'sui_generic', exchange, network:'Sui', objectId,
    name:`Sui Pool — ${exchange}`,
    fee:'0.30',
    token0:{ symbol:'TOKEN_A', qty:'', usd:'' },
    token1:{ symbol:'TOKEN_B', qty:'', usd:'' },
    rangeMin:'', rangeMax:'', feesUSD:'0.00',
    date:new Date().toISOString().split('T')[0],
    suiNote:`Tipo de objeto: ${objType.slice(0,80)}`,
  };
}

// Extract type parameters from a Move generic type string
// "0xABC::mod::Type<0xDEF::sui::SUI, 0xGHI::coin::COIN>" → ["0xDEF::sui::SUI", "0xGHI::coin::COIN"]
function extractSuiTypeParams(typeStr) {
  const start = typeStr.indexOf('<');
  const end   = typeStr.lastIndexOf('>');
  if(start === -1 || end === -1) return [];
  const inner = typeStr.slice(start+1, end);
  // Split on top-level commas only (not nested generics)
  const params = [];
  let depth = 0, cur = '';
  for(const ch of inner) {
    if(ch==='<') { depth++; cur+=ch; }
    else if(ch==='>') { depth--; cur+=ch; }
    else if(ch===',' && depth===0) { params.push(cur.trim()); cur=''; }
    else cur+=ch;
  }
  if(cur.trim()) params.push(cur.trim());
  return params;
}

// ════════════════════════════════════════════════════════════════
//  UNISWAP POSITION FETCHER — lê direto da blockchain via JSON-RPC
//  Sem API key. Usa RPCs públicos gratuitos.
//  Contrato: Uniswap v3 NonfungiblePositionManager
//  0xC36442b4a4522E871399CD717aBDD847Ab11FE88 (Ethereum & L2s)
// ════════════════════════════════════════════════════════════════

const UNISWAP_NFT_MANAGERS = {
  '1':     '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // Ethereum
  '42161': '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // Arbitrum
  '8453':  '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1', // Base (v3)
  '10':    '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // Optimism
  '137':   '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // Polygon
  '56':    '0x46A15B0b27311cedF172AB29E4f4766fbE7F4364', // BNB Chain (PancakeSwap)
};

// RPCs públicos gratuitos (sem API key)
const PUBLIC_RPCS = {
  '1':     ['https://cloudflare-eth.com','https://eth.llamarpc.com','https://rpc.ankr.com/eth'],
  '42161': ['https://arb1.arbitrum.io/rpc','https://arbitrum.llamarpc.com'],
  '8453':  ['https://mainnet.base.org','https://base.llamarpc.com'],
  '10':    ['https://mainnet.optimism.io','https://optimism.llamarpc.com'],
  '137':   ['https://polygon-rpc.com','https://polygon.llamarpc.com'],
  '56':    ['https://bsc-dataseed.binance.org','https://bsc.llamarpc.com'],
};

// ABI-encode uint256 (pad left to 32 bytes)
function abiEncodeUint256(n) {
  return BigInt(n).toString(16).padStart(64, '0');
}

// ABI-decode a single uint256 from hex result
function abiDecodeUint256(hex) {
  return BigInt('0x' + (hex.slice(2)||hex).slice(-64));
}

// ABI-decode address (last 20 bytes of 32-byte slot)
function abiDecodeAddr(hex) {
  return '0x' + (hex.slice(2)||hex).slice(-40);
}

// Decode int24 (signed, used for ticks)
function abiDecodeInt24(hex) {
  const raw = parseInt((hex.slice(2)||hex).slice(-64), 16);
  // int24 range: if bit 23 is set, it's negative
  if(raw >= 2**23) return raw - 2**24;
  return raw;
}

async function rpcCall(chainId, to, data) {
  const rpcs = PUBLIC_RPCS[chainId] || PUBLIC_RPCS['1'];
  for(const rpc of rpcs) {
    try {
      const r = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'eth_call',
          params: [{ to, data }, 'latest']
        }),
        signal: AbortSignal.timeout(8000)
      });
      if(!r.ok) continue;
      const d = await r.json();
      if(d.result && d.result !== '0x') return d.result;
    } catch(e) { /* try next RPC */ }
  }
  return null;
}

async function getERC20Symbol(chainId, tokenAddr) {
  // symbol() = 0x95d89b41
  const raw = await rpcCall(chainId, tokenAddr, '0x95d89b41');
  if(!raw || raw === '0x') return tokenAddr.slice(0,6).toUpperCase();
  try {
    // ABI-decode string: offset (32 bytes) + length (32 bytes) + data
    const hex = raw.slice(2);
    const offset = parseInt(hex.slice(0,64), 16) * 2;
    const len    = parseInt(hex.slice(offset, offset+64), 16);
    const strHex = hex.slice(offset+64, offset+64+len*2);
    return Buffer.from(strHex, 'hex').toString('utf8').replace(/\0/g,'').trim() || tokenAddr.slice(2,6).toUpperCase();
  } catch(e) {
    // Fallback: some tokens return bytes32 instead of string
    try {
      const bytes = raw.slice(2, 66);
      return Buffer.from(bytes, 'hex').toString('utf8').replace(/\0/g,'').trim();
    } catch(e2) { return tokenAddr.slice(2,6).toUpperCase(); }
  }
}

async function getERC20Decimals(chainId, tokenAddr) {
  // decimals() = 0x313ce567
  const raw = await rpcCall(chainId, tokenAddr, '0x313ce567');
  if(!raw || raw === '0x') return 18;
  return Number(abiDecodeUint256(raw));
}

async function fetchUniswapPosition(tokenId, network, exchange) {
  const netNorm = network.toLowerCase().replace(/-/g,'').replace('bnbchain','bsc').replace('bnb','bsc');
  const chainMap = { ethereum:'1', arbitrum:'42161', base:'8453', optimism:'10', polygon:'137', bsc:'56', avalanche:'43114' };
  const chainId  = chainMap[netNorm] || '1';
  const networkLabel = { '1':'Ethereum','42161':'Arbitrum','8453':'Base','10':'Optimism','137':'Polygon','56':'BNB Chain' }[chainId] || network;
  const nftManager = UNISWAP_NFT_MANAGERS[chainId] || UNISWAP_NFT_MANAGERS['1'];

  // ── Step 1: call positions(tokenId) on the NonfungiblePositionManager ──
  // Function selector: keccak256("positions(uint256)") = 0x99fbab88
  const callData = '0x99fbab88' + abiEncodeUint256(tokenId);
  const raw = await rpcCall(chainId, nftManager, callData);

  if(!raw || raw === '0x' || raw.length < 10) {
    throw new Error(`Posição #${tokenId} não encontrada na rede ${networkLabel}. Verifique se o número da posição está correto.`);
  }

  // positions() returns:
  // nonce(uint96), operator(address), token0(address), token1(address),
  // fee(uint24), tickLower(int24), tickUpper(int24), liquidity(uint128),
  // feeGrowthInside0LastX128(uint256), feeGrowthInside1LastX128(uint256),
  // tokensOwed0(uint128), tokensOwed1(uint128)
  const hex   = raw.slice(2);
  const slot  = (i) => hex.slice(i*64, i*64+64);

  const token0Addr = '0x' + slot(2).slice(-40);
  const token1Addr = '0x' + slot(3).slice(-40);
  const feeTier    = Number(abiDecodeUint256(slot(4)));

  // ticks are int24, packed in the uint256 slots — last 6 hex chars = 24 bits
  const rawTick0 = parseInt(slot(5).slice(-6), 16);
  const tickLower = rawTick0 >= 2**23 ? rawTick0 - 2**24 : rawTick0;
  const rawTick1 = parseInt(slot(6).slice(-6), 16);
  const tickUpper = rawTick1 >= 2**23 ? rawTick1 - 2**24 : rawTick1;
  const liquidity = Number(abiDecodeUint256(slot(7)));

  if(token0Addr === '0x0000000000000000000000000000000000000000') {
    throw new Error(`Posição #${tokenId} vazia ou encerrada. Ela pode ter sido removida da pool.`);
  }

  // ── Step 2: get token symbols and decimals ──
  const [sym0, sym1, dec0, dec1] = await Promise.all([
    getERC20Symbol(chainId, token0Addr),
    getERC20Symbol(chainId, token1Addr),
    getERC20Decimals(chainId, token0Addr),
    getERC20Decimals(chainId, token1Addr),
  ]);

  // ── Step 3: calculate price range from ticks ──
  // Uniswap v3 formula: price = 1.0001^tick / (10^(dec1-dec0))
  const decAdj    = Math.pow(10, dec1 - dec0);
  const priceLow  = (Math.pow(1.0001, tickLower) / decAdj).toFixed(6);
  const priceHigh = (Math.pow(1.0001, tickUpper) / decAdj).toFixed(6);
  const feePct    = (feeTier / 10000).toFixed(2);

  // ── Step 4: get current prices from CoinGecko ──
  let t0Price=0, t1Price=0, t0Logo='', t1Logo='', t0Id='', t1Id='';
  try {
    // Map common token symbols to CoinGecko IDs
    const knownIds = {
      'WETH':'ethereum','ETH':'ethereum','WBTC':'wrapped-bitcoin','BTC':'bitcoin',
      'USDC':'usd-coin','USDT':'tether','DAI':'dai','WMATIC':'matic-network',
      'MATIC':'matic-network','ARB':'arbitrum','OP':'optimism','UNI':'uniswap',
      'LINK':'chainlink','AAVE':'aave','CRV':'curve-dao-token','MKR':'maker',
      'SNX':'havven','COMP':'compound-governance-token','SUSHI':'sushi',
      'PEPE':'pepe','SHIB':'shiba-inu',
    };
    const id0 = knownIds[sym0.toUpperCase()];
    const id1 = knownIds[sym1.toUpperCase()];

    if(id0 || id1) {
      const ids = [id0, id1].filter(Boolean).join(',');
      const pr  = await cgFetch(`/simple/price?ids=${ids}&vs_currencies=usd`);
      if(id0) { t0Price = pr[id0]?.usd||0; t0Id = id0; }
      if(id1) { t1Price = pr[id1]?.usd||0; t1Id = id1; }
    }
    // If not in known list, search by symbol
    const missing = [];
    if(!t0Id) missing.push({sym:sym0, slot:'0'});
    if(!t1Id) missing.push({sym:sym1, slot:'1'});
    for(const m of missing) {
      try {
        const s = await cgFetch(`/search?query=${encodeURIComponent(m.sym)}`);
        const coin = s.coins?.[0];
        if(coin) {
          if(m.slot==='0') { t0Id=coin.id; t0Logo=coin.large||coin.thumb||''; }
          else             { t1Id=coin.id; t1Logo=coin.large||coin.thumb||''; }
        }
      } catch(e) {}
    }
    if((t0Id && !t0Price) || (t1Id && !t1Price)) {
      const ids2 = [t0Id&&!t0Price?t0Id:'', t1Id&&!t1Price?t1Id:''].filter(Boolean).join(',');
      if(ids2) {
        const pr2 = await cgFetch(`/simple/price?ids=${ids2}&vs_currencies=usd`);
        if(t0Id && !t0Price) t0Price = pr2[t0Id]?.usd||0;
        if(t1Id && !t1Price) t1Price = pr2[t1Id]?.usd||0;
      }
    }
  } catch(e) {}

  return {
    source:    'onchain',
    exchange,
    network:   networkLabel,
    tokenId,
    name:      `${sym0}/${sym1} ${exchange}`,
    fee:       feePct,
    liquidity,
    token0: { symbol:sym0, name:sym0, address:token0Addr, id:t0Id, logo:t0Logo,
              price:t0Price, decimals:dec0, qty:'', usd:'' },
    token1: { symbol:sym1, name:sym1, address:token1Addr, id:t1Id, logo:t1Logo,
              price:t1Price, decimals:dec1, qty:'', usd:'' },
    rangeMin:  priceLow,
    rangeMax:  priceHigh,
    feesUSD:   '0.00',
    date:      new Date().toISOString().split('T')[0],
  };
}


function parseAerodromeUrl(url) {
  const params = new URLSearchParams(url.split('?')[1]||'');
  const t0 = params.get('token0')||''; const t1 = params.get('token1')||'';
  const sym0 = t0 ? t0.slice(0,6).toUpperCase() : 'TOKEN0';
  const sym1 = t1 ? t1.slice(0,6).toUpperCase() : 'TOKEN1';
  return { source:'generic', exchange:'Aerodrome', network:'Base', name:`${sym0}/${sym1} Aerodrome`,
    fee:'0.05', token0:{symbol:sym0, qty:'', usd:''}, token1:{symbol:sym1, qty:'', usd:''}, date:new Date().toISOString().split('T')[0] };
}

function parseSushiUrl(chainId, poolAddr) {
  const chainMap = {'1':'Ethereum','42161':'Arbitrum','137':'Polygon','10':'Optimism','56':'BNB Chain'};
  return { source:'generic', exchange:'SushiSwap', network:chainMap[chainId]||'Ethereum',
    name:`SushiSwap Pool`, fee:'0.3', token0:{symbol:'TOKEN0',qty:'',usd:''}, token1:{symbol:'TOKEN1',qty:'',usd:''},
    date:new Date().toISOString().split('T')[0] };
}

function parseGenericPoolUrl(url) {
  // Try to extract token symbols from common URL patterns
  const symMatch = url.match(/[?&/](eth|usdc|usdt|wbtc|matic|bnb|arb|op|base|sol|dai|weth|link|uni|aave|crv|mkr|snx)[_\-\/](eth|usdc|usdt|wbtc|matic|bnb|arb|op|base|sol|dai|weth|link|uni|aave|crv|mkr|snx)/i);
  if(symMatch) {
    const parts = symMatch[0].slice(1).split(/[_\-\/]/);
    return { source:'generic', exchange:'Exchange', network:'Ethereum', name:`${parts[0].toUpperCase()}/${parts[1].toUpperCase()}`,
      fee:'0.3', token0:{symbol:parts[0].toUpperCase(),qty:'',usd:''}, token1:{symbol:parts[1].toUpperCase(),qty:'',usd:''},
      date:new Date().toISOString().split('T')[0] };
  }
  throw new Error('URL não reconhecida. Tente copiar a URL da página da posição diretamente da exchange.');
}

function renderUrlParseResult(d, container) {
  const isRich  = d.source === 'uniswap_graph' || d.source === 'onchain' || d.source === 'sui_onchain';
  const isSui   = d.network === 'Sui';
  const rows = [
    ['Pool', `${d.token0?.symbol||'—'}/${d.token1?.symbol||'—'}`],
    ['Exchange', d.exchange],
    ['Rede', `${d.network}${isSui?' 🔵':''}`],
    isSui && d.objectId ? ['Object ID', d.objectId.slice(0,18)+'…'+d.objectId.slice(-6)] : null,
    isSui && d.poolId   ? ['Pool ID',   d.poolId.slice(0,18)+'…'+d.poolId.slice(-6)] : null,
    ['Fee tier', d.fee?d.fee+'%':'—'],
    d.token0?.qty ? ['Quantidade '+d.token0.symbol, `${parseFloat(d.token0.qty).toLocaleString('pt-BR',{maximumFractionDigits:6})} ${d.token0.usd?'· $'+parseFloat(d.token0.usd).toLocaleString('pt-BR',{minimumFractionDigits:2}):''}`.trim()] : null,
    d.token1?.qty ? ['Quantidade '+d.token1.symbol, `${parseFloat(d.token1.qty).toLocaleString('pt-BR',{maximumFractionDigits:6})} ${d.token1.usd?'· $'+parseFloat(d.token1.usd).toLocaleString('pt-BR',{minimumFractionDigits:2}):''}`.trim()] : null,
    d.rangeMin && parseFloat(d.rangeMin)>0 ? ['Range de preço', `$${parseFloat(d.rangeMin).toLocaleString('pt-BR',{maximumFractionDigits:4})} – $${parseFloat(d.rangeMax).toLocaleString('pt-BR',{maximumFractionDigits:4})}`] : null,
    d.feesUSD && parseFloat(d.feesUSD)>0 ? ['Taxas já coletadas', `$${parseFloat(d.feesUSD).toLocaleString('pt-BR',{minimumFractionDigits:2})}`] : null,
    isSui && d.token0?.coinType ? ['Coin Type A', d.token0.coinType.length>40?d.token0.coinType.slice(0,20)+'…'+d.token0.coinType.slice(-12):d.token0.coinType] : null,
    isSui && d.token1?.coinType ? ['Coin Type B', d.token1.coinType.length>40?d.token1.coinType.slice(0,20)+'…'+d.token1.coinType.slice(-12):d.token1.coinType] : null,
  ].filter(Boolean);

  container.innerHTML = `
  <div class="url-parse-result">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:.75rem">
      <span style="font-size:16px">✅</span>
      <span style="font-size:13px;font-weight:600;color:var(--green)">
        ${isRich ? (isSui?'Posição Sui importada com sucesso! 🔵':'Posição importada com sucesso!') : 'URL reconhecida — confirme os dados abaixo'}
      </span>
      ${d.tokenId?`<span style="font-size:11px;color:var(--text3)">Position #${d.tokenId}</span>`:''}
    </div>
    ${rows.map(([k,v])=>`<div class="url-parse-row"><span style="color:var(--text2)">${k}</span><span style="font-weight:600;color:var(--text);font-size:${(k.startsWith('Coin')||k.startsWith('Object')||k.startsWith('Pool I'))?'11px':'13px'}">${v}</span></div>`).join('')}
    ${d.suiNote?`<div style="font-size:11px;color:var(--amber);margin-top:.5rem;padding:.5rem;background:var(--amber-bg);border-radius:var(--radius)">ℹ️ ${d.suiNote}</div>`:''}
    ${!isRich?`<div style="font-size:12px;color:var(--text3);margin-top:.5rem">Dados parciais — ao confirmar, você poderá complementar na view de detalhes.</div>`:''}
    ${isSui&&!d.token0?.qty?`<div style="font-size:12px;color:var(--text3);margin-top:.5rem">💡 Dica Sui: o valor exato dos tokens depende do estado atual do pool. Informe as quantidades ao salvar.</div>`:''}
  </div>`;
}

function confirmUrlImport() {
  const d = _urlParsedData;
  if(!d) return;

  const uid = session.user.uid;
  const ts  = Date.now();
  const key = uid+'_pool_'+ts;

  const pool = {
    key, ts, type:'pool',
    name:     d.name || `${d.token0?.symbol||'?'}/${d.token1?.symbol||'?'}`,
    exchange: d.exchange,
    network:  d.network,
    date:     d.date || new Date().toISOString().split('T')[0],
    fee:      d.fee,
    importedFromUrl: document.getElementById('np-url-input')?.value||'',
    token1: {
      id:     d.token0?.id||'',
      symbol: d.token0?.symbol||'',
      logo:   d.token0?.logo||'',
      price:  d.token0?.price||'',
      qty:    d.token0?.qty||'',
      usd:    d.token0?.usd||'',
    },
    token2: {
      id:     d.token1?.id||'',
      symbol: d.token1?.symbol||'',
      logo:   d.token1?.logo||'',
      price:  d.token1?.price||'',
      qty:    d.token1?.qty||'',
      usd:    d.token1?.usd||'',
    },
    rangeMin: d.rangeMin||'',
    rangeMax: d.rangeMax||'',
    fees: d.feesUSD && parseFloat(d.feesUSD)>0
      ? [{ date:d.date, value:parseFloat(d.feesUSD), note:'Importado da exchange' }]
      : [],
  };

  stSet(key, pool);
  fsPersistKey(key, pool);
  syncPoolToWallet(pool, key);
  closeNewPoolModal();
  showToast('Pool importada com sucesso!');
  switchTab('positions');
}

function closeNewPoolModal() {
  const el = document.getElementById('new-pool-overlay');
  if(el) el.remove();
}

// ──────────────────────────────────────────────────────────────────
// BUSCA VIA API - UNISWAP V4 MULTI-CHAIN
// ──────────────────────────────────────────────────────────────────

// Endpoints funcionais - usando The Graph Gateway com fallback
const UNISWAP_V4_ENDPOINTS = {
  // Ethereum - V4 Oficial
  ethereum: 'https://gateway.thegraph.com/api/9bdb3c6cbaaaa7b88dd96cb4e9176be0/subgraphs/id/DiYPVdygkfjDWhbxGSqAQxwBKmfKnkWQojqeM2rkLb3G',
  
  // L2s e outras redes - usando repositório UniKits ou V3 como fallback
  arbitrum: 'https://gateway.thegraph.com/api/9bdb3c6cbaaaa7b88dd96cb4e9176be0/subgraphs/id/2L6yxqUZ7dT6GWoTy9qxNBkf9kEk65me3XPMvbGsmJUZ',
  polygon: 'https://gateway.thegraph.com/api/9bdb3c6cbaaaa7b88dd96cb4e9176be0/subgraphs/id/HqYf5W7kLZeMkRzfqz9pLBYj39rVjrC8AJ7Qs2w8hg6',
  base: 'https://gateway.thegraph.com/api/9bdb3c6cbaaaa7b88dd96cb4e9176be0/subgraphs/id/FTyqr78M9Uj9CpVGhHqd3GG5xJCjPVvBrUHb3EnnQXAA',
  optimism: 'https://gateway.thegraph.com/api/9bdb3c6cbaaaa7b88dd96cb4e9176be0/subgraphs/id/GzMgDDDSXTXq3sN1P3Cd9XTmGCZ8RHfVXTLb6QcG3TcN'
};

const NETWORK_MAP = {
  ethereum: 'Ethereum',
  arbitrum: 'Arbitrum',
  polygon: 'Polygon',
  base: 'Base',
  optimism: 'Optimism (OP Mainnet)',
  binance: 'BNB Chain',
  avalanche: 'Avalanche',
  blast: 'Blast',
  worldchain: 'World Chain',
  zora: 'Zora Network'
};

async function searchUniswapV4Position() {
  const network = document.getElementById('api-network').value;
  const positionId = document.getElementById('api-position-id').value;
  const loadingEl = document.getElementById('api-loading');
  const resultEl = document.getElementById('api-result');
  const errEl = document.getElementById('api-err');

  // Validar inputs
  if(!network || !positionId) {
    errEl.textContent = '⚠️ Selecione uma rede e insira o Position ID';
    errEl.style.display = 'block';
    return;
  }

  // Mostrar loading
  loadingEl.style.display = 'block';
  resultEl.style.display = 'none';
  errEl.style.display = 'none';

  try {
    const endpoint = UNISWAP_V4_ENDPOINTS[network];
    
    if(!endpoint) {
      throw new Error('Subgraph ainda não disponível para esta rede. Tente Ethereum, Arbitrum, Polygon, Base ou Optimism.');
    }

    const query = `
      query {
        position(id: "${positionId}") {
          id
          subscriptions { id }
          unsubscriptions { id }
          transfers { id }
        }
      }
    `;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query }),
      timeout: 8000
    });

    if(!response.ok) {
      throw new Error(`Erro HTTP ${response.status}`);
    }

    const data = await response.json();

    if(data.errors && data.errors.length > 0) {
      const errorMsg = data.errors[0].message;
      if(errorMsg.includes('not found') || errorMsg.includes('null')) {
        throw new Error('Position não encontrada. Verifique se o ID está correto.');
      }
      throw new Error(errorMsg);
    }

    if(!data.data || !data.data.position) {
      throw new Error('Position não encontrada nesta rede. Tente outra rede.');
    }

    const position = data.data.position;

    // Sucesso - processar dados
    processUniswapV4Data(network, positionId, position);

  } catch(e) {
    let errorMsg = '❌ Erro ao buscar dados';
    
    if(e.message.includes('Failed to fetch')) {
      errorMsg = '❌ Conexão recusada. O endpoint pode estar indisponível. Tente: Ethereum, Arbitrum, Polygon, Base ou Optimism.';
    } else if(e.message.includes('Position não encontrada')) {
      errorMsg = '❌ ' + e.message;
    } else if(e.message.includes('Subgraph ainda não disponível')) {
      errorMsg = '⚠️ ' + e.message;
    } else if(e.message.includes('HTTP')) {
      errorMsg = '❌ Erro de conexão com API. Tente novamente.';
    } else {
      errorMsg = '❌ ' + (e.message || 'Erro desconhecido');
    }
    
    errEl.textContent = errorMsg;
    errEl.style.display = 'block';
    errEl.scrollIntoView({behavior:'smooth', block:'nearest'});
    console.error('API Error:', e);
  } finally {
    loadingEl.style.display = 'none';
  }
}

function processUniswapV4Data(network, positionId, position) {
  const resultEl = document.getElementById('api-result');

  // Criar objeto pool com dados obtidos
  const poolData = {
    name: `Position #${positionId}`,
    network: NETWORK_MAP[network],
    networkCode: network,
    exchange: 'Uniswap v4',
    positionId: positionId,
    subscriptions: position.subscriptions?.length || 0,
    transfers: position.transfers?.length || 0,
    date: new Date().toISOString().split('T')[0]
  };

  // Mostrar resultado
  resultEl.innerHTML = `
    <div style="margin-bottom:1rem;background:linear-gradient(135deg,rgba(57,255,138,0.05),rgba(99,142,255,0.05));border:1px solid var(--border);border-radius:var(--radius);padding:1rem">
      <div style="font-size:12px;color:var(--green);margin-bottom:0.5rem;display:flex;align-items:center;gap:6px">
        <span>✓</span> <strong>Posição encontrada!</strong>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:0.75rem">
        <div style="background:var(--bg2);padding:0.75rem;border-radius:var(--radius)">
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Rede</div>
          <div style="font-size:13px;color:var(--text);font-weight:600">${poolData.network}</div>
        </div>
        <div style="background:var(--bg2);padding:0.75rem;border-radius:var(--radius)">
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Position ID</div>
          <div style="font-size:13px;color:var(--text);font-weight:600">#${poolData.positionId}</div>
        </div>
        <div style="background:var(--bg2);padding:0.75rem;border-radius:var(--radius)">
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Transações</div>
          <div style="font-size:13px;color:var(--text)">${poolData.transfers} ${poolData.transfers === 1 ? 'transação' : 'transações'}</div>
        </div>
        <div style="background:var(--bg2);padding:0.75rem;border-radius:var(--radius)">
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Subscriptions</div>
          <div style="font-size:13px;color:var(--text)">${poolData.subscriptions}</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text2);background:var(--bg2);padding:0.75rem;border-radius:var(--radius);margin-top:0.75rem">
        💡 <strong>Próximo passo:</strong> Clique em "Usar estes dados" para preencher automaticamente o formulário. Você poderá adicionar tokens e valores.
      </div>
    </div>
  `;
  resultEl.style.display = 'block';

  // Salvar dados temporariamente
  window._uniswapV4Data = poolData;

  // Mostrar botão de confirmação
  const actionDiv = document.createElement('div');
  actionDiv.style.display = 'flex';
  actionDiv.style.gap = '8px';
  actionDiv.style.marginTop = '1rem';
  actionDiv.innerHTML = `
    <button class="btn btn-primary" onclick="confirmUniswapV4Import()" style="flex:1">✓ Usar estes dados</button>
    <button class="btn" onclick="document.getElementById('api-position-id').focus()" style="flex:1">Tentar outro ID</button>
  `;
  resultEl.appendChild(actionDiv);
}

function confirmUniswapV4Import() {
  const data = window._uniswapV4Data;
  if(!data) return;

  // Preencher formulário manual com dados da API
  document.getElementById('np-name').value = data.name;
  document.getElementById('np-exchange').value = data.exchange;
  document.getElementById('np-network').value = data.network;
  document.getElementById('np-date').value = data.date;

  // Mudar para modo manual para permitir completar os dados
  switchPoolMode('manual');

  // Scroll para o formulário
  setTimeout(() => {
    document.getElementById('np-name').scrollIntoView({behavior:'smooth', block:'nearest'});
  }, 100);

  showToast(`✓ Position #${data.positionId} carregada! Preencha os tokens e valores.`);
}

function saveNewPool() {
  const name = document.getElementById('np-name').value.trim();
  const exchange = document.getElementById('np-exchange').value;
  const network = document.getElementById('np-network').value;
  const date = document.getElementById('np-date').value;
  const t1sym = document.getElementById('np-t1sym').value.trim();
  const errEl = document.getElementById('np-err');

  if(!name || !exchange || !network || !date || !t1sym) {
    errEl.textContent = 'Preencha os campos obrigatórios: nome, exchange, rede, data e selecione o Token 1.';
    errEl.style.display = 'block';
    errEl.scrollIntoView({behavior:'smooth', block:'nearest'});
    return;
  }
  errEl.style.display = 'none';

  const uid = session.user.uid;
  const ts = Date.now();
  const key = uid+'_pool_'+ts;
  const pool = {
    key, ts, type: 'pool',
    name, exchange, network, date,
    fee: document.getElementById('np-fee').value,
    token1: {
      id:     document.getElementById('np-t1id').value,
      symbol: t1sym,
      logo:   document.getElementById('np-t1logo').value,
      price:  document.getElementById('np-t1price').value,
      qty:    document.getElementById('np-t1qty').value,
      usd:    document.getElementById('np-t1usd').value,
      qty0:   document.getElementById('np-t1qty0')?.value || '',
      usd0:   document.getElementById('np-t1usd0')?.value || ''
    },
    token2: {
      id:     document.getElementById('np-t2id').value,
      symbol: document.getElementById('np-t2sym').value.trim(),
      logo:   document.getElementById('np-t2logo').value,
      price:  document.getElementById('np-t2price').value,
      qty:    document.getElementById('np-t2qty').value,
      usd:    document.getElementById('np-t2usd').value,
      qty0:   document.getElementById('np-t2qty0')?.value || '',
      usd0:   document.getElementById('np-t2usd0')?.value || ''
    },
    rangeMin: document.getElementById('np-rmin').value,
    rangeMax: document.getElementById('np-rmax').value,
    fees: []
  };
  stSet(key, pool);
  fsPersistKey(key, pool);
  syncPoolToWallet(pool, key);
  closeNewPoolModal();
  showToast('Pool criada com sucesso!');
  switchTab('positions');
}

/* ── CoinGecko token search ── */
const CG_KEY = 'CG-c89qMzSEqSkJsZDC1iJZvwmM';
const cgCache = {};
let searchTimers = {};
let dropdownActive = { t1: -1, t2: -1 };

const _cgCache = {};
const _CG_CACHE_TTL = 90000; // 90s cache

async function cgFetch(path, retries=2) {
  const cacheKey = path;
  const cached = _cgCache[cacheKey];
  if(cached && Date.now() - cached.ts < _CG_CACHE_TTL) return cached.data;

  const sep = path.includes('?') ? '&' : '?';
  const url = `https://api.coingecko.com/api/v3${path}${sep}x_cg_demo_api_key=${CG_KEY}`;

  for(let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if(res.status === 429) {
        // Rate limited — wait and retry
        const wait = (attempt + 1) * 2000;
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if(!res.ok) throw new Error(`CoinGecko ${res.status}`);
      const data = await res.json();
      _cgCache[cacheKey] = { data, ts: Date.now() };
      return data;
    } catch(e) {
      if(attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('CoinGecko unreachable after retries');
}

/* ══════════════════════════════════════════
   STOCK / B3 PRICE FETCHER
   Uses Yahoo Finance query2 API (no key needed)
   B3 tickers: add .SA suffix  (PETR4.SA, VALE3.SA)
   US tickers: plain (AAPL, TSLA, SPY)
   ══════════════════════════════════════════ */
const stockCache = {};

async function fetchStockPrice(ticker) {
  const upper = ticker.toUpperCase().trim();
  if(stockCache[upper] && Date.now()-stockCache[upper].ts < 300000) return stockCache[upper];

  // Try with .SA suffix for B3 if no dot present and looks like B3 (ends in digit or 3/4/11)
  const isB3 = !upper.includes('.') && /\d$/.test(upper);
  const sym  = isB3 ? upper+'.SA' : upper;

  try {
    // Yahoo Finance v8 quote endpoint — CORS friendly
    const r = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`,
      { headers: { 'Accept': 'application/json' } }
    );
    if(!r.ok) throw new Error('yf '+r.status);
    const d = await r.json();
    const meta = d?.chart?.result?.[0]?.meta;
    if(!meta) throw new Error('no meta');

    const price    = meta.regularMarketPrice || meta.previousClose || 0;
    const prevClose= meta.previousClose || price;
    const chg24    = prevClose>0 ? ((price-prevClose)/prevClose)*100 : 0;
    const currency = meta.currency||'USD';
    const longName = meta.longName || meta.shortName || upper;

    // Convert BRL to USD if B3
    let priceUSD = price;
    if(currency === 'BRL') {
      try {
        const fxR = await fetch('https://query2.finance.yahoo.com/v8/finance/chart/USDBRL=X?interval=1d&range=1d');
        const fxD = await fxR.json();
        const brlRate = fxD?.chart?.result?.[0]?.meta?.regularMarketPrice || 5.0;
        priceUSD = price / brlRate;
      } catch(e) { priceUSD = price / 5.0; } // fallback rate
    }

    const result = { ts: Date.now(), ticker:sym, symbol:upper, name:longName,
      price:priceUSD, priceLocal:price, currency, chg24, isStock:true, isB3 };
    stockCache[upper] = result;
    return result;
  } catch(e) {
    return null;
  }
}

/* Decides whether a search query should use stocks or CoinGecko */
function isStockCategory(category) {
  return ['Ações B3','Ações EUA','ETF BR','ETF EUA','BDR','FII','Renda Fixa'].includes(category);
}

// Lista pré-carregada de ativos B3 — usada como sugestão instantânea enquanto API carrega
const B3_ASSETS_BUILTIN = [
  // Cripto B3
  { symbol:'OBTC3',  longname:'iShares Bitcoin Fundo',        exchange:'SAO', typeDisp:'ETF' },
  { symbol:'COIN11', longname:'Crypto 20 Índice',              exchange:'SAO', typeDisp:'ETF' },
  { symbol:'HASH11', longname:'Hashdex Nasdaq Crypto Index',   exchange:'SAO', typeDisp:'ETF' },
  { symbol:'BITH11', longname:'Bitcoin Hashdex ETF',           exchange:'SAO', typeDisp:'ETF' },
  { symbol:'ETHE11', longname:'Ethereum Hashdex ETF',          exchange:'SAO', typeDisp:'ETF' },
  { symbol:'DEFI11', longname:'DeFi Hashdex ETF',              exchange:'SAO', typeDisp:'ETF' },
  { symbol:'WEB311', longname:'Web3 ETF',                      exchange:'SAO', typeDisp:'ETF' },
  // Ações Blue Chips
  { symbol:'PETR4',  longname:'Petrobras PN',                  exchange:'SAO', typeDisp:'Ação' },
  { symbol:'PETR3',  longname:'Petrobras ON',                  exchange:'SAO', typeDisp:'Ação' },
  { symbol:'VALE3',  longname:'Vale ON',                       exchange:'SAO', typeDisp:'Ação' },
  { symbol:'ITUB4',  longname:'Itaú Unibanco PN',              exchange:'SAO', typeDisp:'Ação' },
  { symbol:'ITUB3',  longname:'Itaú Unibanco ON',              exchange:'SAO', typeDisp:'Ação' },
  { symbol:'BBDC4',  longname:'Bradesco PN',                   exchange:'SAO', typeDisp:'Ação' },
  { symbol:'BBDC3',  longname:'Bradesco ON',                   exchange:'SAO', typeDisp:'Ação' },
  { symbol:'ABEV3',  longname:'Ambev ON',                      exchange:'SAO', typeDisp:'Ação' },
  { symbol:'WEGE3',  longname:'WEG ON',                        exchange:'SAO', typeDisp:'Ação' },
  { symbol:'RENT3',  longname:'Localiza ON',                   exchange:'SAO', typeDisp:'Ação' },
  { symbol:'JBSS3',  longname:'JBS ON',                        exchange:'SAO', typeDisp:'Ação' },
  { symbol:'LREN3',  longname:'Lojas Renner ON',               exchange:'SAO', typeDisp:'Ação' },
  { symbol:'MGLU3',  longname:'Magazine Luiza ON',             exchange:'SAO', typeDisp:'Ação' },
  { symbol:'B3SA3',  longname:'B3 ON',                         exchange:'SAO', typeDisp:'Ação' },
  { symbol:'BBAS3',  longname:'Banco do Brasil ON',            exchange:'SAO', typeDisp:'Ação' },
  { symbol:'CSAN3',  longname:'Cosan ON',                      exchange:'SAO', typeDisp:'Ação' },
  { symbol:'CSNA3',  longname:'CSN ON',                        exchange:'SAO', typeDisp:'Ação' },
  { symbol:'ELET3',  longname:'Eletrobrás ON',                 exchange:'SAO', typeDisp:'Ação' },
  { symbol:'ELET6',  longname:'Eletrobrás PNB',                exchange:'SAO', typeDisp:'Ação' },
  { symbol:'SUZB3',  longname:'Suzano ON',                     exchange:'SAO', typeDisp:'Ação' },
  { symbol:'RADL3',  longname:'Raia Drogasil ON',              exchange:'SAO', typeDisp:'Ação' },
  { symbol:'EQTL3',  longname:'Equatorial ON',                 exchange:'SAO', typeDisp:'Ação' },
  { symbol:'GGBR4',  longname:'Gerdau PN',                     exchange:'SAO', typeDisp:'Ação' },
  { symbol:'GGBR3',  longname:'Gerdau ON',                     exchange:'SAO', typeDisp:'Ação' },
  { symbol:'HAPV3',  longname:'Hapvida ON',                    exchange:'SAO', typeDisp:'Ação' },
  { symbol:'RAIL3',  longname:'Rumo ON',                       exchange:'SAO', typeDisp:'Ação' },
  { symbol:'PRIO3',  longname:'PetroRio ON',                   exchange:'SAO', typeDisp:'Ação' },
  { symbol:'SBSP3',  longname:'Sabesp ON',                     exchange:'SAO', typeDisp:'Ação' },
  { symbol:'EMBR3',  longname:'Embraer ON',                    exchange:'SAO', typeDisp:'Ação' },
  { symbol:'TOTS3',  longname:'Totvs ON',                      exchange:'SAO', typeDisp:'Ação' },
  { symbol:'LWSA3',  longname:'Locaweb ON',                    exchange:'SAO', typeDisp:'Ação' },
  { symbol:'PETZ3',  longname:'Petz ON',                       exchange:'SAO', typeDisp:'Ação' },
  { symbol:'MELI34', longname:'MercadoLibre BDR',              exchange:'SAO', typeDisp:'BDR' },
  { symbol:'AMZO34', longname:'Amazon BDR',                    exchange:'SAO', typeDisp:'BDR' },
  { symbol:'GOGL34', longname:'Google BDR',                    exchange:'SAO', typeDisp:'BDR' },
  { symbol:'AAPL34', longname:'Apple BDR',                     exchange:'SAO', typeDisp:'BDR' },
  { symbol:'MSFT34', longname:'Microsoft BDR',                 exchange:'SAO', typeDisp:'BDR' },
  { symbol:'NVDC34', longname:'Nvidia BDR',                    exchange:'SAO', typeDisp:'BDR' },
  { symbol:'TSLA34', longname:'Tesla BDR',                     exchange:'SAO', typeDisp:'BDR' },
  { symbol:'META34', longname:'Meta BDR',                      exchange:'SAO', typeDisp:'BDR' },
  // ETFs B3
  { symbol:'IVVB11', longname:'iShares S&P 500 ETF',           exchange:'SAO', typeDisp:'ETF' },
  { symbol:'XSPR11', longname:'Investo S&P 500 ETF',           exchange:'SAO', typeDisp:'ETF' },
  { symbol:'DIVO11', longname:'It Now S&P Dividendos ETF',     exchange:'SAO', typeDisp:'ETF' },
  { symbol:'SMAL11', longname:'iShares Small Cap ETF',         exchange:'SAO', typeDisp:'ETF' },
  { symbol:'BOVA11', longname:'iShares Ibovespa ETF',          exchange:'SAO', typeDisp:'ETF' },
  { symbol:'BOVB11', longname:'Bradesco Ibovespa ETF',         exchange:'SAO', typeDisp:'ETF' },
  { symbol:'SPXI11', longname:'iShares S&P 500 BRL ETF',       exchange:'SAO', typeDisp:'ETF' },
  { symbol:'GOLD11', longname:'Ouro ETF',                      exchange:'SAO', typeDisp:'ETF' },
  { symbol:'EURP11', longname:'Euro ETF',                      exchange:'SAO', typeDisp:'ETF' },
  { symbol:'NASDAQ11',longname:'Nasdaq 100 ETF',               exchange:'SAO', typeDisp:'ETF' },
  // FIIs
  { symbol:'KNCI11', longname:'Kinea Índices de Preços',       exchange:'SAO', typeDisp:'FII' },
  { symbol:'BCFF11', longname:'BC Fundos Imobiliários',        exchange:'SAO', typeDisp:'FII' },
  { symbol:'HGLG11', longname:'CSHG Logística',                exchange:'SAO', typeDisp:'FII' },
  { symbol:'VISC11', longname:'Vinci Shopping Centers',        exchange:'SAO', typeDisp:'FII' },
  { symbol:'XPLG11', longname:'XP Log',                        exchange:'SAO', typeDisp:'FII' },
  { symbol:'MXRF11', longname:'Maxi Renda',                    exchange:'SAO', typeDisp:'FII' },
  { symbol:'RECR11', longname:'REC Recebíveis Imobiliários',   exchange:'SAO', typeDisp:'FII' },
  { symbol:'BTLG11', longname:'BTG Pactual Logística',         exchange:'SAO', typeDisp:'FII' },
];

async function stockSearch(query, category) {
  const q = query.trim().toUpperCase();
  if(!q || q.length < 1) return [];

  // 1️⃣ Resultados locais imediatos (lista acima)
  const localResults = B3_ASSETS_BUILTIN.filter(a =>
    a.symbol.includes(q) || a.longname.toUpperCase().includes(q)
  );

  // 2️⃣ Busca no Yahoo Finance com sufixo .SA para B3
  const isB3Cat = ['Ações B3','ETF BR','FII','BDR'].includes(category);
  const isUSCat = ['Ações EUA','ETF EUA'].includes(category);
  const searchQ = isB3Cat ? q + '.SA' : q;

  try {
    const r = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchQ)}&lang=pt-BR&region=BR&quotesCount=10&newsCount=0&enableFuzzyQuery=false`,
      { headers: { 'Accept': 'application/json' } }
    );

    if(r.ok) {
      const d = await r.json();
      let quotes = (d?.quotes || []).filter(qt => {
        if(isB3Cat) return qt.exchange === 'SAO' || qt.symbol?.endsWith('.SA');
        if(isUSCat) return ['NYQ','NMS','NGM','PCX','ASE','BTS'].includes(qt.exchange);
        return true;
      });

      // Normalizar símbolos B3 (remover .SA do display)
      quotes = quotes.map(qt => ({
        ...qt,
        symbol: isB3Cat ? qt.symbol.replace('.SA','') : qt.symbol,
        longname: qt.longname || qt.shortname || qt.symbol,
      }));

      // Juntar local + Yahoo, sem duplicatas
      const symbols = new Set(quotes.map(q => q.symbol));
      const merged = [...quotes, ...localResults.filter(l => !symbols.has(l.symbol))];
      return merged.slice(0, 10);
    }
  } catch(e) {
    console.warn('Yahoo Finance search falhou, usando lista local:', e.message);
  }

  // 3️⃣ Fallback: só lista local
  return localResults.length > 0 ? localResults : B3_ASSETS_BUILTIN.slice(0, 8);
}

async function tokenSearchStock(input, slot, category) {
  const q   = input.value.trim();
  const dd  = document.getElementById(slot === 'wa' ? 'wa-dropdown' : slot+'-dropdown');
  clearTimeout(searchTimers[slot]);
  if(q.length < 1) { dd.style.display='none'; return; }
  dd.style.display='block';
  dd.innerHTML = '<div class="token-search-status">Buscando em bolsas de valores...</div>';
  searchTimers[slot] = setTimeout(async ()=>{
    try {
      const results = await stockSearch(q, category);
      if(!results.length) {
        // If no results, show manual entry option
        dd.innerHTML = `<div class="token-search-status" style="text-align:left;padding:10px 12px">
          <div style="margin-bottom:6px">Nenhum resultado. Insira o ticker manualmente:</div>
          <button class="btn btn-sm" onmousedown="selectStockManual('${slot}','${q.toUpperCase()}')">
            Usar "${q.toUpperCase()}" como ticker
          </button>
        </div>`;
        return;
      }
      dropdownActive[slot] = -1;
      dd.innerHTML = results.map((qt,i)=>{
        const sym  = qt.symbol||'';
        const name = qt.shortname||qt.longname||sym;
        const exch = qt.exchange||'';
        const type = qt.typeDisp||qt.quoteType||'';
        return `<div class="token-item" data-idx="${i}"
          onmousedown="selectStockToken('${slot}','${sym}','${sym.replace('.SA','')}','${name.replace(/'/g,"\\'")}','${exch}','${category}')"
          onmouseover="setDropdownActive('${slot}',${i})">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--blue-bg);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--blue-text);flex-shrink:0">${sym.replace('.SA','').slice(0,3)}</div>
          <div class="token-item-info">
            <div class="token-item-name">${name}</div>
            <div class="token-item-sym">${sym} · ${exch} · ${type}</div>
          </div>
          <div class="token-item-price" style="font-size:10px;color:var(--text3)">Clique para selecionar</div>
        </div>`;
      }).join('');
    } catch(e) {
      dd.innerHTML = '<div class="token-search-status">Erro na busca. Verifique o ticker.</div>';
    }
  }, 350);
}

async function selectStockToken(slot, yfsym, displaySym, name, exchange, category) {
  const dd = document.getElementById(slot === 'wa' ? 'wa-dropdown' : slot+'-dropdown');
  if(dd) dd.style.display='none';

  // Show loading state
  const priceField = document.getElementById('wa-buyprice');
  if(priceField) priceField.placeholder = 'Buscando preço...';

  const data = await fetchStockPrice(yfsym);
  const price = data?.price || 0;
  const isBRL = data?.currency === 'BRL';

  // For wallet slot
  if(slot === 'wa') {
    document.getElementById('np-wasym').value  = displaySym;
    document.getElementById('np-waname').value = name;
    document.getElementById('np-waid').value   = 'STOCK:'+yfsym;  // special prefix
    document.getElementById('np-walogo').value = '';
    document.getElementById('np-waprice').value= price;

    const nameInput = document.getElementById('wa-search');
    if(nameInput) nameInput.value = '';

    // Show selected token pill
    const sel = document.getElementById('wa-t1-selected');
    if(sel) {
      sel.style.display='block';
      sel.innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius)">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--blue-bg);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--blue-text)">${displaySym.slice(0,3)}</div>
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--text)">${displaySym} — ${name}</div>
          <div style="font-size:12px;color:var(--text2)">${exchange} · Preço atual: $${price.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4})} USD${isBRL?' (convertido de BRL)':''}</div>
        </div>
        <button class="btn btn-sm" style="margin-left:auto" onclick="clearStockSelection('wa')">✕</button>
      </div>`;
    }

    // Auto-fill buy price with current price
    if(priceField && !priceField.value) {
      priceField.value = price.toFixed(4);
      priceField.placeholder = '0.00';
      waCalcTotal();
    } else if(priceField) {
      priceField.placeholder = '0.00';
    }
  }
}

async function selectStockManual(slot, ticker) {
  const dd = document.getElementById(slot === 'wa' ? 'wa-dropdown' : slot+'-dropdown');
  if(dd) dd.style.display='none';
  // Try fetching price anyway, even for manual ticker
  await selectStockToken(slot, ticker, ticker, ticker, 'Manual', document.getElementById('wa-category')?.value||'Ações EUA');
}

function clearStockSelection(slot) {
  document.getElementById('np-wasym').value = '';
  document.getElementById('np-waname').value= '';
  document.getElementById('np-waid').value  = '';
  document.getElementById('np-walogo').value= '';
  document.getElementById('np-waprice').value='';
  const sel = document.getElementById('wa-t1-selected');
  if(sel) sel.style.display='none';
  const inp = document.getElementById('wa-search');
  if(inp) { inp.value=''; inp.focus(); }
}



async function tokenSearch(input, slot) {
  const q = input.value.trim();
  const dd = document.getElementById(slot+'-dropdown');
  clearTimeout(searchTimers[slot]);
  if(q.length < 2) { dd.style.display='none'; return; }
  dd.style.display='block';
  dd.innerHTML = '<div class="token-search-status">Buscando...</div>';
  searchTimers[slot] = setTimeout(async ()=>{
    try {
      const cacheKey = 'cg_search_'+q.toLowerCase();
      let results = cgCache[cacheKey];
      if(!results) {
        const res = await cgFetch(`/search?query=${encodeURIComponent(q)}`);
        const data = res;
        results = (data.coins||[]).slice(0,8);
        cgCache[cacheKey] = results;
      }
      if(!results.length) { dd.innerHTML='<div class="token-search-status">Nenhum token encontrado</div>'; return; }

      const ids = results.map(r=>r.id).join(',');
      const priceKey = 'cg_price_'+ids;
      let prices = cgCache[priceKey];
      if(!prices) {
        const pr = await cgFetch(`/simple/price?ids=${ids}&vs_currencies=usd`);
        prices = pr;
        cgCache[priceKey] = prices;
      }

      dropdownActive[slot] = -1;
      dd.innerHTML = results.map((coin, i) => {
        const price = prices[coin.id]?.usd;
        const priceStr = price != null
          ? price < 0.01 ? '$'+price.toFixed(6)
          : price < 1    ? '$'+price.toFixed(4)
          : '$'+price.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
          : '';
        return `<div class="token-item" data-idx="${i}"
          onmousedown="selectToken('${slot}','${coin.id}','${coin.symbol.toUpperCase()}','${coin.name.replace(/'/g,"\\'")}','${coin.large||coin.thumb||''}',${price||0})"
          onmouseover="setDropdownActive('${slot}',${i})">
          <img src="${coin.thumb||''}" onerror="this.style.display='none'" loading="lazy">
          <div class="token-item-info">
            <div class="token-item-name">${coin.name}</div>
            <div class="token-item-sym">${coin.symbol.toUpperCase()} · rank #${coin.market_cap_rank||'—'}</div>
          </div>
          <div class="token-item-price">${priceStr}</div>
        </div>`;
      }).join('');
    } catch(e) {
      dd.innerHTML = '<div class="token-search-status">Erro ao buscar. Verifique sua conexão.</div>';
    }
  }, 350);
}

function setDropdownActive(slot, idx) {
  dropdownActive[slot] = idx;
  document.querySelectorAll(`#${slot}-dropdown .token-item`).forEach((el,i)=>el.classList.toggle('active',i===idx));
}

function tokenKeyNav(e, slot) {
  const dd = document.getElementById(slot+'-dropdown');
  if(dd.style.display==='none') return;
  const items = dd.querySelectorAll('.token-item');
  if(!items.length) return;
  if(e.key==='ArrowDown') {
    e.preventDefault();
    dropdownActive[slot] = Math.min(dropdownActive[slot]+1, items.length-1);
    items.forEach((el,i)=>el.classList.toggle('active',i===dropdownActive[slot]));
    items[dropdownActive[slot]]?.scrollIntoView({block:'nearest'});
  } else if(e.key==='ArrowUp') {
    e.preventDefault();
    dropdownActive[slot] = Math.max(dropdownActive[slot]-1, 0);
    items.forEach((el,i)=>el.classList.toggle('active',i===dropdownActive[slot]));
    items[dropdownActive[slot]]?.scrollIntoView({block:'nearest'});
  } else if(e.key==='Enter' && dropdownActive[slot]>=0) {
    e.preventDefault();
    items[dropdownActive[slot]]?.dispatchEvent(new MouseEvent('mousedown'));
  } else if(e.key==='Escape') {
    dd.style.display='none';
    dropdownActive[slot] = -1;
  }
}

function selectToken(slot, id, symbol, name, logo, price) {
  document.getElementById('np-'+slot+'id').value    = id;
  document.getElementById('np-'+slot+'sym').value   = symbol;
  document.getElementById('np-'+slot+'price').value = price;
  document.getElementById('np-'+slot+'logo').value  = logo;

  // Also populate visible price-input field (for IL calculation)
  const pinp = document.getElementById('np-'+slot+'price-input');
  if(pinp && price>0) pinp.value = price < 0.000001 ? price.toFixed(10)
    : price < 0.01 ? price.toFixed(8) : price < 1 ? price.toFixed(6) : price.toFixed(4);

  const dd = document.getElementById(slot+'-dropdown');
  dd.style.display = 'none';
  document.getElementById('np-'+slot+'search').value = '';

  const priceStr = price < 0.01 ? '$'+price.toFixed(6)
    : price < 1 ? '$'+price.toFixed(4)
    : '$'+price.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});

  const selEl = document.getElementById(slot+'-selected');
  selEl.style.display = 'flex';
  selEl.className = 'token-selected';
  selEl.innerHTML = `
    ${logo?`<img src="${logo}" onerror="this.style.display='none'" style="width:28px;height:28px;border-radius:50%">`:''}
    <div class="token-selected-info">
      <div class="token-selected-name">${name} <span style="color:var(--text2);font-weight:400">(${symbol})</span></div>
      <div class="token-selected-price">Preço atual: <strong>${priceStr}</strong></div>
    </div>
    <button class="btn btn-sm" style="font-size:11px" onclick="clearToken('${slot}')">Trocar</button>`;

  recalcUSD(slot);
  dropdownActive[slot] = -1;
}

function clearToken(slot) {
  document.getElementById('np-'+slot+'id').value    = '';
  document.getElementById('np-'+slot+'sym').value   = '';
  document.getElementById('np-'+slot+'price').value = '';
  document.getElementById('np-'+slot+'logo').value  = '';
  document.getElementById('np-'+slot+'usd').value   = '';
  const pinp = document.getElementById('np-'+slot+'price-input');
  if(pinp) pinp.value = '';
  document.getElementById(slot+'-selected').style.display = 'none';
  document.getElementById('np-'+slot+'search').value = '';
  document.getElementById('np-'+slot+'search').focus();
}

function recalcUSD(slot) {
  const price = parseFloat(document.getElementById('np-'+slot+'price').value)||0;
  const qty   = parseFloat(document.getElementById('np-'+slot+'qty').value)||0;
  const usdEl = document.getElementById('np-'+slot+'usd');
  if(price>0 && qty>0) {
    usdEl.value = (price*qty).toFixed(2);
    // Sync visible price-input field
    const pinp = document.getElementById('np-'+slot+'price-input');
    if(pinp && !pinp.value) pinp.value = price;
  } else {
    usdEl.value = '';
  }
}

function manualUSD(slot) {
  // user typed USD manually — clear hidden price (will be recalculated from qty)
  document.getElementById('np-'+slot+'price').value = '';
}

// Called when user types in the visible "Preço de entrada" field
function poolManualSetPrice(slot) {
  const priceInput = document.getElementById('np-'+slot+'price-input');
  const hidden     = document.getElementById('np-'+slot+'price');
  const price = parseFloat(priceInput?.value)||0;
  if(hidden) hidden.value = price || '';
  // Auto-calc USD if qty already filled
  const qty = parseFloat(document.getElementById('np-'+slot+'qty')?.value)||0;
  const usdEl = document.getElementById('np-'+slot+'usd');
  if(price>0 && qty>0 && usdEl) usdEl.value = (price*qty).toFixed(2);
}

// Called when qty or USD changes — backfill the visible price field
function poolManualCalcPrice(slot) {
  const qty   = parseFloat(document.getElementById('np-'+slot+'qty')?.value)||0;
  const usd   = parseFloat(document.getElementById('np-'+slot+'usd')?.value)||0;
  const pinp  = document.getElementById('np-'+slot+'price-input');
  const hidden= document.getElementById('np-'+slot+'price');
  if(qty>0 && usd>0) {
    const p = usd/qty;
    if(pinp && !pinp.value) pinp.value = p.toFixed(6);
    if(hidden) hidden.value = p;
  }
}

// Also sync visible price field when a token is selected from search
// (price comes from CoinGecko via selectToken)

document.addEventListener('click', e=>{
  ['t1','t2'].forEach(slot=>{
    const dd = document.getElementById(slot+'-dropdown');
    const inp = document.getElementById('np-'+slot+'search');
    if(dd && inp && !dd.contains(e.target) && e.target!==inp) {
      dd.style.display = 'none';
    }
  });
});

async function fetchLivePrice(coinId, safeKey) {
  if(!coinId) { showToast('Token sem ID — insira o preço manualmente.'); return; }
  const inp = document.getElementById('il-live-price-'+safeKey);
  const oldPh = inp.placeholder;
  inp.placeholder = 'Buscando...';
  try {
    const cacheKey = 'cg_live_'+coinId;
    let price = cgCache[cacheKey];
    if(!price) {
      const data = await cgFetch(`/simple/price?ids=${coinId}&vs_currencies=usd`);
      price = data[coinId]?.usd;
      if(price) { cgCache[cacheKey] = price; setTimeout(()=>{ delete cgCache[cacheKey]; }, 60000); }
    }
    if(price) { inp.value = price; inp.placeholder = ''; }
    else { inp.placeholder = oldPh; showToast('Preço não encontrado.'); }
  } catch(e) { inp.placeholder = oldPh; showToast('Erro ao buscar preço. Verifique sua conexão.'); }
}

function calcLiveIL(poolKey, safeKey) {
  const pool = stGet(poolKey);
  if(!pool) return;
  const p0 = parseFloat(pool.token1.price)||0;
  const p1 = parseFloat(document.getElementById('il-live-price-'+safeKey).value)||0;
  const dep = parseFloat(pool.token1.usd||0) + parseFloat(pool.token2.usd||0);
  const resEl = document.getElementById('il-live-result-'+safeKey);
  if(!p0||!p1) { resEl.innerHTML='<div class="err">Informe o preço atual do token.</div>'; return; }
  if(!dep)     { resEl.innerHTML='<div class="err">Pool sem valor de depósito registrado.</div>'; return; }

  const ratio = p1/p0;
  const il = calcILFormula(ratio);
  // Support non-50/50 pools: use actual token amounts if available
  const usdA = parseFloat(pool.token1?.usd || 0);
  const usdB = parseFloat(pool.token2?.usd || 0);
  const amtA0 = usdA > 0 ? usdA/p0 : (dep/2)/p0;
  const amtB0 = usdB > 0 ? usdB     : dep/2;
  const k = amtA0 * amtB0;
  const holdVal = amtA0*p1 + amtB0;
  const amtA1 = Math.sqrt(k/p1), amtB1 = Math.sqrt(k*p1);
  const poolVal = amtA1*p1 + amtB1;
  const ilUSD = poolVal - holdVal;
  const fees = pool.fees||[];
  const totalFees = fees.reduce((s,f)=>s+parseFloat(f.value||0),0);
  const netPnL = ilUSD + totalFees;
  const priceChg = (ratio-1)*100;

  resEl.innerHTML = `
  <div class="grid4" style="margin-top:.5rem">
    <div class="mc"><div class="lbl">Impermanent Loss</div><div class="val neg">${(il*100).toFixed(2)}%</div><div class="sub2">${fmt(ilUSD)}</div></div>
    <div class="mc"><div class="lbl">${t('pool_value')}</div><div class="val">${fmt(poolVal)}</div></div>
    <div class="mc"><div class="lbl">${t('hodl_value')}</div><div class="val">${fmt(holdVal)}</div></div>
    <div class="mc"><div class="lbl">${t('net_pnl')}</div><div class="val ${netPnL>=0?'pos':'neg'}">${netPnL>=0?'+':'-'}${fmt(netPnL)}</div><div class="sub2">IL + ${t('fees').toLowerCase()}</div></div>
  </div>
  <div style="font-size:12px;color:var(--text2);margin-top:8px;padding:8px;background:var(--bg2);border-radius:var(--radius)">
    ${pool.token1.symbol} entrada 
    <strong>$${parseFloat(p0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4})}</strong>
    → atual <strong>$${parseFloat(p1).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4})}</strong>
    (<span style="color:${priceChg>=0?'var(--green)':'var(--red)'};font-weight:500">${priceChg>=0?'+':''}${priceChg.toFixed(2)}%</span>) &nbsp;·&nbsp;
    ${t('fees')}: <strong style="color:var(--green)">$${totalFees.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>
  </div>`;
}

/* ══════════════════════════════════════════
   WALLET MODULE
   Stores: uid_wallet_assets = [{id, symbol, name, logo, qty, buyPrice, category, ts}]
   ══════════════════════════════════════════ */

const WALLET_KEY = () => session.user.uid + '_wallet_assets';
const YIELD_KEY  = () => session.user.uid + '_yield_entries';

function yLoad() { return stGet(YIELD_KEY()) || []; }
function ySave(entries) {
  stSet(YIELD_KEY(), entries);
  fbDb.collection('users').doc(session.user.uid)
    .set({ yield_entries: entries }, { merge: true })
    .catch(e => console.warn('ySave error', e));
}
function yTotalUSD() {
  return yLoad().reduce((s, e) => s + parseFloat(e.valueUSD || 0), 0);
}
const WALLET_COLORS = ['#638eff','#39ff8a','#ff5370','#ffb74d','#c084fc','#22d3ee','#f97316','#a3e635','#f472b6','#34d399'];

function wLoad() {
  return stGet(WALLET_KEY()) || [];
}

/* ── Módulos configuráveis ── */
const ALL_MODULES = [
  { id:'home',        label:'Home / Notícias',  desc:'Revista financeira, market tickers e artigos',   icon:'📰', group:'principal', core:false, defaultOn:true  },
  { id:'dashboard',   label:'Dashboard',        desc:'Painel de patrimônio e resumo de posições',       icon:'⬡',  group:'principal', core:true,  defaultOn:true  },
  { id:'positions',   label:'Pool de Liquidez',  desc:'Gestão de pools de liquidez DeFi',                icon:'⬡',  group:'principal', core:false, defaultOn:true  },
  { id:'copytrading', label:'Copy Trading',      desc:'Acompanhamento de contas e sinais',              icon:'📡', group:'principal', core:false, defaultOn:true  },
  { id:'options',     label:'Opções',           desc:'Operações de opções de ações e cripto',           icon:'◎',  group:'principal', core:false, defaultOn:true  },
  { id:'wallet',      label:'Carteira',         desc:'Gestão de ativos: cripto, ações e ETFs',          icon:'💼', group:'gestao',    core:false, defaultOn:true  },
  { id:'finance',     label:'Finanças / ERP',   desc:'Controle de receitas, despesas e fluxo de caixa', icon:'💵', group:'gestao',    core:false, defaultOn:true  },
];

function modulesLoad() {
  const saved = stGet(session?.user?.uid + '_modules');
  if(!saved) return Object.fromEntries(ALL_MODULES.map(m=>[m.id, m.defaultOn]));
  const result = {};
  ALL_MODULES.forEach(m => { result[m.id] = saved[m.id] !== undefined ? saved[m.id] : m.defaultOn; });
  return result;
}
function modulesSave(map) {
  stSet(session.user.uid + '_modules', map);
  fbDb.collection('users').doc(session.user.uid).set({ modules: map }, { merge: true }).catch(e => console.warn('modulesSave error', e));
}
function moduleEnabled(id) { return modulesLoad()[id] !== false; }

function wSave(assets) {
  stSet(WALLET_KEY(), assets);
  fbDb.collection('users').doc(session.user.uid).set({ wallet_assets: assets }, { merge: true }).catch(e => console.warn('wSave error', e));
}

/* ── Pool ↔ Wallet sync ──────────────────────────────────────────
   Assets provenientes de pools são marcados com source:'pool' e poolKey.
   São exibidos na carteira mas EXCLUÍDOS do totalWallet do dashboard
   (para evitar duplicidade, já que pools entram via totalPoolValue).
   ──────────────────────────────────────────────────────────────── */
function syncPoolToWallet(pool, poolKey) {
  if (!pool || !poolKey) return;
  const assets  = wLoad();
  // Determina quantidades: último snapshot > qty original
  const snaps   = pool.snapshots || [];
  const last    = snaps.length > 0 ? snaps[snaps.length - 1] : null;
  const tokens  = [];
  if (pool.token1?.symbol) tokens.push({
    symbol:   pool.token1.symbol.toUpperCase(),
    name:     pool.token1.name || pool.token1.symbol,
    logo:     pool.token1.logo || '',
    buyPrice: parseFloat(pool.token1.price || 0),
    qty:      last ? parseFloat(last.qtyA || pool.token1.qty || 0)
                   : parseFloat(pool.token1.qty || 0),
    slot: 'A'
  });
  if (pool.token2?.symbol) tokens.push({
    symbol:   pool.token2.symbol.toUpperCase(),
    name:     pool.token2.name || pool.token2.symbol,
    logo:     pool.token2.logo || '',
    buyPrice: parseFloat(pool.token2.price || 0),
    qty:      last ? parseFloat(last.qtyB || pool.token2.qty || 0)
                   : parseFloat(pool.token2.qty || 0),
    slot: 'B'
  });

  tokens.forEach(tok => {
    const idx = assets.findIndex(a => a.source === 'pool' && a.poolKey === poolKey && a.symbol === tok.symbol);
    if (idx >= 0) {
      // Atualiza qty (e preço de entrada, caso seja primeiro sync)
      assets[idx].qty      = tok.qty;
      assets[idx].buyPrice = tok.buyPrice;
      assets[idx].logo     = tok.logo || assets[idx].logo;
    } else {
      assets.push({
        ts:        Date.now() + (tok.slot === 'B' ? 1 : 0),
        symbol:    tok.symbol,
        name:      tok.name,
        logo:      tok.logo,
        buyPrice:  tok.buyPrice,
        qty:       tok.qty,
        category:  'DeFi / Pool',
        targetAlloc: 0,
        source:    'pool',
        poolKey:   poolKey,
        poolName:  pool.name || pool.token1?.symbol + '/' + pool.token2?.symbol
      });
    }
  });
  wSave(assets);
}

function unsyncPoolFromWallet(poolKey) {
  if (!poolKey) return;
  const assets = wLoad().filter(a => !(a.source === 'pool' && a.poolKey === poolKey));
  wSave(assets);
}

let walletDonutChart = null;
let dashDonutChart   = null;
let poolDonutChart   = null;

/* ── Wallet main render ── */
let _walletRefreshTimer = null;

