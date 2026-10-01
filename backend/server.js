const express = require('express');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'passOP';
const PORT = Number(process.env.PORT || 3000);
const FRONTEND_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGO_URL || !JWT_SECRET) {
  throw new Error('Missing MONGO_URL or JWT_SECRET in backend/.env');
}

const app = express();
const client = new MongoClient(MONGO_URL);

app.use(express.json());
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

const isValidPasswordPayload = (payload) => {
  return (
    payload &&
    typeof payload.site === 'string' &&
    typeof payload.username === 'string' &&
    typeof payload.password === 'string' &&
    typeof payload.id === 'string' &&
    payload.site.trim().length > 0 &&
    payload.username.trim().length > 0 &&
    payload.password.trim().length > 0
  );
};

const getPasswordsCollection = () => client.db(DB_NAME).collection('passwords');
const getUsersCollection = () => client.db(DB_NAME).collection('users');

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

const authenticateToken = (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', async (req, res) => {
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

    if (!email.includes('@') || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Use a valid email and a password of at least 8 characters',
      });
    }

    const users = getUsersCollection();
    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with that email already exists' });
    }

    const user = { email, passwordHash: await bcrypt.hash(password, 12), createdAt: new Date() };
    const result = await users.insertOne(user);
    user._id = result.insertedId;

    res.status(201).json({ success: true, token: createToken(user), user: { email } });
  } catch (error) {
    console.error('Failed to register user:', error);
    res.status(500).json({ success: false, message: 'Failed to create account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const user = await getUsersCollection().findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({ success: true, token: createToken(user), user: { email: user.email } });
  } catch (error) {
    console.error('Failed to log in user:', error);
    res.status(500).json({ success: false, message: 'Failed to log in' });
  }
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
  { id: 'google', name: 'Google', domain: 'google.com', category: 'Productivity', match: /(^|\.)(google\.[a-z.]+|gmail\.com)$/i },
  { id: 'youtube', name: 'YouTube', domain: 'youtube.com', category: 'Entertainment', match: /(^|\.)(youtube\.com|youtu\.be)$/i },
  { id: 'github', name: 'GitHub', domain: 'github.com', category: 'Developer', match: /(^|\.)github\.com$/i },
  { id: 'twitter', name: 'X (Twitter)', domain: 'x.com', category: 'Social', match: /(^|\.)(x\.com|twitter\.com)$/i },
  { id: 'facebook', name: 'Facebook', domain: 'facebook.com', category: 'Social', match: /(^|\.)(facebook\.com|fb\.com)$/i },
  { id: 'instagram', name: 'Instagram', domain: 'instagram.com', category: 'Social', match: /(^|\.)instagram\.com$/i },
  { id: 'linkedin', name: 'LinkedIn', domain: 'linkedin.com', category: 'Professional', match: /(^|\.)linkedin\.com$/i },
  { id: 'netflix', name: 'Netflix', domain: 'netflix.com', category: 'Entertainment', match: /(^|\.)netflix\.com$/i },
  { id: 'spotify', name: 'Spotify', domain: 'spotify.com', category: 'Music', match: /(^|\.)spotify\.com$/i },
  { id: 'discord', name: 'Discord', domain: 'discord.com', category: 'Communication', match: /(^|\.)(discord\.com|discord\.gg)$/i },
  { id: 'reddit', name: 'Reddit', domain: 'reddit.com', category: 'Social', match: /(^|\.)reddit\.com$/i },
  { id: 'amazon', name: 'Amazon', domain: 'amazon.com', category: 'Shopping', match: /(^|\.)amazon\.[a-z.]+$/i },
  { id: 'apple', name: 'Apple', domain: 'apple.com', category: 'Tech', match: /(^|\.)(apple\.com|icloud\.com)$/i },
  { id: 'microsoft', name: 'Microsoft', domain: 'microsoft.com', category: 'Tech', match: /(^|\.)(microsoft\.com|live\.com|outlook\.com|office\.com)$/i },
  { id: 'openai', name: 'ChatGPT', domain: 'chatgpt.com', category: 'AI', match: /(^|\.)(openai\.com|chatgpt\.com)$/i },
  { id: 'claude', name: 'Claude (Anthropic)', domain: 'claude.ai', category: 'AI', match: /(^|\.)(anthropic\.com|claude\.ai)$/i },
  { id: 'figma', name: 'Figma', domain: 'figma.com', category: 'Design', match: /(^|\.)figma\.com$/i },
  { id: 'notion', name: 'Notion', domain: 'notion.so', category: 'Productivity', match: /(^|\.)(notion\.so|notion\.com)$/i },
  { id: 'slack', name: 'Slack', domain: 'slack.com', category: 'Communication', match: /(^|\.)slack\.com$/i },
  { id: 'zoom', name: 'Zoom', domain: 'zoom.us', category: 'Communication', match: /(^|\.)zoom\.us$/i },
  { id: 'paypal', name: 'PayPal', domain: 'paypal.com', category: 'Finance', match: /(^|\.)paypal\.com$/i },
  { id: 'stripe', name: 'Stripe', domain: 'stripe.com', category: 'Finance', match: /(^|\.)stripe\.com$/i },
  { id: 'steam', name: 'Steam', domain: 'steampowered.com', category: 'Gaming', match: /(^|\.)(steampowered\.com|steamcommunity\.com)$/i },
  { id: 'twitch', name: 'Twitch', domain: 'twitch.tv', category: 'Entertainment', match: /(^|\.)twitch\.tv$/i },
  { id: 'tiktok', name: 'TikTok', domain: 'tiktok.com', category: 'Social', match: /(^|\.)tiktok\.com$/i },
  { id: 'pinterest', name: 'Pinterest', domain: 'pinterest.com', category: 'Social', match: /(^|\.)pinterest\.com$/i },
  { id: 'gitlab', name: 'GitLab', domain: 'gitlab.com', category: 'Developer', match: /(^|\.)gitlab\.com$/i },
  { id: 'docker', name: 'Docker', domain: 'docker.com', category: 'Developer', match: /(^|\.)docker\.com$/i },
  { id: 'vercel', name: 'Vercel', domain: 'vercel.com', category: 'Developer', match: /(^|\.)vercel\.com$/i },
  { id: 'dropbox', name: 'Dropbox', domain: 'dropbox.com', category: 'Productivity', match: /(^|\.)dropbox\.com$/i },
  { id: 'adobe', name: 'Adobe', domain: 'adobe.com', category: 'Design', match: /(^|\.)adobe\.com$/i },
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
    const passwords = await getPasswordsCollection().find({ userId: req.user.userId }).sort({ site: 1 }).toArray();
    const decryptedPasswords = passwords.map((item) => ({
      ...item,
      password: decryptVaultPassword(item.password),
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

    const recordToInsert = {
      id: password.id,
      site: password.site.trim(),
      username: password.username.trim(),
      password: encryptVaultPassword(password.password),
      userId: req.user.userId,
      createdAt: new Date(),
    };

    await getPasswordsCollection().insertOne(recordToInsert);

    res.status(201).json({
      success: true,
      password: {
        id: recordToInsert.id,
        site: recordToInsert.site,
        username: recordToInsert.username,
        password: recordToInsert.password,
      },
    });
  } catch (error) {
    console.error('Failed to save password:', error);
    res.status(500).json({ success: false, message: 'Failed to save password' });
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

    const collection = getPasswordsCollection();
    const result = await collection.updateOne(
      { id, userId: req.user.userId },
      {
        $set: {
          site: password.site.trim(),
          username: password.username.trim(),
          password: encryptVaultPassword(password.password),
          updatedAt: new Date(),
        },
      }
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

    const result = await getPasswordsCollection().deleteOne({ id: passwordId, userId: req.user.userId });

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

async function startServer() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    // Create essential indexes for security & performance
    const db = client.db(DB_NAME);
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('passwords').createIndex({ userId: 1, id: 1 }, { unique: true });
    await db.collection('passwords').createIndex({ userId: 1, site: 1 });

    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start backend:', error);
    process.exit(1);
  }
}

startServer();
