import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, Lock, Phone, Mail, Eye, EyeOff, CheckCircle, AlertCircle, Calendar, Heart, Pill, Users, FileText, Settings } from 'lucide-react';
import axios from 'axios';

export default function PatientProfile() {
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [isEditing, setIsEditing] = useState(false);
    const [showSensitiveData, setShowSensitiveData] = useState(false);
    const [mfaStatus, setMfaStatus] = useState(null);
    const [accessLogs, setAccessLogs] = useState([]);

    useEffect(() => {
        fetchPatientProfile();
        fetchMFAStatus();
        fetchAccessLogs();
    }, []);

    const fetchPatientProfile = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/api/patient/profile');
            setProfile(response.data);
        } catch (error) {
            console.error('Error fetching profile:', error);
            // Mock data for demonstration
            setProfile({
                patient_id: "UUID-1234567890",
                firstName: "Sarah",
                lastName: "Johnson",
                dateOfBirth: "1965-03-15",
                email: "sarah.johnson@example.com",
                phone: "+1-555-123-4567",
                mrn: "MRN-4892847",
                profilePicture: null,

                // Verification Status
                verification: {
                    email_verified: true,
                    phone_verified: true,
                    identity_verified: true,
                    voice_biometric_enrolled: true,
                    mfa_enabled: true,
                    status: "fully_verified"
                },

                // Health Information
                conditions: [
                    {
                        id: "cond-001",
                        name: "Type 2 Diabetes Mellitus",
                        icd10Code: "E11.9",
                        diagnosisDate: "2018-06-10",
                        severity: "moderate",
                        status: "active"
                    },
                    {
                        id: "cond-002",
                        name: "Hypertension (Essential)",
                        icd10Code: "I10",
                        diagnosisDate: "2015-11-20",
                        severity: "mild",
                        status: "active"
                    }
                ],

                medications: [
                    { name: "Metformin", dosage: "500mg", frequency: "Twice daily", refillDays: 5 },
                    { name: "Lisinopril", dosage: "10mg", frequency: "Daily", refillDays: 15 },
                    { name: "Atorvastatin", dosage: "20mg", frequency: "Daily", refillDays: 20 },
                    { name: "Aspirin", dosage: "81mg", frequency: "Daily", refillDays: 30 }
                ],

                allergies: [
                    {
                        id: "allergy-001",
                        allergen: "Penicillin",
                        reactionType: "Anaphylaxis",
                        severity: "severe",
                        notes: "Severe reaction—avoid all penicillin-based antibiotics"
                    }
                ],

                familyHistory: [
                    { relation: "Father", condition: "Heart Attack", ageOfOnset: 62 },
                    { relation: "Mother", condition: "Type 2 Diabetes", ageOfOnset: 55 }
                ],

                lifestyle: {
                    smoking: "former",
                    alcohol: "moderate",
                    exercise: "3x/week",
                    diet: "balanced"
                },

                careTeam: [
                    { name: "Dr. Sarah Smith", specialty: "Primary Care", accessExpires: "2026-07-15" },
                    { name: "Dr. Raj Patel", specialty: "Cardiology", accessExpires: "2026-04-15" },
                    { name: "CVS Pharmacy #4521", specialty: "Pharmacy", accessExpires: "Ongoing" }
                ],

                emergencyContacts: [
                    { name: "John Johnson", relationship: "Spouse", phone: "+1-555-987-6543" },
                    { name: "Emily Johnson", relationship: "Daughter", phone: "+1-555-456-7890" }
                ],

                lastLogin: new Date().toISOString(),
                device: "Chrome on Windows",
                createdAt: "2024-01-15T08:30:00Z"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMFAStatus = async () => {
        try {
            const response = await axios.get('/api/patient/mfa-status');
            setMfaStatus(response.data);
        } catch (error) {
            setMfaStatus({
                enabled: true,
                methods: ['sms', 'biometric'],
                lastVerified: new Date().toISOString()
            });
        }
    };

    const fetchAccessLogs = async () => {
        try {
            const response = await axios.get('/api/patient/access-logs');
            setAccessLogs(response.data);
        } catch (error) {
            setAccessLogs([
                { timestamp: new Date(Date.now() - 3600000).toISOString(), user: "You", action: "Viewed profile", device: "Chrome on Windows" },
                { timestamp: new Date(Date.now() - 86400000).toISOString(), user: "Dr. Sarah Smith", action: "Viewed medications", device: "EHR System" },
                { timestamp: new Date(Date.now() - 172800000).toISOString(), user: "CVS Pharmacy", action: "Updated refill status", device: "Pharmacy Portal" }
            ]);
        }
    };

    const maskSensitiveData = (data, type) => {
        if (showSensitiveData) return data;

        switch (type) {
            case 'ssn':
                return '***-**-' + data.slice(-4);
            case 'phone':
                return '+1-***-***-' + data.slice(-4);
            case 'email':
                const [name, domain] = data.split('@');
                return name.slice(0, 2) + '***@' + domain;
            case 'dob':
                return '**/**/****';
            default:
                return data;
        }
    };

    const getVerificationBadge = (verified) => {
        return verified ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <CheckCircle size={12} />
                Verified
            </span>
        ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                <AlertCircle size={12} />
                Pending
            </span>
        );
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: User },
        { id: 'health', label: 'Health Info', icon: Heart },
        { id: 'medications', label: 'Medications', icon: Pill },
        { id: 'care-team', label: 'Care Team', icon: Users },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'access-logs', label: 'Access Logs', icon: FileText }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading your profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl shadow-xl p-8 text-white">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30">
                            {profile.profilePicture ? (
                                <img src={profile.profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <User size={48} />
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold mb-2">
                                {profile.firstName} {profile.lastName}
                            </h1>
                            <p className="opacity-90 mb-3">Patient ID: {profile.patient_id}</p>
                            <div className="flex items-center gap-3">
                                {profile.verification.status === 'fully_verified' && (
                                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                                        <Shield size={16} />
                                        Fully Verified
                                    </span>
                                )}
                                {profile.verification.mfa_enabled && (
                                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                                        <Lock size={16} />
                                        MFA Enabled
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Settings size={18} />
                        Edit Profile
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                                        ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                                    }`}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="p-6">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Personal Information */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                                    Personal Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-500">Email</span>
                                            {getVerificationBadge(profile.verification.email_verified)}
                                        </div>
                                        <p className="font-medium text-slate-800 dark:text-slate-100">
                                            {maskSensitiveData(profile.email, 'email')}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-500">Phone</span>
                                            {getVerificationBadge(profile.verification.phone_verified)}
                                        </div>
                                        <p className="font-medium text-slate-800 dark:text-slate-100">
                                            {maskSensitiveData(profile.phone, 'phone')}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                        <span className="text-sm text-slate-500 block mb-2">Date of Birth</span>
                                        <p className="font-medium text-slate-800 dark:text-slate-100">
                                            {showSensitiveData ? new Date(profile.dateOfBirth).toLocaleDateString() : '**/**/****'}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                        <span className="text-sm text-slate-500 block mb-2">Medical Record Number</span>
                                        <p className="font-medium text-slate-800 dark:text-slate-100">{profile.mrn}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowSensitiveData(!showSensitiveData)}
                                    className="mt-4 flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                                >
                                    {showSensitiveData ? <EyeOff size={16} /> : <Eye size={16} />}
                                    {showSensitiveData ? 'Hide' : 'Show'} Sensitive Data
                                </button>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">{profile.conditions.length}</div>
                                    <div className="text-sm text-blue-700">Active Conditions</div>
                                </div>
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">{profile.medications.length}</div>
                                    <div className="text-sm text-green-700">Medications</div>
                                </div>
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600">{profile.allergies.length}</div>
                                    <div className="text-sm text-red-700">Allergies</div>
                                </div>
                                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600">{profile.careTeam.length}</div>
                                    <div className="text-sm text-purple-700">Care Team Members</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Health Info Tab */}
                    {activeTab === 'health' && (
                        <div className="space-y-6">
                            {/* Conditions */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                                    Active Conditions
                                </h3>
                                <div className="space-y-3">
                                    {profile.conditions.map((condition) => (
                                        <div key={condition.id} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-100">{condition.name}</h4>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">ICD-10: {condition.icd10Code}</p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${condition.severity === 'mild' ? 'bg-yellow-100 text-yellow-700' :
                                                        condition.severity === 'moderate' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-red-100 text-red-700'
                                                    }`}>
                                                    {condition.severity}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                                                Diagnosed: {new Date(condition.diagnosisDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Allergies */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                                    Allergies & Intolerances
                                </h3>
                                <div className="space-y-3">
                                    {profile.allergies.map((allergy) => (
                                        <div key={allergy.id} className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={20} />
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-red-900">{allergy.allergen}</h4>
                                                    <p className="text-sm text-red-700 mt-1">Reaction: {allergy.reactionType}</p>
                                                    <p className="text-sm text-red-600 mt-2">{allergy.notes}</p>
                                                </div>
                                                <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold">
                                                    {allergy.severity.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Family History */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                                    Family History
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {profile.familyHistory.map((item, idx) => (
                                        <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                            <div className="font-medium text-slate-800 dark:text-slate-100">{item.relation}</div>
                                            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                {item.condition} (Age {item.ageOfOnset})
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Medications Tab */}
                    {activeTab === 'medications' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                Current Medications
                            </h3>
                            {profile.medications.map((med, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100">{med.name}</h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                {med.dosage} • {med.frequency}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${med.refillDays <= 5 ? 'bg-red-100 text-red-700' :
                                                med.refillDays <= 10 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-green-100 text-green-700'
                                            }`}>
                                            Refill in {med.refillDays} days
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Care Team Tab */}
                    {activeTab === 'care-team' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                My Care Team
                            </h3>
                            {profile.careTeam.map((member, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100">{member.name}</h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{member.specialty}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500">Access Expires</p>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                {member.accessExpires === 'Ongoing' ? 'Ongoing' : new Date(member.accessExpires).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                                    Security Status
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center gap-3 mb-2">
                                            <CheckCircle className="text-green-600" size={20} />
                                            <span className="font-medium text-green-900">Email Verified</span>
                                        </div>
                                        <p className="text-sm text-green-700">{profile.email}</p>
                                    </div>
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center gap-3 mb-2">
                                            <CheckCircle className="text-green-600" size={20} />
                                            <span className="font-medium text-green-900">Phone Verified</span>
                                        </div>
                                        <p className="text-sm text-green-700">{profile.phone}</p>
                                    </div>
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center gap-3 mb-2">
                                            <CheckCircle className="text-green-600" size={20} />
                                            <span className="font-medium text-green-900">MFA Enabled</span>
                                        </div>
                                        <p className="text-sm text-green-700">SMS + Biometric</p>
                                    </div>
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center gap-3 mb-2">
                                            <CheckCircle className="text-green-600" size={20} />
                                            <span className="font-medium text-green-900">Voice Biometric</span>
                                        </div>
                                        <p className="text-sm text-green-700">Enrolled & Active</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                                    Session Information
                                </h3>
                                <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Last Login:</span>
                                            <span className="font-medium text-slate-800 dark:text-slate-100">
                                                {new Date(profile.lastLogin).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Device:</span>
                                            <span className="font-medium text-slate-800 dark:text-slate-100">{profile.device}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Account Created:</span>
                                            <span className="font-medium text-slate-800 dark:text-slate-100">
                                                {new Date(profile.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Access Logs Tab */}
                    {activeTab === 'access-logs' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                    Recent Access Activity
                                </h3>
                                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                                    Download Full Report
                                </button>
                            </div>
                            <div className="space-y-3">
                                {accessLogs.map((log, idx) => (
                                    <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="font-medium text-slate-800 dark:text-slate-100">{log.user}</div>
                                                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{log.action}</div>
                                                <div className="text-xs text-slate-500 mt-1">{log.device}</div>
                                            </div>
                                            <div className="text-sm text-slate-500">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
