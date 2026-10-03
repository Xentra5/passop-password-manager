/**
 * Cryptographically Secure Password & Diceware Passphrase Generator
 * Uses window.crypto.getRandomValues for true entropy.
 */

// Curated list of high-entropy, recognizable English words (Diceware-compatible)
export const MEMORABLE_WORDS = [
  "acoustic", "acorn", "admiral", "aerobic", "albatross", "alchemy", "almond", "alpine",
  "amber", "amethyst", "anchor", "ancient", "anthem", "apricot", "aquifer", "arctic",
  "armor", "arrow", "asteroid", "atlas", "atom", "aurora", "autumn", "avalanche",
  "badge", "balcony", "bamboo", "banner", "baron", "beacon", "bison", "blizzard",
  "blossom", "boulder", "breeze", "bronze", "buffer", "cactus", "canyon", "canvas",
  "captain", "caravan", "castle", "cedar", "celestial", "chalet", "channel", "charcoal",
  "chrome", "cipher", "citadel", "cliff", "clover", "cobalt", "comet", "compass",
  "condor", "copper", "coral", "corridor", "cosmic", "crater", "crescent", "crystal",
  "cyclone", "dawn", "delta", "desert", "diamond", "diver", "dolphin", "dragon",
  "dune", "eagle", "echo", "eclipse", "element", "emerald", "empire", "enigma",
  "equator", "falcon", "feather", "fjord", "flame", "flint", "forest", "fossil",
  "galaxy", "garden", "garnet", "gateway", "geyser", "glacier", "glider", "granite",
  "gravity", "harbor", "haven", "hawk", "helix", "horizon", "hummingbird", "hydra",
  "iceberg", "iguana", "impact", "impulse", "indigo", "infinity", "island", "jaguar",
  "jasper", "jupiter", "kayak", "kinetic", "lagoon", "lantern", "laser", "latitude",
  "leopard", "liberty", "lightning", "lynx", "magnet", "mammoth", "mantle", "maple",
  "mariner", "matrix", "meadow", "meteor", "mirage", "monolith", "moonlight", "moss",
  "mountain", "nebula", "nectar", "nemesis", "neptune", "neutron", "nexus", "nomad",
  "nova", "oasis", "obsidian", "ocean", "octave", "omega", "onyx", "optics",
  "orbit", "orchid", "origin", "orion", "osprey", "outpost", "oxygen", "pacific",
  "palace", "panther", "paradox", "paragon", "particle", "passage", "pelican", "pendulum",
  "phantom", "phoenix", "pinnacle", "pioneer", "pixel", "planet", "plasma", "plateau",
  "polar", "portal", "prism", "pulsar", "pyramid", "quantum", "quasar", "radar",
  "radiance", "rainbow", "ravine", "reactor", "reef", "resonance", "ridge", "ripple",
  "rover", "ruby", "safari", "sapphire", "saturn", "scanner", "scholar", "scorpion",
  "sequoia", "shadow", "shuttle", "sierra", "silicon", "silver", "solstice", "sonar",
  "spark", "spectrum", "sphinx", "spiral", "summit", "supernova", "surge", "synergy",
  "talisman", "tempest", "terminal", "terrace", "thermal", "thunder", "timber", "titan",
  "topaz", "tornado", "torpedo", "torrent", "transit", "tribute", "trident", "trophy",
  "tundra", "twilight", "typhoon", "ultra", "uranus", "valiant", "valley", "vapor",
  "vector", "velocity", "velvet", "venture", "vertex", "vessel", "vibrant", "vortex",
  "voyage", "walrus", "waterfall", "wave", "whisper", "wildcat", "willow", "zenith",
  "zephyr", "zero", "zodiac"
];

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";
const AMBIGUOUS = /[0O1lI|]/g;

/**
 * Returns a cryptographically secure random integer in [0, max - 1].
 */
function getRandomInt(max) {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] % max;
}

/**
 * Generates a fortified random password with character options.
 */
export function generatePassword({
  length = 16,
  uppercase = true,
  lowercase = true,
  numbers = true,
  symbols = true,
  excludeAmbiguous = false,
} = {}) {
  let charPool = "";
  const guaranteed = [];

  let upperPool = UPPERCASE;
  let lowerPool = LOWERCASE;
  let numberPool = NUMBERS;
  let symbolPool = SYMBOLS;

  if (excludeAmbiguous) {
    upperPool = upperPool.replace(AMBIGUOUS, "");
    lowerPool = lowerPool.replace(AMBIGUOUS, "");
    numberPool = numberPool.replace(AMBIGUOUS, "");
    symbolPool = symbolPool.replace(AMBIGUOUS, "");
  }

  if (uppercase) {
    charPool += upperPool;
    guaranteed.push(upperPool[getRandomInt(upperPool.length)]);
  }
  if (lowercase) {
    charPool += lowerPool;
    guaranteed.push(lowerPool[getRandomInt(lowerPool.length)]);
  }
  if (numbers) {
    charPool += numberPool;
    guaranteed.push(numberPool[getRandomInt(numberPool.length)]);
  }
  if (symbols) {
    charPool += symbolPool;
    guaranteed.push(symbolPool[getRandomInt(symbolPool.length)]);
  }

  // Fallback to lowercase if everything was unchecked
  if (!charPool) {
    charPool = lowerPool;
    guaranteed.push(lowerPool[getRandomInt(lowerPool.length)]);
  }

  const result = [...guaranteed];
  const targetLength = Math.max(8, Math.min(64, length));

  while (result.length < targetLength) {
    result.push(charPool[getRandomInt(charPool.length)]);
  }

  // Fisher-Yates cryptographically secure shuffle
  for (let i = result.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join("");
}

/**
 * Generates an EFF / Diceware memorable multi-word passphrase.
 */
export function generatePassphrase({
  wordCount = 4,
  separator = "-",
  capitalize = true,
  includeNumber = true,
} = {}) {
  const count = Math.max(3, Math.min(8, wordCount));
  const chosenWords = [];

  for (let i = 0; i < count; i++) {
    let word = MEMORABLE_WORDS[getRandomInt(MEMORABLE_WORDS.length)];
    if (capitalize) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    chosenWords.push(word);
  }

  let passphrase = chosenWords.join(separator);

  if (includeNumber) {
    const num = getRandomInt(90) + 10; // 2-digit number (10-99)
    passphrase += `${separator}${num}`;
  }

  return passphrase;
}

/**
 * Estimates entropy bits for display.
 */
export function calculateEntropy({
  type = "password",
  length = 16,
  charCount = 70,
  wordCount = 4,
  includeNumber = true,
} = {}) {
  if (type === "passphrase") {
    // Each word from a 200+ list gives ~7.7 bits of entropy
    let bits = wordCount * Math.log2(MEMORABLE_WORDS.length);
    if (includeNumber) bits += Math.log2(90);
    return Math.round(bits);
  }

  // Password entropy: L * log2(R)
  const bits = length * Math.log2(Math.max(2, charCount));
  return Math.round(bits);
}
