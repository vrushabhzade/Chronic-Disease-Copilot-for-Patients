import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// import Database from 'better-sqlite3'; // Converted to dynamic import
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Privacy Mode Middleware
app.use((req, res, next) => {
    const isPrivacyMode = req.headers['x-privacy-mode'] === 'true';
    req.isPrivacyMode = isPrivacyMode;

    if (isPrivacyMode && req.method !== 'GET') {
        console.log(`[PRIVACY] Intercepting ${req.method} request to ${req.url}`);

        // Allow TTS/AI processing but BLOCK DB writes
        // We'll wrap the `db.prepare` or just handle it in routes.
        // For this MVP, we will patch the DB methods on the request object or just check the flag in routes.
        // Better yet, we can override the response to "fake" a success if it's a pure write operation that we want to skip.

        // HOWEVER, for 'interactive' features like AI Chat, we still need the response.
        // So we will just attach the flag and check it in the route handlers.
    }
    next();
});

// Database Helper that respects Privacy Mode
const runSecure = (stmt, params) => {
    // This helper isn't easily accessible inside routes unless we pass it or attach to req.
    // We'll check req.isPrivacyMode inside the routes instead for clarity.
};

// Mock Database for Vercel (Serverless/Ephemeral)
class MockDatabase {
    constructor() {
        this.medications = [
            { id: 1, name: 'Lisinopril', dosage: '10mg', frequency: 'Daily', time: '08:00 AM' },
            { id: 2, name: 'Metformin', dosage: '500mg', frequency: 'Twice Daily', time: '08:00 AM' }
        ];
        this.adherence_logs = [];
        this.symptoms = [];
        console.log('[DB] Initialized In-Memory Mock Database for Vercel');
    }

    pragma() { }
    exec() { }

    prepare(sql) {
        const self = this;
        return {
            run: (...args) => {
                const lowerSql = sql.toLowerCase();
                if (lowerSql.includes('insert into medications')) {
                    const [name, dosage, frequency, time] = args;
                    const id = self.medications.length + 1;
                    self.medications.push({ id, name, dosage, frequency, time });
                    return { lastInsertRowid: id };
                }
                if (lowerSql.includes('delete from medications')) {
                    const id = args[0];
                    self.medications = self.medications.filter(m => m.id != id);
                    return { changes: 1 };
                }
                if (lowerSql.includes('insert into adherence_logs')) {
                    const [med_id, status] = args;
                    const id = self.adherence_logs.length + 1;
                    self.adherence_logs.push({ id, med_id, status, taken_at: new Date().toISOString() });
                    return { lastInsertRowid: id };
                }
                if (lowerSql.includes('update adherence_logs')) {
                    // args: [status, id]
                    const log = self.adherence_logs.find(l => l.id === args[1]);
                    if (log) { log.status = args[0]; log.taken_at = new Date().toISOString(); }
                    return { changes: 1 };
                }
                if (lowerSql.includes('delete from adherence_logs')) {
                    self.adherence_logs = self.adherence_logs.filter(l => l.id !== args[0]);
                    return { changes: 1 };
                }
                if (lowerSql.includes('insert into symptoms')) {
                    const [description, severity] = args;
                    self.symptoms.push({ id: self.symptoms.length + 1, description, severity, timestamp: new Date().toISOString() });
                    return { lastInsertRowid: self.symptoms.length };
                }
                return { lastInsertRowid: 0 };
            },
            all: (...args) => {
                const lowerSql = sql.toLowerCase();
                if (lowerSql.includes('select * from medications')) return self.medications;
                if (lowerSql.includes('from adherence_logs')) {
                    // Very basic match for "date(taken_at) = ?"
                    const dateDesc = args[0]; // e.g., '2023-10-27'
                    return self.adherence_logs.filter(l => l.taken_at.startsWith(dateDesc));
                }
                return [];
            },
            get: (...args) => {
                const lowerSql = sql.toLowerCase();
                if (lowerSql.includes('from adherence_logs')) {
                    // med_id = ? AND date = ?
                    const medId = args[0];
                    const dateDesc = args[1];
                    return self.adherence_logs.find(l => l.med_id === medId && l.taken_at.startsWith(dateDesc));
                }
                return null;
            }
        };
    }
}

// Ollama API Integration
async function callOllama(prompt, systemContext = "You are a helpful medical assistant.", isJSON = false) {
    try {
        const response = await axios.post('http://127.0.0.1:11434/api/generate', {
            model: process.env.OLLAMA_MODEL || 'qwen3.5:latest',
            prompt: prompt,
            system: systemContext,
            stream: false,
            format: isJSON ? 'json' : undefined,
        });
        if (isJSON) {
            return JSON.parse(response.data.response);
        }
        return response.data.response;
    } catch (error) {
        console.error('Ollama API Error:', error.message);
        throw error;
    }
}

// Database Setup
let db;

const initializeDB = async () => {
    if (process.env.VERCEL) {
        db = new MockDatabase();
    } else {
        try {
            // Dynamic import to avoid crashing Vercel if better-sqlite3 isn't available/compatible
            // require is needed for some environments, but we are in ESM.
            // valid in Node 12+ 
            const { default: Database } = await import('better-sqlite3');
            db = new Database('database.db');
            db.pragma('journal_mode = WAL');
            console.log("SQLite Database Initialized");

            // Initialize Tables (Only for Real DB)
            db.exec(`
              CREATE TABLE IF NOT EXISTS medications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                dosage TEXT,
                frequency TEXT,
                severity INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
              );

              CREATE TABLE IF NOT EXISTS adherence_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                med_id INTEGER NOT NULL,
                taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'taken',
                FOREIGN KEY(med_id) REFERENCES medications(id)
              );
              
              CREATE TABLE IF NOT EXISTS symptoms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                description TEXT,
                severity INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
              );
            `);

        } catch (e) {
            console.error("Failed to load SQLite, falling back to MockDB", e);
            db = new MockDatabase();
        }
    }
};

// Initialize immediately but allow for async lag (Express requests might fail if hit instantly before init)
// In Serverless `await` at top level is supported in some configs or we wrap handlers.
// For simplicity, we'll just start it.
initializeDB();

// Middleware to ensure DB is ready
app.use(async (req, res, next) => {
    if (!db) {
        // Simple spin-wait or just fail for the very first cold start ms
        await initializeDB();
    }
    next();
});

// Mock Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Chronic Disease Copilot API is running' });
});

// Adherence API
app.get('/api/adherence', (req, res) => {
    // Get logs for today
    const startOfDay = new Date().toISOString().split('T')[0];
    const logs = db.prepare('SELECT * FROM adherence_logs WHERE date(taken_at) = ?').all(startOfDay);
    res.json(logs);
});

app.post('/api/medications/:id/log', (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'taken' or 'skipped'

    if (req.isPrivacyMode) {
        console.log('[PRIVACY] Skipping Adherence Log');
        // Return a mock success response so UI updates optimistically
        return res.json({ status: 'logged', med_id: id, privacy_mode: true });
    }

    // Check if already logged for today (simple logic)
    const startOfDay = new Date().toISOString().split('T')[0];
    const existing = db.prepare('SELECT * FROM adherence_logs WHERE med_id = ? AND date(taken_at) = ?').get(id, startOfDay);

    if (existing) {
        // Toggle/Update
        if (status === 'undo') {
            db.prepare('DELETE FROM adherence_logs WHERE id = ?').run(existing.id);
            res.json({ status: 'undo', med_id: id });
        } else {
            // Update status (e.g. taken -> skipped)
            // For now, let's just ignore or allow multiple? Let's assume one log per day per med for the MVP.
            // If they want to change 'taken' to 'skipped', we update.
            db.prepare('UPDATE adherence_logs SET status = ?, taken_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, existing.id);
            res.json({ status: 'updated', med_id: id });
        }
    } else {
        // Insert new
        const stmt = db.prepare('INSERT INTO adherence_logs (med_id, status) VALUES (?, ?)');
        const info = stmt.run(id, status || 'taken');
        res.json({ id: info.lastInsertRowid, status: 'logged', med_id: id });
    }
});

// Medications API
app.get('/api/medications', (req, res) => {
    const meds = db.prepare('SELECT * FROM medications').all();
    res.json(meds);
});

app.post('/api/medications', (req, res) => {
    const { name, dosage, frequency, time } = req.body;
    const stmt = db.prepare('INSERT INTO medications (name, dosage, frequency, time) VALUES (?, ?, ?, ?)');
    const info = stmt.run(name, dosage, frequency, time);
    res.json({ id: info.lastInsertRowid, ...req.body });
});

app.delete('/api/medications/:id', (req, res) => {
    const stmt = db.prepare('DELETE FROM medications WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
});

// ElevenLabs Proxy
app.post('/api/elevenlabs/tts', async (req, res) => {
    try {
        const { text } = req.body;
        const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY; // Needs to be set in .env
        const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel (Example Voice)

        if (!ELEVENLABS_API_KEY) {
            return res.status(500).json({ error: 'ElevenLabs API Key not configured' });
        }

        const response = await axios({
            method: 'post',
            url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            data: {
                text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: { stability: 0.5, similarity_boost: 0.5 }
            },
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer'
        });

        res.set('Content-Type', 'audio/mpeg');
        res.send(response.data);
    } catch (error) {
        console.error('ElevenLabs API Error:', error?.response?.data || error.message);
        res.status(500).json({ error: 'Failed to generate speech' });
    }
});

// LLM Powered Drug Interaction Checker
app.post('/api/interactions', async (req, res) => {
    const { drugs } = req.body;
    if (!drugs || !Array.isArray(drugs)) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    try {
        const systemContext = `You are a medical AI assistant checking for drug interactions.
Analyze the provided list of medications and determine if there are any significant interactions.
Respond strictly in valid JSON format matching this structure:
{
  "status": "warning" | "safe",
  "data": {
     "pair": ["drug1", "drug2"],
     "severity": "High" | "Medium" | "Low",
     "description": "Description of the interaction",
     "recommendation": "What the patient should do"
  } 
}
If there are no interactions, return {"status": "safe"}.`;
        
        const prompt = `Check interactions for these medications: ${drugs.join(', ')}`;
        const result = await callOllama(prompt, systemContext, true);
        
        if (result.status === 'warning' && result.data) {
            res.json({ status: 'warning', data: result.data });
        } else {
            res.json({ status: 'safe', message: 'No significant interactions found.' });
        }
    } catch (error) {
        console.error("Interactions API Error:", error);
        res.json({ status: 'safe', message: 'Interaction check unavailable at this time.' });
    }
});

// LLM Context Handler (Now powered by Ollama)
app.post('/api/chat', async (req, res) => {
    const { text, context, history } = req.body;

    try {
        const systemContext = `You are a helpful medical assistant for a patient named John. Context of current UI: ${context}. 
Respond strictly in valid JSON format:
{
  "text": "Your natural language response to the user",
  "action": "Optional action command. Use 'ask_severity' if you need to know severity of a symptom. Use 'log_complete' if the user just provided symptom details and severity. Otherwise set to null."
}`;

        const prompt = `User says: "${text}". 
History: ${JSON.stringify(history || [])}. 
Respond in the required JSON format.`;

        const result = await callOllama(prompt, systemContext, true);
        
        let responseText = result.text || "I'm listening. Tell me more.";
        let action = result.action || null;
        
        // Handle side-effects for certain actions
        if (action === "log_complete" && context === "symptom-log") {
            const severityMatch = text?.match(/\d+/);
            const severity = severityMatch ? severityMatch[0] : 5;
            if (!req.isPrivacyMode) {
                try {
                    const stmt = db.prepare('INSERT INTO symptoms (description, severity) VALUES (?, ?)');
                    stmt.run(`Symptom reported via voice: ${text}`, severity);
                } catch (e) { console.error(e); }
            } else {
                console.log('[PRIVACY] Skipping Symptom Log');
            }
        }

        res.json({ text: responseText, action });
    } catch (error) {
        console.error("Chat API Error:", error);
        res.json({ text: "I'm sorry, I'm having trouble connecting to my AI backend. Please try again later.", action: null });
    }
});

// ========== NEW ENHANCED FEATURES API ENDPOINTS ==========

// Symptom Logger API
app.get('/api/symptoms', (req, res) => {
    try {
        const symptoms = db.prepare('SELECT * FROM symptoms ORDER BY timestamp DESC LIMIT 50').all();
        res.json(symptoms);
    } catch (error) {
        console.error('Error fetching symptoms:', error);
        res.json([]);
    }
});

app.post('/api/symptoms/analyze', async (req, res) => {
    const { symptom, timestamp } = req.body;

    if (req.isPrivacyMode) {
        console.log('[PRIVACY] Skipping symptom storage, but providing analysis');
    } else {
        // Store symptom in database
        try {
            db.prepare('INSERT INTO symptoms (description, severity, timestamp) VALUES (?, ?, ?)').run(symptom, 5, timestamp);
        } catch (error) {
            console.error('Error storing symptom:', error);
        }
    }

    try {
        const systemContext = `You are a medical AI assistant. Analyze the reported symptom and respond in strictly valid JSON format matching this structure:
{
  "analysis": "A brief explanation of what the symptom might mean and immediate advice.",
  "severity": "low" | "medium" | "high",
  "tags": ["array", "of", "relevant", "tags"],
  "followUp": [{"text": "Follow-up question?", "options": ["Option 1", "Option 2"]}]
}`;
        const prompt = `Patient reports symptom: "${symptom}". Provide the analysis JSON.`;
        const result = await callOllama(prompt, systemContext, true);
        
        res.json({
            analysis: result.analysis || `Logged symptom: ${symptom}`,
            severity: result.severity || 'low',
            tags: result.tags || ['general'],
            followUp: result.followUp || []
        });
    } catch (error) {
        console.error("Analyze API Error:", error);
        res.json({ 
            analysis: `I've logged your symptom: "${symptom}". (AI analysis currently unavailable)`,
            severity: 'low',
            tags: ['general'],
            followUp: []
        });
    }
});

app.get('/api/symptoms/patterns', async (req, res) => {
    try {
        const symptoms = db.prepare('SELECT * FROM symptoms WHERE timestamp > datetime("now", "-7 days")').all();
        if (!symptoms || symptoms.length === 0) return res.json([]);

        const systemContext = `You are a medical AI assistant analyzing a patient's recent symptoms.
Look for any concerning patterns in the provided symptoms over the last 7 days.
Respond strictly in valid JSON format matching this structure:
{
  "patterns": [
    { "message": "Description of the pattern and a recommendation" }
  ]
}`;
        const prompt = `Here are the symptoms reported in the last 7 days: ${JSON.stringify(symptoms)}. Analyze them for patterns.`;
        const result = await callOllama(prompt, systemContext, true);
        
        res.json(result.patterns || []);
    } catch (error) {
        console.error('Error detecting patterns:', error);
        res.json([]);
    }
});

app.post('/api/symptoms/follow-up', async (req, res) => {
    const { question, answer, symptomId } = req.body;

    const analysis = `Thank you for that information. I've updated your symptom log with: ${answer}. I'll continue monitoring for patterns.`;

    res.json({ analysis });
});

// Lab Results API
app.get('/api/lab-results', (req, res) => {
    // Mock lab results - in production would integrate with FHIR/EHR systems
    const mockResults = [
        {
            id: 1,
            testName: 'HbA1c',
            value: 7.2,
            unit: '%',
            referenceRange: '< 5.7',
            status: 'improving',
            previousValue: 8.1,
            date: new Date().toISOString().split('T')[0],
            interpretation: 'Prediabetic range',
            trend: 'down',
            changePercent: -11.1
        }
    ];

    res.json(mockResults);
});

app.post('/api/lab-results/explain', async (req, res) => {
    const { testName, value, referenceRange, previousValue } = req.body;

    try {
        const systemContext = `You are a medical AI assistant. Explain the lab result to the patient in plain, easy-to-understand language. Respond strictly in valid JSON format:
{
  "explanation": "Your explanation here"
}`;
        const prompt = `Test Name: ${testName}\nCurrent Value: ${value}\nReference Range: ${referenceRange}\nPrevious Value: ${previousValue || 'N/A'}\nProvide the explanation JSON.`;
        const result = await callOllama(prompt, systemContext, true);
        
        res.json({ explanation: result.explanation || `Your ${testName} is ${value}. Reference range is ${referenceRange}.` });
    } catch (error) {
        console.error("Lab Explain API Error:", error);
        res.json({ explanation: `Your ${testName} is ${value}. Reference range is ${referenceRange}. (AI explanation currently unavailable)` });
    }
});

// Appointments API
app.get('/api/appointments', (req, res) => {
    // Mock appointments - in production would integrate with calendar/EHR
    const mockAppointments = [
        {
            id: 1,
            doctor: 'Dr. Sarah Johnson',
            specialty: 'Cardiology',
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
            time: '14:00',
            location: 'Heart Center, 3rd Floor',
            type: 'Follow-up',
            status: 'upcoming'
        }
    ];

    res.json(mockAppointments);
});

app.post('/api/appointments/prepare', async (req, res) => {
    const { appointmentId, specialty } = req.body;

    try {
        const systemContext = `You are a medical AI assistant preparing a patient for an upcoming doctor's appointment. Respond strictly in valid JSON format matching this structure:
{
  "summary": "Brief summary",
  "keyTopics": ["Topic 1", "Topic 2"],
  "suggestedQuestions": ["Question 1", "Question 2"],
  "recentSymptoms": [{"symptom": "Name", "frequency": "Often", "severity": "Mild"}],
  "medications": [{"name": "Med Name", "dose": "10mg", "frequency": "Daily", "adherence": "95%"}],
  "labResults": [{"test": "Test Name", "value": "123", "status": "Normal", "trend": "Stable"}],
  "actionItems": ["Action 1", "Action 2"],
  "voiceSummary": "A friendly summary intended to be spoken aloud"
}`;
        const prompt = `Prepare the patient for a ${specialty} appointment. Base it on typical common scenarios if no real data is provided.`;
        const result = await callOllama(prompt, systemContext, true);
        
        res.json(result);
    } catch (error) {
        console.error("Prepare API Error:", error);
        // Fallback to mock data
        res.json({
            summary: `Preparing for your ${specialty} appointment (AI fallback)`,
            keyTopics: ['Discuss recent symptoms', 'Review current medications'],
            suggestedQuestions: ['Are there any lifestyle changes I should make?'],
            recentSymptoms: [],
            medications: [],
            labResults: [],
            actionItems: ['Bring updated medication list'],
            voiceSummary: `Let me help you prepare for your ${specialty} appointment. Please remember to bring your latest health records.`
        });
    }
});

app.post('/api/appointments/share', async (req, res) => {
    const { appointmentId, preparationData } = req.body;

    // In production, would send secure message to doctor's EHR
    console.log('Sharing appointment prep with doctor:', appointmentId);

    res.json({ success: true, message: 'Summary shared with your doctor' });
});

// Voice/TTS API (ElevenLabs integration)
app.post('/api/voice/speak', async (req, res) => {
    const { text, voice } = req.body;

    try {
        const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

        if (!ELEVENLABS_API_KEY) {
            // Fallback: return success but no audio
            return res.json({ audioUrl: null, message: 'TTS not configured' });
        }

        // Voice mapping
        const voiceIds = {
            'empathetic-female': '21m00Tcm4TlvDq8ikWAM', // Rachel
            'professional-female': 'EXAVITQu4vr4xnSDxMaL', // Bella
            'calm-male': 'pNInz6obpgDQGcFmaJgB' // Adam
        };

        const voiceId = voiceIds[voice] || voiceIds['empathetic-female'];

        const response = await axios({
            method: 'post',
            url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            data: {
                text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: { stability: 0.6, similarity_boost: 0.75 }
            },
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer'
        });

        // Convert to base64 data URL for easy playback
        const audioBase64 = Buffer.from(response.data).toString('base64');
        const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

        res.json({ audioUrl });
    } catch (error) {
        console.error('ElevenLabs TTS Error:', error?.response?.data || error.message);
        res.json({ audioUrl: null, error: 'TTS failed' });
    }
});

// ========== PATIENT PROFILE & AUTHENTICATION API ==========

// Auth: Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    // Mock authentication logic
    if (email === 'sarah.johnson@example.com' && password === 'password123') {
        // In a real app, generate a single-use MFA token here
        res.json({
            mfaRequired: true,
            mfaToken: 'mfa-temp-token-xyz-123',
            message: 'MFA code sent to your verified phone number'
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
});

// Auth: Verify MFA
app.post('/api/auth/verify-mfa', (req, res) => {
    const { mfaToken, mfaCode } = req.body;

    // Mock MFA verification logic (accepts 123456 as code)
    if (mfaToken === 'mfa-temp-token-xyz-123' && mfaCode === '123456') {
        res.json({
            sessionToken: 'jwt-session-token-abc-789',
            refreshToken: 'jwt-refresh-token-def-456',
            expiresIn: 3600
        });
    } else {
        res.status(401).json({ message: 'Invalid MFA code' });
    }
});

// Profile: Get Profile
app.get('/api/patient/profile', (req, res) => {
    // Mock patient profile data
    const patientProfile = {
        patient_id: "UUID-1234567890",
        firstName: "Sarah",
        lastName: "Johnson",
        dateOfBirth: "1965-03-15",
        email: "sarah.johnson@example.com",
        phone: "+1-555-123-4567",
        mrn: "MRN-4892847",
        verification: {
            email_verified: true,
            phone_verified: true,
            identity_verified: true,
            voice_biometric_enrolled: true,
            mfa_enabled: true,
            status: "fully_verified"
        },
        conditions: [
            { id: "cond-001", name: "Type 2 Diabetes Mellitus", icd10Code: "E11.9", diagnosisDate: "2018-06-10", severity: "moderate", status: "active" },
            { id: "cond-002", name: "Hypertension (Essential)", icd10Code: "I10", diagnosisDate: "2015-11-20", severity: "mild", status: "active" }
        ],
        medications: [
            { name: "Metformin", dosage: "500mg", frequency: "Twice daily", refillDays: 5 },
            { name: "Lisinopril", dosage: "10mg", frequency: "Daily", refillDays: 15 }
        ],
        allergies: [
            { id: "allergy-001", allergen: "Penicillin", reactionType: "Anaphylaxis", severity: "severe", notes: "Avoid all penicillin-based medications." }
        ],
        familyHistory: [
            { relation: "Father", condition: "Heart Attack", ageOfOnset: 62 },
            { relation: "Mother", condition: "Type 2 Diabetes", ageOfOnset: 55 }
        ],
        careTeam: [
            { name: "Dr. Sarah Smith", specialty: "Primary Care", accessExpires: "2026-07-15" },
            { name: "Dr. Raj Patel", specialty: "Cardiology", accessExpires: "2026-04-15" }
        ],
        lastLogin: new Date().toISOString(),
        device: "Chrome on Windows",
        createdAt: "2024-01-15T08:30:00Z"
    };

    res.json(patientProfile);
});

// Profile: MFA Status
app.get('/api/patient/mfa-status', (req, res) => {
    res.json({
        enabled: true,
        methods: ['email_otp', 'sms_otp', 'biometric'],
        lastVerified: new Date().toISOString()
    });
});

// Profile: Access Logs
app.get('/api/patient/access-logs', (req, res) => {
    const logs = [
        { timestamp: new Date(Date.now() - 3600000).toISOString(), user: "Sarah Johnson", action: "Successful MFA Login", device: "Chrome on Windows" },
        { timestamp: new Date(Date.now() - 86400000).toISOString(), user: "Dr. Sarah Smith", action: "Viewed health summary", device: "EHR System" },
        { timestamp: new Date(Date.now() - 172800000).toISOString(), user: "CVS Pharmacy", action: "Refill request processed", device: "Pharmacy Portal" }
    ];
    res.json(logs);
});

// Profile: Update Profile
app.put('/api/patient/profile', (req, res) => {
    if (req.isPrivacyMode) {
        return res.json({ success: true, message: "Privacy Mode: Changes not saved to persistent storage" });
    }
    // Simulation: Save changes to DB
    res.json({ success: true, message: "Profile updated successfully" });
});

// ========== DAILY CHECK-IN & VOICE VERIFICATION API ==========

// Auth: Voice Verification (Simulated)
app.post('/api/auth/voice-verify', (req, res) => {
    const { transcript } = req.body;

    // In production, ElevenLabs or similar provider would verify the audio stream
    // Using simple phrase matching for demo
    const expectedPhrase = "my health is my priority";
    const normalizedTranscript = transcript.toLowerCase().replace(/[.,!]/g, '');

    if (normalizedTranscript.includes(expectedPhrase)) {
        res.json({ verified: true, message: "Voice identity confirmed" });
    } else {
        res.json({ verified: false, message: "Voice not recognized" });
    }
});

// Check-in: Process Interaction
app.post('/api/check-in/process', async (req, res) => {
    const { text, currentStep } = req.body;

    try {
        const systemContext = `You are a medical AI assistant conducting a daily check-in with a patient. 
The check-in steps are: mood -> adherence -> symptoms -> vitalSigns.
The patient is currently answering for the step: "${currentStep}". 
Analyze the response and determine the next question.
Respond strictly in valid JSON format matching this structure:
{
  "extractedData": "The extracted value for the current step (e.g. 'Feeling good', 'Taken all meds', 'No symptoms', '120/80')",
  "nextQuestion": "The next empathetic and natural question to ask for the next step, or a closing message if this was the last step.",
  "isComplete": boolean (true if this was the 'vitalSigns' step or if the check-in is over)
}`;
        const prompt = `Patient response: "${text}". Process this response for the ${currentStep} step.`;
        const result = await callOllama(prompt, systemContext, true);
        
        let updatedData = {};
        if (currentStep) {
            updatedData[currentStep] = result.extractedData || text;
        }

        res.json({ 
            nextQuestion: result.nextQuestion || "Thank you. Is there anything else you'd like to add?", 
            updatedData, 
            isComplete: result.isComplete || false 
        });
    } catch (error) {
        console.error("Check-in Process Error:", error);
        res.json({ nextQuestion: "I'm having trouble processing that right now. Can we continue this later?", updatedData: {}, isComplete: true });
    }
});

// Export for Vercel
export default app;

// Start server locally
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}
