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
      ...password,
      password: encryptVaultPassword(password.password),
      userId: req.user.userId,
    };

    await getPasswordsCollection().insertOne(recordToInsert);

    res.status(201).json({
      success: true,
      password,
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
          site: password.site,
          username: password.username,
          password: encryptVaultPassword(password.password),
          id: password.id,
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

    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start backend:', error);
    process.exit(1);
  }
}

startServer();
