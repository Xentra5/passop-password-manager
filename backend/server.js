const express = require('express');
const dotenv = require('dotenv');
// FIX #8: ObjectId imported at the top level (was required() inside a request handler)
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
// FIX #6: Rate limiting for auth endpoints to prevent brute-force attacks
const rateLimit = require('express-rate-limit');
// FIX #7: HTTP security headers (clickjacking, MIME sniffing, etc.)
const helmet = require('helmet');
// FIX #10: Gzip response compression to reduce payload sizes
const compression = require('compression');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'passOP';
const PORT = Number(process.env.PORT || 3000);
const FRONTEND_ORIGINS = new Set(
  (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);
if (FRONTEND_ORIGINS.has('http://localhost:5173')) {
  FRONTEND_ORIGINS.add('http://127.0.0.1:5173');
}
const JWT_SECRET = process.env.JWT_SECRET;
// FIX #3: bcrypt cost factor moved to environment variable (default 12)
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

if (!MONGO_URL || !JWT_SECRET) {
  throw new Error('Missing MONGO_URL or JWT_SECRET in backend/.env');
}

const app = express();

// FIX #12: MongoDB connection pool configured to avoid Atlas free-tier exhaustion
const client = new MongoClient(MONGO_URL, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
});

// FIX #10: Apply gzip compression before all routes
app.use(compression());

// FIX #7: Apply security headers before all routes
app.use(helmet());

// FIX #11: Reduced body limit from 1mb to 200kb (a password manager never needs 1 MB payloads)
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || FRONTEND_ORIGINS.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed by CORS policy'));
    },
    credentials: true, // Required for sending/receiving HttpOnly cookies across origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-XSRF-Token'],
  })
);

// FIX #5: Input sanitization — strip dangerous HTML characters to prevent stored XSS
const sanitizeText = (str) =>
  typeof str === 'string' ? str.replace(/[<>"'`]/g, '') : str;

const isValidPasswordPayload = (payload) => {
  return (
    payload &&
    typeof payload.site === 'string' &&
    typeof payload.username === 'string' &&
    typeof payload.password === 'string' &&
    typeof payload.id === 'string' &&
    payload.site.trim().length > 0 &&
    payload.username.trim().length > 0 &&
    payload.password.length > 0 &&
    payload.id.length <= 128 &&
    payload.site.trim().length <= 512 &&
    payload.username.trim().length <= 512 &&
    payload.password.length <= 10000 &&
    (!payload.customFields || (Array.isArray(payload.customFields) && payload.customFields.length <= 50 && payload.customFields.every((field) => field && typeof field.label === 'string' && field.label.length <= 128 && typeof field.value === 'string' && field.value.length <= 10000))) &&
    (!payload.history || (Array.isArray(payload.history) && payload.history.length <= 50 && payload.history.every((entry) => entry && typeof entry.password === 'string' && entry.password.length <= 10000)))
  );
};

// FIX #2: Collections pre-resolved after connect() instead of re-created on every request.
// These are assigned in startServer() once the DB is connected.
let passwordsCol;
let usersCol;
let sendsCol;

const VAULT_ENCRYPTION_KEY = process.env.VAULT_ENCRYPTION_KEY || JWT_SECRET;
const VAULT_CIPHER_KEY = crypto.createHash('sha256').update(VAULT_ENCRYPTION_KEY).digest();
const ENCRYPTION_PREFIX = 'enc:v1:';

const encryptVaultPassword = (plainText) => {
  if (typeof plainText !== 'string' || !plainText) return plainText;
  // Zero-Knowledge Client-Side Encryption:
  // If the secret was already encrypted inside the client's browser, preserve ciphertext directly.
  if (plainText.startsWith('enc:v2:')) {
    return plainText;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', VAULT_CIPHER_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENCRYPTION_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

const decryptVaultPassword = (storedValue) => {
  if (typeof storedValue !== 'string' || !storedValue.startsWith(ENCRYPTION_PREFIX)) {
    return storedValue;
  }
  try {
    const raw = storedValue.slice(ENCRYPTION_PREFIX.length);
    const parts = raw.split(':');
    if (parts.length !== 3) return storedValue;
    const [ivHex, tagHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(dataHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', VAULT_CIPHER_KEY, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Failed to decrypt vault credential:', error.message);
    return storedValue;
  }
};

const createToken = (user) => jwt.sign(
  { userId: user._id.toString(), email: user.email },
  JWT_SECRET,
  { expiresIn: '7d' }
);

// Professional Enterprise Cookie Configuration
const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'passvault_token';
const COOKIE_OPTIONS = {
  httpOnly: true, // Prevents client-side JavaScript / XSS theft
  secure: isProduction, // HTTPS only in production; permits HTTP in localhost dev
  sameSite: isProduction ? 'strict' : 'lax', // CSRF defense (lax permits local cross-port dev)
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/',
};

// ─── Double-Submit Anti-CSRF Cookie Configuration ────────────────────────────
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_COOKIE_OPTIONS = {
  httpOnly: false, // Standard Double-Submit pattern: client JavaScript must be able to read this cookie
  secure: isProduction,
  sameSite: isProduction ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

const setCsrfCookie = (res, token = generateCsrfToken()) => {
  res.cookie(CSRF_COOKIE_NAME, token, CSRF_COOKIE_OPTIONS);
  return token;
};

/**
 * Double-Submit Anti-CSRF Protection Middleware
 *
 * HOW IT WORKS:
 * 1. Safe HTTP methods (GET, HEAD, OPTIONS) are read-only and skipped.
 * 2. State-modifying requests (POST, PUT, DELETE, PATCH) MUST include:
 *    - An X-CSRF-Token (or X-XSRF-TOKEN) header.
 *    - The matching XSRF-TOKEN cookie.
 * 3. An attacker from an external origin (evil.com) cannot read the victim's
 *    cookies due to the browser's Same-Origin Policy, so they cannot forge
 *    the matching header value.
 * 4. Comparison uses crypto.timingSafeEqual to prevent timing side-channel attacks.
 */
const verifyCsrfToken = (req, res, next) => {
  // Safe idempotent methods do not alter state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const headerToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

  if (!headerToken || !cookieToken || typeof headerToken !== 'string' || typeof cookieToken !== 'string') {
    return res.status(403).json({
      success: false,
      code: 'CSRF_MISSING',
      message: 'Anti-CSRF protection: CSRF token is missing from headers or cookies.',
    });
  }

  try {
    const headerBuf = Buffer.from(headerToken, 'utf8');
    const cookieBuf = Buffer.from(cookieToken, 'utf8');

    if (headerBuf.length === cookieBuf.length && crypto.timingSafeEqual(headerBuf, cookieBuf)) {
      return next();
    }
  } catch (err) {
    console.error('CSRF verification error:', err.message);
  }

  return res.status(403).json({
    success: false,
    code: 'CSRF_INVALID',
    message: 'Anti-CSRF protection: Invalid CSRF token. Request blocked for security.',
  });
};

// Apply Anti-CSRF protection across all state-modifying endpoints
app.use(verifyCsrfToken);

const authenticateToken = (req, res, next) => {
  // Check HttpOnly cookie FIRST (primary secure transport)
  let token = req.cookies?.[COOKIE_NAME] || null;

  // Fallback to Bearer token header if cookie is absent (e.g. CLI tools / external integrations)
  if (!token) {
    const authorization = req.headers.authorization || '';
    if (authorization.startsWith('Bearer ')) {
      token = authorization.slice(7);
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
};

// FIX #6: Rate limiters for auth endpoints — prevents brute-force & credential-stuffing attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 20,                   // max 20 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

const strictAuthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1-hour window
  max: 10,                   // max 10 register attempts per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts, please try again later.' },
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// GET /api/csrf-token: Issues or refreshes a valid CSRF token
app.get('/api/csrf-token', (req, res) => {
  const existingToken = req.cookies?.[CSRF_COOKIE_NAME];
  const token = existingToken || generateCsrfToken();
  setCsrfCookie(res, token);
  res.json({
    success: true,
    csrfToken: token,
  });
});

// GET /api/auth/me: Validates active HttpOnly session cookie on page load/refresh
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    // Refresh or ensure CSRF cookie is present
    const existingToken = req.cookies?.[CSRF_COOKIE_NAME];
    const csrfToken = existingToken || setCsrfCookie(res);

    // FIX #8: Using top-level ObjectId instead of require() inside handler
    const userDoc = await usersCol.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { vaultSalt: 1 } }
    );

    res.json({
      success: true,
      csrfToken,
      user: { email: req.user.email },
      vaultSalt: userDoc?.vaultSalt || null,
    });
  } catch (error) {
    console.error('Failed to get current user:', error);
    res.status(500).json({ success: false, message: 'Failed to verify session' });
  }
});

// FIX #6: strictAuthLimiter applied to register to prevent account spam
app.post('/api/auth/register', strictAuthLimiter, async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : null;

    if (confirmPassword !== null && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    // Require at least 12 characters for master password (matches client-side security standard)
    if (!email.includes('@') || password.length < 12) {
      return res.status(400).json({
        success: false,
        message: 'Use a valid email and a master password of at least 12 characters',
      });
    }

    // FIX #2: Using pre-resolved usersCol instead of getUsersCollection()
    const existingUser = await usersCol.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with that email already exists' });
    }

    const vaultSalt = typeof req.body?.vaultSalt === 'string' && /^[a-f0-9]{32}$/i.test(req.body.vaultSalt) ? req.body.vaultSalt.toLowerCase() : null;
    if (!vaultSalt) return res.status(400).json({ success: false, message: 'A valid vault salt is required' });

    // FIX #3: Using BCRYPT_ROUNDS env variable instead of hardcoded 12
    const user = { email, passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS), vaultSalt, createdAt: new Date() };
    const result = await usersCol.insertOne(user);
    user._id = result.insertedId;

    const token = createToken(user);

    // Set secure HttpOnly cookie & fresh Double-Submit CSRF cookie
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    const csrfToken = setCsrfCookie(res);

    res.status(201).json({
      success: true,
      token, // provided for fallback in RAM
      csrfToken,
      vaultSalt,
      user: { email },
    });
  } catch (error) {
    console.error('Failed to register user:', error);
    res.status(500).json({ success: false, message: 'Failed to create account' });
  }
});

// FIX #6: authLimiter applied to login to prevent brute-force attacks
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    // FIX #2: Using pre-resolved usersCol
    const user = await usersCol.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    let vaultSalt = user.vaultSalt || null;
    const suppliedSalt = typeof req.body?.vaultSalt === 'string' && /^[a-f0-9]{32}$/i.test(req.body.vaultSalt) ? req.body.vaultSalt.toLowerCase() : null;
    if (!vaultSalt && suppliedSalt) {
      await usersCol.updateOne({ _id: user._id, vaultSalt: { $exists: false } }, { $set: { vaultSalt: suppliedSalt } });
      vaultSalt = suppliedSalt;
    }

    const token = createToken(user);

    // Set secure HttpOnly cookie & fresh Double-Submit CSRF cookie
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    const csrfToken = setCsrfCookie(res);

    res.json({
      success: true,
      token, // provided for fallback in RAM
      csrfToken,
      vaultSalt,
      user: { email: user.email },
    });
  } catch (error) {
    console.error('Failed to log in user:', error);
    res.status(500).json({ success: false, message: 'Failed to log in' });
  }
});

// POST /api/auth/logout: Clears both the HttpOnly session and CSRF cookies
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
  res.clearCookie(CSRF_COOKIE_NAME, CSRF_COOKIE_OPTIONS);
  res.json({ success: true, message: 'Logged out successfully' });
});

const extractDomain = (urlOrSite) => {
  if (!urlOrSite || typeof urlOrSite !== 'string') return '';
  let cleaned = urlOrSite.trim();
  if (!cleaned) return '';
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }
  try {
    const parsed = new URL(cleaned);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return urlOrSite.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0].split('?')[0].toLowerCase();
  }
};

const FAMOUS_BRANDS_METADATA = [
  { id: 'google', name: 'Google', domain: 'google.com', category: 'Productivity', match: /(^|\\.)(google\\.[a-z.]+|gmail\\.com)$/i },
  { id: 'youtube', name: 'YouTube', domain: 'youtube.com', category: 'Entertainment', match: /(^|\\.)(youtube\\.com|youtu\\.be)$/i },
  { id: 'github', name: 'GitHub', domain: 'github.com', category: 'Developer', match: /(^|\\.)github\\.com$/i },
  { id: 'twitter', name: 'X (Twitter)', domain: 'x.com', category: 'Social', match: /(^|\\.)(x\\.com|twitter\\.com)$/i },
  { id: 'facebook', name: 'Facebook', domain: 'facebook.com', category: 'Social', match: /(^|\\.)(facebook\\.com|fb\\.com)$/i },
  { id: 'instagram', name: 'Instagram', domain: 'instagram.com', category: 'Social', match: /(^|\\.)instagram\\.com$/i },
  { id: 'linkedin', name: 'LinkedIn', domain: 'linkedin.com', category: 'Professional', match: /(^|\\.)linkedin\\.com$/i },
  { id: 'netflix', name: 'Netflix', domain: 'netflix.com', category: 'Entertainment', match: /(^|\\.)netflix\\.com$/i },
  { id: 'spotify', name: 'Spotify', domain: 'spotify.com', category: 'Music', match: /(^|\\.)spotify\\.com$/i },
  { id: 'discord', name: 'Discord', domain: 'discord.com', category: 'Communication', match: /(^|\\.)(discord\\.com|discord\\.gg)$/i },
  { id: 'reddit', name: 'Reddit', domain: 'reddit.com', category: 'Social', match: /(^|\\.)reddit\\.com$/i },
  { id: 'amazon', name: 'Amazon', domain: 'amazon.com', category: 'Shopping', match: /(^|\\.)amazon\\.[a-z.]+$/i },
  { id: 'apple', name: 'Apple', domain: 'apple.com', category: 'Tech', match: /(^|\\.)(apple\\.com|icloud\\.com)$/i },
  { id: 'microsoft', name: 'Microsoft', domain: 'microsoft.com', category: 'Tech', match: /(^|\\.)(microsoft\\.com|live\\.com|outlook\\.com|office\\.com)$/i },
  { id: 'openai', name: 'ChatGPT', domain: 'chatgpt.com', category: 'AI', match: /(^|\\.)(openai\\.com|chatgpt\\.com)$/i },
  { id: 'claude', name: 'Claude (Anthropic)', domain: 'claude.ai', category: 'AI', match: /(^|\\.)(anthropic\\.com|claude\\.ai)$/i },
  { id: 'figma', name: 'Figma', domain: 'figma.com', category: 'Design', match: /(^|\\.)figma\\.com$/i },
  { id: 'notion', name: 'Notion', domain: 'notion.so', category: 'Productivity', match: /(^|\\.)(notion\\.so|notion\\.com)$/i },
  { id: 'slack', name: 'Slack', domain: 'slack.com', category: 'Communication', match: /(^|\\.)slack\\.com$/i },
  { id: 'zoom', name: 'Zoom', domain: 'zoom.us', category: 'Communication', match: /(^|\\.)zoom\\.us$/i },
  { id: 'paypal', name: 'PayPal', domain: 'paypal.com', category: 'Finance', match: /(^|\\.)paypal\\.com$/i },
  { id: 'stripe', name: 'Stripe', domain: 'stripe.com', category: 'Finance', match: /(^|\\.)stripe\\.com$/i },
  { id: 'steam', name: 'Steam', domain: 'steampowered.com', category: 'Gaming', match: /(^|\\.)(steampowered\\.com|steamcommunity\\.com)$/i },
  { id: 'twitch', name: 'Twitch', domain: 'twitch.tv', category: 'Entertainment', match: /(^|\\.)twitch\\.tv$/i },
  { id: 'tiktok', name: 'TikTok', domain: 'tiktok.com', category: 'Social', match: /(^|\\.)tiktok\\.com$/i },
  { id: 'pinterest', name: 'Pinterest', domain: 'pinterest.com', category: 'Social', match: /(^|\\.)pinterest\\.com$/i },
  { id: 'gitlab', name: 'GitLab', domain: 'gitlab.com', category: 'Developer', match: /(^|\\.)gitlab\\.com$/i },
  { id: 'docker', name: 'Docker', domain: 'docker.com', category: 'Developer', match: /(^|\\.)docker\\.com$/i },
  { id: 'vercel', name: 'Vercel', domain: 'vercel.com', category: 'Developer', match: /(^|\\.)vercel\\.com$/i },
  { id: 'dropbox', name: 'Dropbox', domain: 'dropbox.com', category: 'Productivity', match: /(^|\\.)dropbox\\.com$/i },
  { id: 'adobe', name: 'Adobe', domain: 'adobe.com', category: 'Design', match: /(^|\\.)adobe\\.com$/i },
];

app.get('/api/logo/popular', (req, res) => {
  res.json({
    success: true,
    brands: FAMOUS_BRANDS_METADATA.map(({ id, name, domain, category }) => ({
      id,
      name,
      domain,
      category,
      logoUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    })),
  });
});

app.get('/api/logo', (req, res) => {
  const site = req.query.site || req.query.domain || '';
  const domain = extractDomain(site);

  if (!domain) {
    return res.status(400).json({ success: false, message: 'Missing or invalid site/domain parameter' });
  }

  const matchedBrand = FAMOUS_BRANDS_METADATA.find((b) => b.match.test(domain));
  const googleFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
  const duckDuckGoFavicon = `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;

  res.json({
    success: true,
    domain,
    brand: matchedBrand ? { id: matchedBrand.id, name: matchedBrand.name, category: matchedBrand.category } : null,
    isOfficial: Boolean(matchedBrand),
    logoUrl: googleFavicon,
    fallbackUrl: duckDuckGoFavicon,
  });
});

app.get('/api/passwords', authenticateToken, async (req, res) => {
  try {
    // FIX #2: Using pre-resolved passwordsCol
    // FIX #4: MongoDB projection to only fetch needed fields — reduces bandwidth
    const passwords = await passwordsCol
      .find({ userId: req.user.userId })
      .project({ _id: 0, id: 1, site: 1, username: 1, password: 1, favorite: 1, tag: 1, customFields: 1, history: 1 })
      .sort({ site: 1 })
      .toArray();

    const decryptedPasswords = passwords.map((item) => ({
      ...item,
      password: decryptVaultPassword(item.password),
      favorite: Boolean(item.favorite),
      tag: typeof item.tag === 'string' ? item.tag : 'Personal',
      customFields: Array.isArray(item.customFields) ? item.customFields : [],
      history: Array.isArray(item.history)
        ? item.history.map(h => ({
          ...h,
          password: decryptVaultPassword(h.password),
        }))
        : [],
    }));
    res.json(decryptedPasswords);
  } catch (error) {
    console.error('Failed to load passwords:', error);
    res.status(500).json({ success: false, message: 'Failed to load passwords' });
  }
});

app.post('/api/passwords', authenticateToken, async (req, res) => {
  try {
    const password = req.body;

    if (!isValidPasswordPayload(password)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password payload',
      });
    }

    // FIX #5: Sanitize site and username to strip dangerous HTML characters
    const recordToInsert = {
      id: password.id,
      site: sanitizeText(password.site.trim()),
      username: sanitizeText(password.username.trim()),
      password: encryptVaultPassword(password.password),
      favorite: Boolean(password.favorite),
      tag: typeof password.tag === 'string' && password.tag.trim() ? password.tag.trim() : 'Personal',
      customFields: Array.isArray(password.customFields) ? password.customFields : [],
      userId: req.user.userId,
      createdAt: new Date(),
    };

    // FIX #2: Using pre-resolved passwordsCol
    await passwordsCol.insertOne(recordToInsert);

    res.status(201).json({
      success: true,
      password: {
        id: recordToInsert.id,
        site: recordToInsert.site,
        username: recordToInsert.username,
        password: recordToInsert.password,
        favorite: recordToInsert.favorite,
        tag: recordToInsert.tag,
        customFields: recordToInsert.customFields,
      },
    });
  } catch (error) {
    console.error('Failed to save password:', error);
    res.status(500).json({ success: false, message: 'Failed to save password' });
  }
});

app.post('/api/passwords/bulk', authenticateToken, async (req, res) => {
  try {
    const { passwords } = req.body;

    // FIX #9: Hard cap on bulk import array size to prevent memory exhaustion DoS
    const MAX_BULK = 500;
    if (!Array.isArray(passwords) || passwords.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or empty passwords array' });
    }
    if (passwords.length > MAX_BULK) {
      return res.status(400).json({ success: false, message: `Bulk import is limited to ${MAX_BULK} items per request` });
    }

    const records = [];
    const now = new Date();

    for (const item of passwords) {
      if (isValidPasswordPayload(item)) {
        records.push({
          id: item.id,
          // FIX #5: Sanitize site and username in bulk import too
          site: sanitizeText(item.site.trim()),
          username: sanitizeText(item.username.trim()),
          password: encryptVaultPassword(item.password),
          favorite: Boolean(item.favorite),
          tag: typeof item.tag === 'string' && item.tag.trim() ? item.tag.trim() : 'Personal',
          customFields: Array.isArray(item.customFields) ? item.customFields : [],
          userId: req.user.userId,
          createdAt: now,
        });
      }
    }

    if (records.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid credential records in payload' });
    }

    // Insert all records, ordered: false to continue if an individual ID duplicates
    // FIX #2: Using pre-resolved passwordsCol
    await passwordsCol.insertMany(records, { ordered: false });

    res.status(201).json({
      success: true,
      insertedCount: records.length,
    });
  } catch (error) {
    console.error('Failed to bulk save passwords:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk import passwords' });
  }
});

app.put('/api/passwords/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const password = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Missing password id' });
    }

    if (!isValidPasswordPayload(password)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password payload',
      });
    }

    // FIX #5: Sanitize site and username on update
    const updateFields = {
      site: sanitizeText(password.site.trim()),
      username: sanitizeText(password.username.trim()),
      password: encryptVaultPassword(password.password),
      updatedAt: new Date(),
    };

    if (password.favorite !== undefined) {
      updateFields.favorite = Boolean(password.favorite);
    }

    if (password.tag !== undefined) {
      updateFields.tag = typeof password.tag === 'string' ? password.tag.trim() : 'Personal';
    }

    if (Array.isArray(password.customFields)) {
      updateFields.customFields = password.customFields;
    }

    if (Array.isArray(password.history)) {
      updateFields.history = password.history.slice(0, 50).filter(h => h && typeof h.password === 'string').map(h => ({
        password: encryptVaultPassword(h.password),
        changedAt: h.changedAt ? new Date(h.changedAt) : new Date(),
      }));
    }

    // FIX #2: Using pre-resolved passwordsCol
    const result = await passwordsCol.updateOne(
      { id, userId: req.user.userId },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Password not found' });
    }

    res.json({
      success: true,
      password,
    });
  } catch (error) {
    console.error('Failed to update password:', error);
    res.status(500).json({ success: false, message: 'Failed to update password' });
  }
});

app.delete('/api/passwords/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const passwordId = id || req.body?.id;

    if (!passwordId) {
      return res.status(400).json({ success: false, message: 'Missing password id' });
    }

    // FIX #2: Using pre-resolved passwordsCol
    const result = await passwordsCol.deleteOne({ id: passwordId, userId: req.user.userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Password not found' });
    }

    res.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Failed to delete password:', error);
    res.status(500).json({ success: false, message: 'Failed to delete password' });
  }
});

// ============================================================================
// PASSVAULT SEND - ENCRYPTED ONE-TIME SECRET SHARING ENDPOINTS
// ============================================================================

// POST /api/sends - Create a new encrypted send item
app.post('/api/sends', async (req, res) => {
  try {
    const {
      ciphertext,
      iv,
      title = 'Encrypted Secret',
      type = 'text',
      maxViews = 1,
      expiresInMinutes = 1440, // default 24h
      passphraseHash = null,
      passphraseSalt = null,
    } = req.body || {};

    if (typeof ciphertext !== 'string' || !/^[a-f0-9]+$/i.test(ciphertext) || ciphertext.length > 1024 * 1024 ||
        typeof iv !== 'string' || !/^[a-f0-9]{24}$/i.test(iv)) {
      return res.status(400).json({ success: false, message: 'Invalid payload: ciphertext and iv are required' });
    }
    if (title !== undefined && (typeof title !== 'string' || title.length > 100) ||
        type !== undefined && !['text', 'password', 'note'].includes(type) ||
        !Number.isInteger(Number(maxViews)) || Number(maxViews) < 1 || Number(maxViews) > 100 ||
        !Number.isInteger(Number(expiresInMinutes)) || Number(expiresInMinutes) < 1 || Number(expiresInMinutes) > 10080 ||
        (passphraseHash !== null && (typeof passphraseHash !== 'string' || !/^[a-f0-9]{64}$/i.test(passphraseHash))) ||
        (passphraseSalt !== null && (typeof passphraseSalt !== 'string' || !/^[a-f0-9]{32}$/i.test(passphraseSalt))) ||
        Boolean(passphraseHash) !== Boolean(passphraseSalt)) {
      return res.status(400).json({ success: false, message: 'Invalid send options' });
    }

    // Optional user identification if logged in
    let creatorUserId = null;
    const cookieToken = req.cookies?.[COOKIE_NAME] || null;
    const authHeader = req.headers.authorization || '';
    const rawToken = cookieToken || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null);
    if (rawToken) {
      try {
        const decoded = jwt.verify(rawToken, JWT_SECRET);
        creatorUserId = decoded.userId;
      } catch {
        // Guest/unauthenticated sender is allowed
      }
    }

    const sendId = crypto.randomBytes(16).toString('hex');
    const now = new Date();
    const durationMin = Math.max(1, Math.min(Number(expiresInMinutes) || 1440, 10080)); // 1 min to 7 days
    const expiresAt = new Date(now.getTime() + durationMin * 60 * 1000);
    const safeMaxViews = Math.max(1, Math.min(Number(maxViews) || 1, 100));

    const newSend = {
      sendId,
      ciphertext,
      iv,
      title: (typeof title === 'string' ? title.slice(0, 100) : 'Encrypted Secret').trim() || 'Encrypted Secret',
      type: ['text', 'password', 'note'].includes(type) ? type : 'text',
      maxViews: safeMaxViews,
      viewsCount: 0,
      createdAt: now,
      expiresAt,
      creatorUserId,
      hasPassphrase: Boolean(passphraseHash && passphraseSalt),
      passphraseHash: typeof passphraseHash === 'string' ? passphraseHash : null,
      passphraseSalt: typeof passphraseSalt === 'string' ? passphraseSalt : null,
      isBurned: false,
    };

    // FIX #2: Using pre-resolved sendsCol
    await sendsCol.insertOne(newSend);

    res.status(201).json({
      success: true,
      sendId,
      expiresAt,
      maxViews: safeMaxViews,
    });
  } catch (error) {
    console.error('Failed to create vault send:', error);
    res.status(500).json({ success: false, message: 'Failed to create vault send' });
  }
});

// GET /api/sends/meta/:id - Peek metadata (e.g. check existence, passphrase requirement, remaining views) without consuming a view
app.get('/api/sends/meta/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid Send ID' });
    }

    // FIX #2: Using pre-resolved sendsCol
    const doc = await sendsCol.findOne({ sendId: id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'This secret does not exist or has already been burned.' });
    }

    const now = new Date();
    if (doc.isBurned || doc.viewsCount >= doc.maxViews || now > doc.expiresAt) {
      // Auto-cleanup expired/burned doc
      await sendsCol.deleteOne({ sendId: id });
      return res.status(410).json({ success: false, message: 'This secret has expired or has already been burned.' });
    }

    res.json({
      success: true,
      sendId: doc.sendId,
      title: doc.title,
      type: doc.type,
      maxViews: doc.maxViews,
      viewsLeft: Math.max(0, doc.maxViews - doc.viewsCount),
      expiresAt: doc.expiresAt,
      hasPassphrase: doc.hasPassphrase,
      passphraseSalt: doc.passphraseSalt || null,
      createdAt: doc.createdAt,
    });
  } catch (error) {
    console.error('Failed to fetch vault send meta:', error);
    res.status(500).json({ success: false, message: 'Failed to check vault send' });
  }
});

// POST /api/sends/reveal/:id - Reveal the secret, verifying optional passphrase hash, and atomically incrementing view count or burning
app.post('/api/sends/reveal/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { passphraseHash = null } = req.body || {};

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid Send ID' });
    }

    // FIX #2: Using pre-resolved sendsCol
    const doc = await sendsCol.findOne({ sendId: id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'This secret does not exist or has already been burned.' });
    }

    const now = new Date();
    if (doc.isBurned || doc.viewsCount >= doc.maxViews || now > doc.expiresAt) {
      await sendsCol.deleteOne({ sendId: id });
      return res.status(410).json({ success: false, message: 'This secret has expired or has already been burned.' });
    }

    // Verify passphrase if protected
    if (doc.hasPassphrase) {
      if (!passphraseHash || typeof passphraseHash !== 'string' || passphraseHash !== doc.passphraseHash) {
        return res.status(401).json({ success: false, message: 'Incorrect passphrase. Secret cannot be accessed.' });
      }
    }

    // Atomically increment viewsCount
    const updated = await sendsCol.findOneAndUpdate(
      { sendId: id, viewsCount: { $lt: doc.maxViews }, isBurned: false, expiresAt: { $gt: now } },
      { $inc: { viewsCount: 1 } },
      { returnDocument: 'after' }
    );

    const updatedDoc = updated?.value || updated; // MongoDB driver compat
    if (!updatedDoc || typeof updatedDoc.viewsCount !== 'number') {
      return res.status(410).json({ success: false, message: 'This secret has expired or has already been burned.' });
    }
    const finalViews = updatedDoc.viewsCount;
    const viewsLeft = Math.max(0, doc.maxViews - finalViews);

    // If maxViews reached, burn/delete immediately from DB
    if (finalViews >= doc.maxViews) {
      await sendsCol.deleteOne({ sendId: id });
    }

    res.json({
      success: true,
      ciphertext: doc.ciphertext,
      iv: doc.iv,
      title: doc.title,
      type: doc.type,
      maxViews: doc.maxViews,
      viewsLeft,
      burnedNow: finalViews >= doc.maxViews,
    });
  } catch (error) {
    console.error('Failed to reveal vault send:', error);
    res.status(500).json({ success: false, message: 'Failed to reveal secret' });
  }
});

// GET /api/sends/my - List active sends created by the authenticated user
app.get('/api/sends/my', authenticateToken, async (req, res) => {
  try {
    // FIX #2: Using pre-resolved sendsCol
    const sends = await sendsCol
      .find({ creatorUserId: req.user.userId, expiresAt: { $gt: new Date() } })
      .project({ ciphertext: 0, iv: 0, passphraseHash: 0 })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      sends: sends.map(s => ({
        sendId: s.sendId,
        title: s.title,
        type: s.type,
        maxViews: s.maxViews,
        viewsCount: s.viewsCount,
        viewsLeft: Math.max(0, s.maxViews - s.viewsCount),
        expiresAt: s.expiresAt,
        hasPassphrase: s.hasPassphrase,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch user sends:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user sends' });
  }
});

// DELETE /api/sends/:id - Sender manually burns the link early
app.delete('/api/sends/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // FIX #2: Using pre-resolved sendsCol
    const result = await sendsCol.deleteOne({ sendId: id, creatorUserId: req.user.userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Send item not found or unauthorized' });
    }

    res.json({ success: true, message: 'Secret permanently deleted.' });
  } catch (error) {
    console.error('Failed to delete vault send:', error);
    res.status(500).json({ success: false, message: 'Failed to delete send' });
  }
});

async function startServer() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    // FIX #2: Pre-resolve collection references once after connect — avoids re-creating
    // the db/collection chain on every single request.
    const db = client.db(DB_NAME);
    passwordsCol = db.collection('passwords');
    usersCol     = db.collection('users');
    sendsCol     = db.collection('vault_sends');

    // Create essential indexes for security & performance
    await usersCol.createIndex({ email: 1 }, { unique: true });
    await passwordsCol.createIndex({ userId: 1, id: 1 }, { unique: true });
    await passwordsCol.createIndex({ userId: 1, site: 1 });
    // FIX #1: Standalone index on `id` for O(1) PUT/DELETE lookups without needing userId prefix
    await passwordsCol.createIndex({ id: 1 }, { unique: true });

    // Vault Send TTL index for auto-cleanup and fast ID lookups
    await sendsCol.createIndex({ sendId: 1 }, { unique: true });
    await sendsCol.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await sendsCol.createIndex({ creatorUserId: 1 });
    // FIX #1: Compound index covering the /api/sends/my query pattern
    await sendsCol.createIndex({ creatorUserId: 1, expiresAt: -1 });

    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start backend:', error);
    process.exit(1);
  }
}

startServer();
