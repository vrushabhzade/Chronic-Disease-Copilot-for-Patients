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

// Interaction Database (Mock)
const INTERACTIONS_DB = {
    'aspirin-warfarin': {
        severity: 'High',
        description: 'Increases the risk of bleeding. Aspirin has antiplatelet effects which can amplify the anticoagulant effect of Warfarin.',
        recommendation: 'Avoid concurrent use unless monitored closely by a physician.'
    },
    'lisinopril-potassium': {
        severity: 'Medium',
        description: 'May causing hyperkalemia (high blood potassium levels).',
        recommendation: 'Monitor potassium levels regularly.'
    },
    'ibuprofen-lisinopril': {
        severity: 'Medium',
        description: 'NSAIDs may reduce the antihypertensive effect of ACE inhibitors and increase risk of renal impairment.',
        recommendation: 'Use lowest effective dose of NSAID and monitor blood pressure.'
    }
};

app.post('/api/interactions', (req, res) => {
    const { drugs } = req.body;
    if (!drugs || !Array.isArray(drugs)) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    const normalizedDrugs = drugs.map(d => d.trim().toLowerCase()).filter(Boolean);
    let foundInteraction = null;

    for (let i = 0; i < normalizedDrugs.length; i++) {
        for (let j = i + 1; j < normalizedDrugs.length; j++) {
            const key1 = `${normalizedDrugs[i]}-${normalizedDrugs[j]}`;
            const key2 = `${normalizedDrugs[j]}-${normalizedDrugs[i]}`;

            if (INTERACTIONS_DB[key1]) foundInteraction = { ...INTERACTIONS_DB[key1], pair: [normalizedDrugs[i], normalizedDrugs[j]] };
            if (INTERACTIONS_DB[key2]) foundInteraction = { ...INTERACTIONS_DB[key2], pair: [normalizedDrugs[i], normalizedDrugs[j]] };
            if (foundInteraction) break;
        }
        if (foundInteraction) break;
    }

    if (foundInteraction) {
        res.json({ status: 'warning', data: foundInteraction });
    } else {
        res.json({ status: 'safe', message: 'No significant interactions found in our database.' });
    }
});

// LLM Context Handler (Mocking a smart agent)
app.post('/api/chat', async (req, res) => {
    const { text, context, history } = req.body;

    // In a real app, we would send this `text` and `history` to OpenAI/Claude here.
    // For this MVP with a specific API key format, we'll simulate the "Reasoning" engine.

    let responseText = "I'm listening. Tell me more.";
    let action = null;

    const normalizedText = text?.toLowerCase() || "";

    if (context === 'symptom-log') {
        if (normalizedText.includes('pain') || normalizedText.includes('hurt') || normalizedText.includes('ache')) {
            responseText = "I've noted that. On a scale of 1 to 10, how severe is the pain?";
            action = "ask_severity";
        } else if (normalizedText.match(/\d+/)) {
            // Assume number is severity
            const severity = normalizedText.match(/\d+/)[0];
            responseText = `Got it. Severity ${severity}. I've logged this symptom to your journal. Any other symptoms?`;

            // Log to DB
            if (!req.isPrivacyMode) {
                try {
                    const stmt = db.prepare('INSERT INTO symptoms (description, severity) VALUES (?, ?)');
                    stmt.run(`Pain reported via voice`, severity);
                } catch (e) { console.error(e); }
            } else {
                console.log('[PRIVACY] Skipping Symptom Log');
            }

            action = "log_complete";
        } else {
            responseText = "I'm ready to log. Describe your symptoms.";
        }
    } else if (context === 'med-prep') {
        responseText = "I've pulled your health summary. Your BP has been slightly elevated this week. I've sent a detailed report to your secure inbox for Dr. Smith.";
    } else {
        // General Conversation
        if (normalizedText.includes('dizzy') || normalizedText.includes('dizziness')) {
            responseText = "Dizziness can be a side effect of Lisinopril. I'm logging this interaction. Please sit down and drink some water.";
            // Log potential side effect
            if (!req.isPrivacyMode) {
                db.prepare('INSERT INTO symptoms (description, severity) VALUES (?, ?)').run('Dizziness (Side Effect)', 5);
            } else {
                console.log('[PRIVACY] Skipping Side Effect Log');
            }
        } else if (normalizedText.includes('hello') || normalizedText.includes('hi')) {
            responseText = "Hello, John. I'm here to help manage your health. How are you feeling?";
        } else {
            responseText = "I understand. I've updated your daily log.";
        }
    }

    res.json({ text: responseText, action });
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

    // AI Analysis (mock - in production would use Claude/OpenAI)
    const lowerSymptom = symptom.toLowerCase();
    let analysis = '';
    let severity = 'low';
    let tags = [];
    let followUp = [];

    if (lowerSymptom.includes('dizz')) {
        analysis = "Dizziness can be a side effect of your blood pressure medication (Lisinopril). It could also be related to your low potassium levels. I recommend sitting down and drinking water.";
        severity = 'medium';
        tags = ['dizziness', 'medication-side-effect', 'blood-pressure'];
        followUp = [
            { text: 'When did the dizziness start?', options: ['Just now', 'This morning', 'Yesterday', 'A few days ago'] },
            { text: 'How severe is it on a scale of 1-10?', options: ['1-3 (Mild)', '4-6 (Moderate)', '7-10 (Severe)'] }
        ];
    } else if (lowerSymptom.includes('headache') || lowerSymptom.includes('head')) {
        analysis = "Headaches can be related to blood pressure changes. Since you've had elevated BP readings, this could be connected. Monitor your blood pressure and note the time of day.";
        severity = 'medium';
        tags = ['headache', 'blood-pressure'];
        followUp = [
            { text: 'Where is the headache located?', options: ['Forehead', 'Temples', 'Back of head', 'All over'] }
        ];
    } else if (lowerSymptom.includes('fatigue') || lowerSymptom.includes('tired')) {
        analysis = "Fatigue could be related to your diabetes management or low potassium. Make sure you're eating regularly and staying hydrated.";
        severity = 'low';
        tags = ['fatigue', 'diabetes', 'potassium'];
    } else {
        analysis = `I've logged your symptom: "${symptom}". I'll track this and look for patterns. If it persists or worsens, please contact your doctor.`;
        severity = 'low';
        tags = ['general'];
    }

    res.json({ analysis, severity, tags, followUp });
});

app.get('/api/symptoms/patterns', (req, res) => {
    // Detect patterns in symptoms
    try {
        const symptoms = db.prepare('SELECT * FROM symptoms WHERE timestamp > datetime("now", "-7 days")').all();
        const patterns = [];

        // Count dizziness occurrences
        const dizzinessCount = symptoms.filter(s => s.description.toLowerCase().includes('dizz')).length;
        if (dizzinessCount >= 3) {
            patterns.push({
                message: `You've reported dizziness ${dizzinessCount} times this week. This is unusual for you and may be related to your blood pressure medication or low potassium levels. Consider contacting your doctor.`
            });
        }

        res.json(patterns);
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

    let explanation = '';

    // Mock AI explanation - in production would use Claude/OpenAI
    if (testName === 'HbA1c') {
        explanation = `Your HbA1c is ${value}%, down from ${previousValue}% last quarter. That's great progress! This test measures your average blood sugar over the past 3 months. You're in the prediabetic range, but moving in the right direction. Keep up with your current medications and lifestyle changes.`;
    } else if (testName === 'Potassium') {
        explanation = `Your potassium is ${value}, which is below the normal range. Low potassium can cause muscle weakness, fatigue, and irregular heartbeat. This might be related to your blood pressure medication. Contact your doctor today to discuss whether you need a potassium supplement or dietary changes.`;
    } else {
        explanation = `Your ${testName} is ${value}. Reference range is ${referenceRange}. ${previousValue ? `Previous value was ${previousValue}.` : ''}`;
    }

    res.json({ explanation });
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

    // Generate preparation data based on recent health data
    const preparationData = {
        summary: `Preparing for your ${specialty} appointment`,
        keyTopics: [
            'Recent blood pressure elevations (60% of mornings)',
            'Dizziness episodes (3 times this week)',
            'Medication adjustment needed for Lisinopril',
            'Low potassium levels from recent lab work'
        ],
        suggestedQuestions: [
            'Should we adjust my blood pressure medication due to morning elevations?',
            'Could my dizziness be related to low potassium levels?',
            'Do I need to add a potassium supplement?',
            'What lifestyle changes can help stabilize my blood pressure?'
        ],
        recentSymptoms: [
            { symptom: 'Dizziness', frequency: '3 times this week', severity: 'Moderate' },
            { symptom: 'Morning headaches', frequency: '4 days this week', severity: 'Mild' }
        ],
        medications: [
            { name: 'Lisinopril', dose: '10mg', frequency: 'Daily', adherence: '95%' },
            { name: 'Metformin', dose: '500mg', frequency: 'Twice daily', adherence: '98%' }
        ],
        labResults: [
            { test: 'Blood Pressure', value: '145/92 mmHg', status: 'Elevated', trend: 'Worsening' },
            { test: 'Potassium', value: '3.2 mEq/L', status: 'Low', trend: 'Declining' }
        ],
        actionItems: [
            'Bring updated medication list',
            'Bring blood pressure log from past 2 weeks',
            'Discuss potassium supplementation'
        ],
        voiceSummary: `Good morning! Let me help you prepare for your ${specialty} appointment. Based on your recent health data, here are the key topics to discuss: Your blood pressure has been elevated 60% of mornings. You've experienced dizziness 3 times this week, which could be related to your recent lab results showing low potassium. I recommend asking your doctor about adjusting your Lisinopril dosage and whether you need potassium supplementation.`
    };

    res.json(preparationData);
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
app.post('/api/check-in/process', (req, res) => {
    const { text, currentStep } = req.body;
    const input = text.toLowerCase();

    let nextQuestion = "";
    let updatedData = {};
    let isComplete = false;

    // Mock sequential health interrogation logic
    if (currentStep === 'mood') {
        updatedData.mood = text;
        nextQuestion = "Understood. Have you taken your morning Metformin and Lisinopril today?";
    } else if (currentStep === 'adherence') {
        updatedData.adherence = text;
        nextQuestion = "And any symptoms like dizziness or fatigue occurring today?";
    } else if (currentStep === 'symptoms') {
        updatedData.symptoms = text;
        nextQuestion = "Lastly, did you record your blood pressure today? If so, what was the reading?";
    } else if (currentStep === 'vitalSigns') {
        updatedData.vitalSigns = text;
        isComplete = true;
    }

    // In production, use LLM to extract data from 'text'
    res.json({ nextQuestion, updatedData, isComplete });
});

// Export for Vercel
export default app;

// Start server locally
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}
