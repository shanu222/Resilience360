let currentUser = null;
let codes = JSON.parse(localStorage.getItem("codes")) || [];
let deletedPredefinedCodes = JSON.parse(localStorage.getItem("deletedPredefinedCodes")) || [];

const DEFAULT_RECOVERY_EMAILJS_CONFIG = {
    serviceId: 'service_0kiqxra',
    templateId: 'template_4uniopo',
    publicKey: 'X90Cc5FI-rBZC-5Fp',
    fromName: 'Pakistan Green Building Codes Portal'
};

const SUPABASE_URL = 'https://glbhizmhrwqomcrxsflb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsYmhpem1ocndxb21jcnhzZmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzI1ODQsImV4cCI6MjA4NzAwODU4NH0.ZyswE5tt3lFaXgfKDABI25q8u3RNBKGKWJBAilQqvvY';
const SUPABASE_REST_HEADERS = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json"
};
const PGBC_AI_BACKEND_PROD_BASE = 'https://resilience360-backend.onrender.com';

let supabaseClientInstance = null;

function isSupabaseConfigured() {
    return (
        typeof SUPABASE_URL === 'string' &&
        typeof SUPABASE_ANON_KEY === 'string' &&
        SUPABASE_URL.startsWith('https://') &&
        !SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
        SUPABASE_ANON_KEY.length > 20 &&
        !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')
    );
}

function getSupabaseClient() {
    if (!isSupabaseConfigured()) return null;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') return null;
    if (!supabaseClientInstance) {
        supabaseClientInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClientInstance;
}

function getRecoveryEmailConfig() {
    const serviceId = DEFAULT_RECOVERY_EMAILJS_CONFIG.serviceId.trim();
    const templateId = DEFAULT_RECOVERY_EMAILJS_CONFIG.templateId.trim();
    const publicKey = DEFAULT_RECOVERY_EMAILJS_CONFIG.publicKey.trim();
    const fromName = DEFAULT_RECOVERY_EMAILJS_CONFIG.fromName.trim();

    return {
        serviceId,
        templateId,
        publicKey,
        fromName
    };
}

function getMissingRecoveryConfigFields(config) {
    const missing = [];
    if (!config.serviceId) missing.push("Service ID");
    if (!config.templateId) missing.push("Template ID");
    if (!config.publicKey) missing.push("Public Key");
    return missing;
}

async function sendRecoveryEmailViaApi(user) {
    const config = getRecoveryEmailConfig();
    const missing = getMissingRecoveryConfigFields(config);

    if (missing.length > 0) {
        return { ok: false, reason: "missing-config", missing };
    }

        const payload = {
        service_id: config.serviceId,
        template_id: config.templateId,
        user_id: config.publicKey,
        template_params: {
            to_email: user.email,
            email: user.email,
            user_email: user.email,
            to_name: user.name || user.username,
            role: user.role,
            username: user.username,
            password: user.password,
            cnic: user.cnic || '',
            from_name: config.fromName,
            from: config.fromName,
            portal_name: "Pakistan Green Building Codes Portal",
            reply_to: user.email,
            message: `Role: ${user.role} | Username: ${user.username} | Password: ${user.password}`
        }
    };

    const fallbackPayload = {
        service_id: config.serviceId,
        template_id: config.templateId,
        user_id: config.publicKey,
        template_params: {
            to_email: user.email,
            to_name: user.name || user.username,
            from_name: config.fromName,
            message: `Role: ${user.role}\nUsername: ${user.username}\nPassword: ${user.password}`
        }
    };

    const trySend = async (bodyPayload) => {
        const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(bodyPayload)
        });

        if (response.ok) {
            return { ok: true };
        }

        const responseText = await response.text();
        return { ok: false, reason: `api-failed:${response.status}`, details: responseText };
    };

    try {
        const primary = await trySend(payload);
        if (primary.ok) {
            return primary;
        }

        const fallback = await trySend(fallbackPayload);
        if (fallback.ok) {
            return fallback;
        }

        return fallback;
    } catch (error) {
        return { ok: false, reason: "network-error", details: String(error?.message || error) };
    }
}

async function findProfileByUsernameOrEmail(supabaseClient, identifier, role) {
    const input = String(identifier || '').trim();
    const isEmailInput = input.includes('@');

    let query = supabaseClient
        .from('portal_profiles')
        .select('id, username, role, name, email, cnic, pec, password')
        .eq('role', role)
        .limit(1);

    query = isEmailInput ? query.eq('email', input) : query.eq('username', input);

    const { data, error } = await query.maybeSingle();
    if (error) {
        throw new Error(`Profile lookup failed: ${error.message}`);
    }

    return data || null;
}

(function enforceHomeFirstEntry() {
    const path = (window.location.pathname || '').toLowerCase();
    const pageName = path.split('/').pop() || 'index.html';
    const hasVisitedHome = sessionStorage.getItem('homeVisited') === '1';

    if (pageName === 'index.html' || pageName === '') {
        sessionStorage.setItem('homeVisited', '1');
        return;
    }

    if (!hasVisitedHome) {
        window.location.href = 'index.html';
    }
})();

// Search codes library from home page
async function searchLibrary() {
    const searchTerm = document.getElementById('librarySearch')?.value || '';
    const normalizedTerm = searchTerm.trim();

    if (!normalizedTerm) {
        alert('Please enter a search term');
        return;
    }

    const user = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!user) {
        showSection('login');
        alert('Please login first to search and open a code section.');
        return;
    }

    const availableCodes = [];
    predefinedCodes.forEach((code, index) => {
        if (deletedPredefinedCodes.includes(index)) return;
        availableCodes.push({
            source: 'predefined',
            index,
            name: code.name,
            pdfPath: code.pdfPath || code.pdf
        });
    });

    codes.forEach((code, index) => {
        availableCodes.push({
            source: 'uploaded',
            index,
            name: code.name,
            pdfPath: code.pdfPath || code.pdf
        });
    });

    const term = normalizeSearchText(normalizedTerm);
    const numberTokenMatch = normalizedTerm.match(/\b\d+(?:\.\d+)+\b/);
    const detectedSectionCode = numberTokenMatch ? numberTokenMatch[0] : '';

    const scoreTextMatch = (text) => {
        const normalizedText = normalizeSearchText(text || '');
        if (!normalizedText) return 0;
        if (normalizedText === term) return 200;
        if (normalizedText.startsWith(term)) return 130;
        if (normalizedText.includes(term)) return 80;
        return 0;
    };

    let bestMatch = null;

    for (const code of availableCodes) {
        const codeScore = scoreTextMatch(code.name) + 40;
        if (!bestMatch || codeScore > bestMatch.score) {
            bestMatch = {
                score: codeScore,
                code,
                chapterNumber: null,
                sectionCode: '',
                sectionTitle: ''
            };
        }

        let chapters = [];
        try {
            chapters = await getViewerChapters(code.name);
        } catch (_) {
            chapters = [];
        }

        chapters.forEach(chapter => {
            const chapterLabel = `Chapter ${chapter.number} ${chapter.title}`;
            const chapterScore = scoreTextMatch(chapterLabel) + 70;
            if (!bestMatch || chapterScore > bestMatch.score) {
                bestMatch = {
                    score: chapterScore,
                    code,
                    chapterNumber: chapter.number,
                    sectionCode: '',
                    sectionTitle: ''
                };
            }

            (chapter.sections || []).forEach(section => {
                const sectionLabel = `${section.code || ''} ${section.title || ''}`.trim();
                let sectionScore = scoreTextMatch(sectionLabel) + 90;

                if (detectedSectionCode && section.code && normalizeSearchText(section.code) === normalizeSearchText(detectedSectionCode)) {
                    sectionScore += 120;
                }

                if (!bestMatch || sectionScore > bestMatch.score) {
                    bestMatch = {
                        score: sectionScore,
                        code,
                        chapterNumber: chapter.number,
                        sectionCode: section.code || '',
                        sectionTitle: section.title || ''
                    };
                }
            });
        });
    }

    if (!bestMatch || bestMatch.score <= 0) {
        alert('No matching code, chapter, or section found.');
        goToLibrary();
        return;
    }

    sessionStorage.setItem('selectedCodeViewer', JSON.stringify({
        source: bestMatch.code.source,
        index: bestMatch.code.index,
        name: bestMatch.code.name,
        pdfPath: bestMatch.code.pdfPath
    }));

    const matchedChapterLabel = bestMatch.chapterNumber !== null && bestMatch.chapterNumber !== undefined
        ? `chapter ${bestMatch.chapterNumber}`
        : '';
    const matchedSectionLabel = `${bestMatch.sectionCode || ''} ${bestMatch.sectionTitle || ''}`.trim();

    const isExactMatch = [
        normalizeSearchText(bestMatch.code.name),
        normalizeSearchText(matchedChapterLabel),
        normalizeSearchText(matchedSectionLabel),
        normalizeSearchText(bestMatch.sectionCode),
        normalizeSearchText(bestMatch.sectionTitle)
    ].some(value => value && value === term);

    sessionStorage.setItem('viewerSearchTarget', JSON.stringify({
        term: normalizedTerm,
        chapterNumber: bestMatch.chapterNumber,
        sectionCode: bestMatch.sectionCode,
        sectionTitle: bestMatch.sectionTitle,
        exactMatch: isExactMatch,
        notice: isExactMatch ? '' : `No exact match for "${normalizedTerm}". Showing the closest result.`
    }));

    window.location.href = 'code-viewer.html';
}

function clearViewerSearchTarget() {
    sessionStorage.removeItem('viewerSearchTarget');
}

function applyViewerSearchTarget(target) {
    if (!target) return null;

    const normalizedTerm = normalizeSearchText(target.term || '');
    let matchedChapter = null;

    if (target.chapterNumber !== undefined && target.chapterNumber !== null) {
        matchedChapter = viewerUiState.chapters.find(chapter => String(chapter.number) === String(target.chapterNumber));
        if (matchedChapter) {
            viewerUiState.expandedChapters.add(matchedChapter.key);
        }
    }

    let selectedNode = null;
    let bestNodeScore = -1;

    Object.values(viewerUiState.nodeIndex).forEach(node => {
        let score = 0;
        const nodeCode = normalizeSearchText(node.code || '');
        const nodeTitle = normalizeSearchText(node.title || '');
        const nodeChapter = normalizeSearchText(node.chapterTitle || '');
        const combined = `${nodeCode} ${nodeTitle} ${nodeChapter}`.trim();

        if (target.chapterNumber !== undefined && target.chapterNumber !== null && String(node.chapterNumber) === String(target.chapterNumber)) {
            score += 20;
        }

        if (target.sectionCode) {
            const targetCode = normalizeSearchText(target.sectionCode);
            if (nodeCode === targetCode) score += 120;
            else if (nodeCode.includes(targetCode)) score += 60;
        }

        if (target.sectionTitle) {
            const targetTitle = normalizeSearchText(target.sectionTitle);
            if (nodeTitle === targetTitle) score += 90;
            else if (nodeTitle.includes(targetTitle)) score += 50;
        }

        if (normalizedTerm) {
            if (combined === normalizedTerm) score += 80;
            else if (combined.includes(normalizedTerm)) score += 40;
        }

        if (score > bestNodeScore) {
            bestNodeScore = score;
            selectedNode = node;
        }
    });

    if (!selectedNode || bestNodeScore <= 0) {
        return null;
    }

    viewerUiState.selectedNodeKey = selectedNode.key;

    let parentKey = selectedNode.parentKey;
    while (parentKey) {
        viewerUiState.expandedNodes.add(parentKey);
        const parentNode = viewerUiState.nodeIndex[parentKey];
        parentKey = parentNode?.parentKey;
    }

    if (matchedChapter) {
        viewerUiState.expandedChapters.add(matchedChapter.key);
    }

    return selectedNode.key;
}

// Predefined codes with their chapters/clauses
const predefinedCodes = [
    {
        name: "Building Code of Pakistan 2021",
        pdfPath: "All Codes/Building Code of Pakistan 2021/Building Code of Pakistan 2021.pdf",
        chapters: [
            "Chapter 1: Administration",
            "Chapter 2: Definitions",
            "Chapter 3: Use and Occupancy Classification",
            "Chapter 4: Special Detailed Requirements Based on Use and Occupancy",
            "Chapter 5: General Building Heights and Areas",
            "Chapter 6: Types of Construction",
            "Chapter 7: Fire and Smoke Protection Features",
            "Chapter 8: Interior Finishes",
            "Chapter 9: Fire Protection Systems",
            "Chapter 10: Means of Egress",
            "Chapter 11: Accessibility",
            "Chapter 12: Interior Environment",
            "Chapter 13: Energy Efficiency",
            "Chapter 14: Exterior Walls",
            "Chapter 15: Roof Assemblies and Rooftop Structures",
            "Chapter 16: Structural Design",
            "Chapter 17: Structural Tests and Special Inspections",
            "Chapter 18: Soils and Foundations",
            "Chapter 19: Concrete",
            "Chapter 20: Aluminum",
            "Chapter 21: Masonry",
            "Chapter 22: Steel",
            "Chapter 23: Wood",
            "Chapter 24: Glass and Glazing",
            "Chapter 25: Gypsum Board and Plaster",
            "Chapter 26: Plastic",
            "Chapter 27: Electrical",
            "Chapter 28: Mechanical Systems",
            "Chapter 29: Plumbing Systems",
            "Chapter 30: Elevators and Conveying Systems",
            "Chapter 31: Special Construction",
            "Chapter 32: Encroachment into Public Right-of-Way",
            "Chapter 33: Safeguards During Construction",
            "Chapter 34: Existing Buildings",
            "Chapter 35: Referenced Standards"
        ]
    },
    {
        name: "Green Building Code of Pakistan 2023",
        pdfPath: "All Codes/Green Building Code of Pakistan 2023/Green Building Code of Pakistan 2023.pdf",
        chapters: [
            "Chapter 1: Scope and Administration",
            "Chapter 2: Definitions",
            "Chapter 3: Climate Zones",
            "Chapter 4: Site Selection and Planning",
            "Chapter 5: Water Efficiency",
            "Chapter 6: Energy Efficiency",
            "Chapter 7: Building Materials",
            "Chapter 8: Indoor Environmental Quality",
            "Chapter 9: Waste Management",
            "Chapter 10: Innovation in Design",
            "Chapter 11: Rating and Certification"
        ]
    },
    {
        name: "Building Code of Pakistan 2007",
        pdfPath: "All Codes/Building Code of Pakistan 2007/Building Code of Pakistan 2007.pdf",
        explanationFolder: "All Codes/Building Code of Pakistan 2007",
        chapters: [
            {
                title: "Chapter 1: Scope",
                sections: [
                    { title: "1.1 Objective and General Principles", content: "Define the overall objectives and general principles that govern the application of the Building Code of Pakistan 2007." },
                    { title: "1.2 Scope", sections: [
                        { title: "1.2.1", content: "Applicability to buildings and structures." },
                        { title: "1.2.2", content: "Specific scope definitions." },
                        { title: "1.2.3", content: "Exemptions and exceptions." },
                        { title: "1.2.4", content: "Referenced standards." }
                    ]}
                ]
            },
            {
                title: "Chapter 2: Seismic Hazard",
                sections: [
                    { title: "2.1 Scope", content: "Define seismic hazard scope and application." },
                    { title: "2.2 Design Basis Ground Motion", content: "Parameters and criteria for design basis ground motion." },
                    { title: "2.3 Seismic Zones", content: "Classification and characteristics of seismic zones in Pakistan." },
                    { title: "2.4 Site-specific Hazard Analysis", content: "Requirements for site-specific seismic hazard analysis." },
                    { title: "2.5 Modeling of Ground Motion", content: "Ground motion modeling techniques and specifications." }
                ]
            },
            {
                title: "Chapter 3: Site Considerations",
                sections: [
                    { title: "3.1 Scope", content: "Scope of site considerations requirements." },
                    { title: "3.2 Potential Fault Rupture Hazard", content: "Assessment and mitigation of fault rupture hazards." },
                    { title: "3.3 Potential Liquefaction", content: "Liquefaction potential evaluation and design requirements." },
                    { title: "3.4 Potential Landslide and Slope Instability", content: "Landslide and slope stability assessment methods." },
                    { title: "3.5 Sensitive Clays", content: "Special considerations for sensitive clay soils." }
                ]
            },
            {
                title: "Chapter 4: Soils and Foundations",
                sections: [
                    { title: "4.1 Symbols and Notations", content: "Standard symbols and notations used in soil and foundation design." },
                    { title: "4.2 Scope", content: "Scope of soils and foundations chapter." },
                    { title: "4.3 Determination of Soil Conditions", sections: [
                        { title: "4.3.1 Site Geology and Soil Characteristics", content: "Methods for determining site geology and soil characteristics." }
                    ]},
                    { title: "4.4 Soil Profile Types", sections: [
                        { title: "4.4.1 Scope", content: "Scope of soil profile classification." },
                        { title: "4.4.2 Definitions", sections: [
                            { title: "4.4.2.1 vs method", content: "Shear wave velocity method for soil profiling." },
                            { title: "4.4.2.2 N method", content: "Standard penetration test (N-value) method." },
                            { title: "4.4.2.3 su method", content: "Undrained shear strength method." },
                            { title: "4.4.2.4 Soft clay profile, SE", content: "Soft clay soil profile classification." },
                            { title: "4.4.2.5 Soil profiles SC, SD and SE", content: "Classification of soil profiles SC, SD, and SE." },
                            { title: "4.4.2.6 Rock profiles, SA and SB", content: "Rock and stiff soil profile classifications." }
                        ]}
                    ]},
                    { title: "4.5 Foundations Construction in Seismic Zones 3 and 4", sections: [
                        { title: "4.5.1 General", content: "General requirements for foundation construction in high seismic zones." },
                        { title: "4.5.2 Soil Capacity", content: "Soil bearing capacity requirements." },
                        { title: "4.5.3 Superstructure-to-Foundation Connection", content: "Connection design between superstructure and foundation." },
                        { title: "4.5.4 Foundation-Soil Interface", content: "Requirements at foundation-soil interface." },
                        { title: "4.5.5 Special Requirements for Piles and Caissons", sections: [
                            { title: "4.5.5.1 General", content: "General pile and caisson requirements." },
                            { title: "4.5.5.2 Nonprestressed concrete piles and prestressed concrete piles", sections: [
                                { title: "4.5.5.2.1 Nonprestressed concrete piles", content: "Design and construction of nonprestressed concrete piles." },
                                { title: "4.5.5.2.2 Prestressed concrete piles", content: "Design and construction of prestressed concrete piles." }
                            ]}
                        ]}
                    ]}
                ]
            },
            {
                title: "Chapter 5: Structural Design Requirements",
                sections: [
                    {
                        title: "Division I — General Design Requirements",
                        sections: [
                            { title: "5.1 Symbols and Notations", content: "Standard symbols and notations for structural design." },
                            { title: "5.2 Scope", content: "Scope of general design requirements." },
                            { title: "5.3 Definitions", content: "Definitions used in structural design." },
                            { title: "5.4 Standards", content: "Referenced design standards." },
                            { title: "5.5 Design", sections: [
                                { title: "5.5.1 General", content: "General design principles." },
                                { title: "5.5.2 Rationality", content: "Rationality requirements in design." },
                                { title: "5.5.3 Erection of Structural Framing", content: "Requirements for erection of structural framing." }
                            ]},
                            { title: "5.6 Dead Loads", sections: [
                                { title: "5.6.1 General", content: "General dead load requirements." },
                                { title: "5.6.2 Partition Loads", content: "Partition load calculations and application." }
                            ]},
                            { title: "5.7 Live Loads", sections: [
                                { title: "5.7.1 General", content: "General live load principles." },
                                { title: "5.7.2 Critical Distribution of Live Loads", content: "Critical load distribution patterns." },
                                { title: "5.7.3 Floor Live Loads", content: "Specified floor live loads by occupancy." },
                                { title: "5.7.4 Roof Live Loads", content: "Roof live load requirements." },
                                { title: "5.7.5 Reduction of Live Loads", content: "Methods for reducing live loads." },
                                { title: "5.7.6 Alternate Floor Live Load Reduction", content: "Alternative reduction formulas." }
                            ]},
                            { title: "5.8 Snow Loads", content: "Snow load determination and application." },
                            { title: "5.9 Wind Loads", content: "Wind load calculations." },
                            { title: "5.10 Earthquake Loads", content: "Earthquake load determination." },
                            { title: "5.11 Other Minimum Loads", sections: [
                                { title: "5.11.1 General", content: "General other loads." },
                                { title: "5.11.2 Other Loads", content: "Additional load types." },
                                { title: "5.11.3 Impact Loads", content: "Impact load requirements." },
                                { title: "5.11.4 Anchorage of Concrete and Masonry Walls", content: "Wall anchorage requirements." },
                                { title: "5.11.5 Interior Wall Loads", content: "Interior wall load calculations." },
                                { title: "5.11.6 Retaining Walls", content: "Retaining wall load requirements." },
                                { title: "5.11.7 Water Accumulation", content: "Water accumulation load considerations." },
                                { title: "5.11.8 Hydrostatic Uplift", content: "Hydrostatic uplift load calculations." },
                                { title: "5.11.9 Flood-resistant Construction", content: "Flood load requirements." },
                                { title: "5.11.10 Heliport and Helistop Landing Areas", content: "Special loads for heliports." },
                                { title: "5.11.11 Prefabricated Construction", content: "Loads for prefabricated elements." }
                            ]},
                            { title: "5.12 Combinations of Loads", sections: [
                                { title: "5.12.1 General", content: "General load combination principles." },
                                { title: "5.12.2 Load Combinations Using Strength Design or LRFD", content: "LRFD load combinations." },
                                { title: "5.12.3 Load Combinations Using Allowable Stress Design", content: "ASD load combinations." },
                                { title: "5.12.4 Special Seismic Load Combinations", content: "Seismic-specific load combinations." }
                            ]},
                            { title: "5.13 Deflection", content: "Deflection limits and calculations." }
                        ]
                    },
                    {
                        title: "Division II — Snow Loads",
                        sections: [
                            { title: "5.14 Snow Loads", content: "Comprehensive snow load requirements." }
                        ]
                    },
                    {
                        title: "Division III — Wind Design",
                        sections: [
                            { title: "5.15 Symbols and Notations", content: "Wind design symbols and notations." },
                            { title: "5.16 General", content: "General wind design principles." },
                            { title: "5.17 Definitions", content: "Wind design definitions." },
                            { title: "5.18 Basic Wind Speed", content: "Determination of basic wind speed." },
                            { title: "5.19 Exposure", content: "Exposure categories and terrain definitions." },
                            { title: "5.20 Design Wind Pressures", content: "Wind pressure calculations." },
                            { title: "5.21 Primary Frames and Systems", sections: [
                                { title: "5.21.1 General", content: "General requirements for primary frames." },
                                { title: "5.21.2 Method 1 (Normal Force Method)", content: "Normal force method calculations." },
                                { title: "5.21.3 Method 2 (Projected Area Method)", content: "Projected area method calculations." }
                            ]},
                            { title: "5.22 Elements and Components of Structures", content: "Wind loads on elements and components." },
                            { title: "5.23 Open Frame Towers", content: "Wind design for open frame towers." },
                            { title: "5.24 Miscellaneous Structures", content: "Wind loads on miscellaneous structures." },
                            { title: "5.25 Occupancy Categories", content: "Occupancy categories for wind design." }
                        ]
                    },
                    {
                        title: "Division IV — Earthquake Design",
                        sections: [
                            { title: "5.26 Symbols and Notations", content: "Seismic design symbols and notations." },
                            { title: "5.27 General", sections: [
                                { title: "5.27.1 Purpose", content: "Purpose of seismic design requirements." },
                                { title: "5.27.2 Minimum Seismic Design", content: "Minimum design earthquake requirements." },
                                { title: "5.27.3 Seismic and Wind Design", content: "Combined seismic and wind design." }
                            ]},
                            { title: "5.28 Definitions", content: "Seismic design definitions." },
                            { title: "5.29 Criteria Selection", sections: [
                                { title: "5.29.1 Basis for Design", content: "Design basis for seismic loads." },
                                { title: "5.29.2 Occupancy Categories", content: "Occupancy categories for seismic design." },
                                { title: "5.29.3 Site Geology and Soil Characteristics", content: "Site classification criteria." },
                                { title: "5.29.4 Site Seismic Hazard Characteristics", content: "Maximum considered earthquake (MCE) parameters." },
                                { title: "5.29.5 Configuration Requirements", content: "Structural configuration requirements." },
                                { title: "5.29.6 Structural Systems", content: "Seismic force-resisting systems." },
                                { title: "5.29.7 Height Limits", content: "Height limitations by system." },
                                { title: "5.29.8 Selection of Lateral-force Procedure", content: "Choice of analysis procedure." },
                                { title: "5.29.9 System Limitations", content: "System limitations and restrictions." },
                                { title: "5.29.10 Alternative Procedures", content: "Alternative design procedures." }
                            ]},
                            { title: "5.30 Minimum Design Lateral Forces and Related Effects", sections: [
                                { title: "5.30.1 Earthquake Loads and Modeling Requirements", content: "Earthquake load modeling." },
                                { title: "5.30.2 Static Force Procedure", content: "Simplified static procedure." },
                                { title: "5.30.3 Determination of Seismic Factors", content: "Seismic factors calculation." },
                                { title: "5.30.4 Combinations of Structural Systems", content: "Combined systems requirements." },
                                { title: "5.30.5 Vertical Distribution of Force", content: "Force distribution with height." },
                                { title: "5.30.6 Horizontal Distribution of Shear", content: "Horizontal shear distribution." },
                                { title: "5.30.7 Horizontal Torsional Moments", content: "Torsional moment effects." },
                                { title: "5.30.8 Overturning", content: "Overturning moment calculations." },
                                { title: "5.30.9 Drift", content: "Drift determination." },
                                { title: "5.30.10 Storey Drift Limitation", content: "Story drift limits." },
                                { title: "5.30.11 Vertical Component", content: "Vertical earthquake component." }
                            ]},
                            { title: "5.31 Dynamic Analysis Procedures", sections: [
                                { title: "5.31.1 General", content: "General dynamic analysis requirements." },
                                { title: "5.31.2 Ground Motion", content: "Ground motion input requirements." },
                                { title: "5.31.3 Mathematical Model", content: "Mathematical modeling requirements." },
                                { title: "5.31.4 Description of Analysis Procedures", content: "Analysis procedure descriptions." },
                                { title: "5.31.5 Response Spectrum Analysis", content: "Response spectrum analysis method." },
                                { title: "5.31.6 Time-history Analysis", content: "Time-history analysis method." }
                            ]},
                            { title: "5.32 Lateral Force on Elements", sections: [
                                { title: "5.32.1 General", content: "General element force requirements." },
                                { title: "5.32.2 Design for Total Lateral Force", content: "Total lateral force design." },
                                { title: "5.32.3 Specifying Lateral Forces", content: "Lateral force specifications." },
                                { title: "5.32.4 Relative Motion of Equipment Attachments", content: "Equipment motion considerations." },
                                { title: "5.32.5 Alternative Designs", content: "Alternative design methods." }
                            ]},
                            { title: "5.33 Detailed Systems Design Requirements", sections: [
                                { title: "5.33.1 General", content: "General system design requirements." },
                                { title: "5.33.2 Structural Framing Systems", content: "Framing system requirements." }
                            ]},
                            { title: "5.34 Nonbuilding Structures", sections: [
                                { title: "5.34.1 General", content: "General nonbuilding structure requirements." },
                                { title: "5.34.2 Lateral Force", content: "Lateral forces on nonbuilding structures." },
                                { title: "5.34.3 Rigid Structures", content: "Design of rigid structures." },
                                { title: "5.34.4 Tanks with Supported Bottoms", content: "Tank design requirements." },
                                { title: "5.34.5 Other Nonbuilding Structures", content: "Other nonbuilding structure types." }
                            ]},
                            { title: "5.35 Earthquake-Recording Instrumentations", sections: [
                                { title: "5.35.1 General", content: "General instrumentation requirements." },
                                { title: "5.35.2 Location", content: "Instrumentation location criteria." },
                                { title: "5.35.3 Maintenance", content: "Maintenance of instruments." },
                                { title: "5.35.4 Instrumentation of Existing Buildings", content: "Retrofit instrumentation requirements." }
                            ]}
                        ]
                    }
                ]
            },
            {
                title: "Chapter 6: Structural Tests and Inspections",
                sections: [
                    { title: "6.1 Scope", content: "Scope of structural testing and inspection requirements." },
                    { title: "6.2 Responsibility", content: "Responsibility for tests and inspections." },
                    { title: "6.3 Special Inspections", content: "Special inspection requirements." },
                    { title: "6.4 Material and Product Testing", sections: [
                        { title: "6.4.1 General", content: "General material testing requirements." },
                        { title: "6.4.2 Concrete Testing", content: "Concrete strength testing procedures." },
                        { title: "6.4.3 Steel Testing", content: "Structural steel testing requirements." },
                        { title: "6.4.4 Masonry Testing", content: "Masonry unit and mortar testing." },
                        { title: "6.4.5 Wood Testing", content: "Wood material testing requirements." },
                        { title: "6.4.6 Other Materials", content: "Testing of other structural materials." }
                    ]}
                ]
            },
            {
                title: "Chapter 7: Structural Concrete",
                sections: [
                    { title: "7.1 Scope", content: "Scope of structural concrete provisions." },
                    { title: "7.2 Materials", content: "Concrete materials specifications." },
                    { title: "7.3 Concrete Strength", content: "Concrete strength requirements and testing." },
                    { title: "7.4 Flexural and Axial Loads", content: "Design for flexure and axial loads." },
                    { title: "7.5 Shear and Torsion", content: "Design for shear and torsion." },
                    { title: "7.6 Development, Splice and Mechanical Connections of Reinforcement", content: "Reinforcement development and splicing." },
                    { title: "7.7 Detailing Preferences", content: "Reinforcement detailing standards." },
                    { title: "7.8 Analysis and Design for Earthquake Forces", content: "Seismic design of concrete structures." },
                    { title: "7.9 Serviceability", content: "Serviceability requirements for concrete." },
                    { title: "7.10 Minimum Reinforcement", content: "Minimum reinforcement requirements." },
                    { title: "7.11 Special Provisions for Seismic Design", content: "Seismic-specific concrete provisions." },
                    { title: "7.12 Bearing Walls", content: "Design of concrete bearing walls." },
                    { title: "7.13 Precast Concrete", content: "Precast concrete structural elements." },
                    { title: "7.14 Concrete Quality", content: "Quality assurance for concrete." }
                ]
            },
            {
                title: "Chapter 8: Structural Steel",
                sections: [
                    { title: "8.1 Scope", content: "Scope of structural steel provisions." },
                    { title: "8.2 Materials", content: "Steel material specifications." },
                    { title: "8.3 Design", content: "Steel structural design principles." },
                    { title: "Sections 8.4-8.37", content: "Comprehensive steel design provisions including connections, bolting, welding, plate girders, composite construction, and seismic requirements." }
                ]
            },
            {
                title: "Chapter 9: Masonry",
                sections: [
                    { title: "9.1 Scope", content: "Scope of masonry provisions." },
                    { title: "9.2 Materials", content: "Masonry materials and unit specifications." },
                    { title: "9.3 Construction", content: "Masonry construction requirements." },
                    { title: "9.4 Design", content: "Masonry structural design." },
                    { title: "9.5 Reinforced Masonry", content: "Design of reinforced masonry." },
                    { title: "9.6 Masonry Veneer", content: "Veneer masonry requirements." },
                    { title: "9.7 Quality Requirements", content: "Quality assurance for masonry." },
                    { title: "9.8 Seismic Design", content: "Masonry seismic provisions." },
                    { title: "9.9 Masonry Infill Walls", content: "Design and detailing of masonry infill walls." }
                ]
            },
            {
                title: "Chapter 10: Architectural Elements",
                sections: [
                    { title: "10.1 Scope", content: "Scope of architectural element requirements." },
                    { title: "10.2 Exterior Elements", content: "Exterior element design and detailing." },
                    { title: "10.3 Interior Elements", content: "Interior architectural elements." },
                    { title: "10.4 Connections and Fasteners", sections: [
                        { title: "10.4.1 General Provisions", content: "General connection requirements." },
                        { title: "10.4.2 Seismic Requirements", content: "Connection seismic provisions." }
                    ]}
                ]
            },
            {
                title: "Chapter 11: Mechanical & Electrical Systems",
                sections: [
                    { title: "11.1 Mechanical Systems", content: "Design of mechanical building systems." },
                    { title: "11.2 Electrical Systems", content: "Electrical system design requirements." },
                    { title: "11.3 System Coordination", content: "Coordination with structural system." }
                ]
            },
            {
                title: "Appendix A: Background for Seismic Zoning Map",
                sections: [
                    { title: "A.1 Seismic Zoning Philosophy", content: "Background and philosophy of seismic zonation." },
                    { title: "A.2 Zoning Map Development", content: "Development methodology for seismic zone map." },
                    { title: "A.3 Zone Characteristics", sections: [
                        { title: "A.3.1 Zone 1", content: "Zone 1 characteristics and requirements." },
                        { title: "A.3.2 Zone 2", content: "Zone 2 characteristics and requirements." },
                        { title: "A.3.3 Zone 3", content: "Zone 3 characteristics and requirements." },
                        { title: "A.3.4 Zone 4", content: "Zone 4 characteristics and requirements." },
                        { title: "A.3.5 Zone 5", content: "Zone 5 characteristics and requirements." },
                        { title: "A.3.6 Zone Mapping", content: "Zoning map and application guidelines." }
                    ]}
                ]
            }
        ]
    },
    {
        name: "BCP Energy Provisions 2011",
        pdfPath: "All Codes/BCP-Energy-Provisions-2011/BCP-Energy-Provisions-2011.pdf",
        chapters: [
            "Section 1: General Provisions",
            "Section 2: Building Envelope Requirements",
            "Section 3: HVAC Systems",
            "Section 4: Service Water Heating",
            "Section 5: Electrical Power and Lighting Systems",
            "Section 6: Energy Compliance Documentation"
        ]
    },
    {
        name: "Building Code of Pakistan - Fire Safety Provisions 2016",
        pdfPath: "All Codes/Building-Code-of-Pakistan-Fire-Safety-Provisions-2016/Building-Code-of-Pakistan-Fire-Safety-Provisions-2016.pdf",
        chapters: [
            "Chapter 1: Scope and Objectives",
            "Chapter 2: Fire Safety Definitions",
            "Chapter 3: Fire-Resistance-Rated Construction",
            "Chapter 4: Fire Protection Systems",
            "Chapter 5: Means of Egress",
            "Chapter 6: Emergency Procedures",
            "Chapter 7: Inspection and Maintenance"
        ]
    },
    {
        name: "Energy Conservation Building Code 2023 (ECBC)",
        pdfPath: "All Codes/ecbc23/ecbc23.pdf",
        chapters: [
            "Section 1: General",
            "Section 2: Building Envelope",
            "Section 3: Heating, Ventilating and Air Conditioning",
            "Section 4: Service Water Heating",
            "Section 5: Electrical Power and Lighting",
            "Section 6: Building Energy Performance",
            "Section 7: Compliance Documentation"
        ]
    },
    {
        name: "Pakistan Electric Telecommunication Safety Code (PETSAC) 2014",
        pdfPath: "All Codes/Pakistan-Electric-Telecommunication-Safety-Code-PETSAC-2014/Pakistan-Electric-Telecommunication-Safety-Code-PETSAC-2014.pdf",
        chapters: [
            "Part 1: General Requirements",
            "Part 2: Installation of Electrical Systems",
            "Part 3: Protection from Electric Shock",
            "Part 4: Telecommunication Systems",
            "Part 5: Safety Practices",
            "Part 6: Inspection and Testing"
        ]
    },
    {
        name: "Standardization of Building Codes for Low Cost Affordable Units 2021",
        pdfPath: "All Codes/standardization-of-building-codes-standards-and-specifications-for-low-cost-affordable-units-2021/standardization-of-building-codes-standards-and-specifications-for-low-cost-affordable-units-2021.pdf",
        chapters: [
            "Section 1: Introduction and Scope",
            "Section 2: General Requirements for Low Cost Housing",
            "Section 3: Minimum Space Standards",
            "Section 4: Structural Requirements",
            "Section 5: Building Materials and Standards",
            "Section 6: Services and Utilities",
            "Section 7: Quality Control"
        ]
    }
];

// Remove chapter data from all predefined codes
predefinedCodes.forEach(code => {
    code.chapters = [];
});

// Remove chapter data from all previously uploaded codes
codes = codes.map(code => ({ ...code, chapters: [] }));
localStorage.setItem("codes", JSON.stringify(codes));

let users = JSON.parse(localStorage.getItem("users")) || [];

function showSection(id) {
    // Hide all sections
    document.querySelectorAll("section").forEach(sec => {
        sec.classList.remove("active");
        sec.classList.add("hidden");
    });
    
    // Show the selected section
    let targetSection = document.getElementById(id);
    if (targetSection) {
        targetSection.classList.remove("hidden");
        targetSection.classList.add("active");
    }

    updateActiveNav(id);
    
    // Scroll to top
    window.scrollTo(0, 0);
}

function updateActiveNav(sectionId) {
    document.querySelectorAll('.portal-nav button').forEach(btn => btn.classList.remove('active-tab'));

    const navMap = {
        home: 'homeBtn',
        signup: 'signupBtn',
        login: 'loginBtn',
        adminLogin: 'adminLoginBtn'
    };

    const targetButtonId = navMap[sectionId];
    if (targetButtonId) {
        const targetButton = document.getElementById(targetButtonId);
        if (targetButton && !targetButton.classList.contains('hidden')) {
            targetButton.classList.add('active-tab');
        }
    }
}

function toggleLoginPassword() {
    const passwordInput = document.getElementById('loginPassword');
    if (!passwordInput) return;

    passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
}

function updateNavButtons() {
    let user = JSON.parse(sessionStorage.getItem('currentUser'));
    let signupBtn = document.getElementById('signupBtn');
    let loginBtn = document.getElementById('loginBtn');
    let adminLoginBtn = document.getElementById('adminLoginBtn');
    let logoutBtn = document.getElementById('logoutBtn');
    
    if (user) {
        // User is logged in
        if (signupBtn) signupBtn.classList.add('hidden');
        if (loginBtn) loginBtn.classList.add('hidden');
        if (adminLoginBtn) adminLoginBtn.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
    } else {
        // User is not logged in
        if (signupBtn) signupBtn.classList.remove('hidden');
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (adminLoginBtn) adminLoginBtn.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
    }
}

function updateSignupForm() {
    let role = document.getElementById("signupRole").value;
    let fields = document.getElementById("signupFields");
    fields.innerHTML = "";

    if (role === "Public") {
        fields.innerHTML = `
            <input type="text" id="signupName" placeholder="Full Name" required>
            <input type="text" id="signupCnic" placeholder="CNIC (e.g., 12345-1234567-1)" required>
            <input type="email" id="signupEmail" placeholder="Email" required>
            <input type="text" id="signupUsername" placeholder="Username" required>
            <input type="password" id="signupPassword" placeholder="Password" required>
        `;
    }

    if (role === "Engineer") {
        fields.innerHTML = `
            <input type="text" id="signupName" placeholder="Full Name" required>
            <input type="email" id="signupEmail" placeholder="Email" required>
            <input type="text" id="signupCnic" placeholder="CNIC (e.g., 12345-1234567-1)" required>
            <input type="text" id="signupPec" placeholder="PEC Registration Number" required>
            <input type="text" id="signupUsername" placeholder="Username" required>
            <input type="password" id="signupPassword" placeholder="Password" required>
        `;
    }
}

async function handleSignup() {
    let role = document.getElementById("signupRole").value;
    let username = document.getElementById("signupUsername")?.value?.trim();
    let password = document.getElementById("signupPassword")?.value;
    let name = document.getElementById("signupName")?.value?.trim();
    let email = document.getElementById("signupEmail")?.value?.trim().toLowerCase();
    let cnic = document.getElementById("signupCnic")?.value?.trim();

    if (!role) {
        alert("Please select a role.");
        return;
    }

    if (!name || !email || !cnic || !username || !password) {
        alert("Please fill all required fields.");
        return;
    }

    // Validate CNIC format: XXXXX-XXXXXXX-X
    let cnicPattern = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnicPattern.test(cnic)) {
        alert("Invalid CNIC format. Please enter CNIC in the correct format: XXXXX-XXXXXXX-X (e.g., 12345-1234567-1)");
        return;
    }

    let newUser = {
        role,
        username,
        password,
        name,
        email,
        cnic
    };

    if (role === "Engineer") {
        let pec = document.getElementById("signupPec")?.value?.trim();
        if (!pec) {
            alert("Please enter your PEC Registration Number.");
            return;
        }
        newUser.pec = pec;
    }

    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
        alert("Cloud authentication is unavailable. Please try again shortly.");
        return;
    }

    try {
        const { data: existingByUsername, error: usernameError } = await supabaseClient
            .from('portal_profiles')
            .select('id')
            .eq('username', username)
            .limit(1)
            .maybeSingle();

        if (usernameError) {
            throw new Error(usernameError.message);
        }

        if (existingByUsername) {
            alert("Username already exists. Please choose a different username.");
            return;
        }

        const { data: existingByEmail, error: emailError } = await supabaseClient
            .from('portal_profiles')
            .select('id')
            .eq('email', email)
            .limit(1)
            .maybeSingle();

        if (emailError) {
            throw new Error(emailError.message);
        }

        if (existingByEmail) {
            alert("Email already exists. Please use a different email.");
            return;
        }

        const { error: insertError } = await supabaseClient
            .from('portal_profiles')
            .insert({
                role,
                username,
                name,
                email,
                cnic,
                pec: newUser.pec || null,
                password
            });

        if (insertError) {
            alert(`Signup failed: ${insertError.message}`);
            return;
        }

        showSection('login');
    } catch (error) {
        alert(`Cloud signup error: ${String(error?.message || error)}`);
    }
}

async function handleLogin() {
    let role = document.getElementById("loginRole").value;
    let username = document.getElementById("loginUsername").value.trim();
    let password = document.getElementById("loginPassword").value;

    if (!role) {
        alert("Please select a role.");
        return;
    }

    if (!username || !password) {
        alert("Please enter username and password.");
        return;
    }

    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
        alert("Cloud authentication is unavailable. Please try again shortly.");
        return;
    }

    try {
        const profile = await findProfileByUsernameOrEmail(supabaseClient, username, role);
        if (!profile) {
            alert("User not found with this role/username.");
            return;
        }

        if (String(profile.password || '') !== password) {
            alert("Invalid credentials. Please check your username, password, and role.");
            return;
        }

        currentUser = { role: profile.role, username: profile.username, name: profile.name };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById("userInfo").innerText = `Logged in as: ${currentUser.role}`;
        updateNavButtons();
        window.location.href = 'library.html';
    } catch (error) {
        alert(`Cloud login error: ${String(error?.message || error)}`);
    }
}

async function handleForgotCredentials() {
    const enteredEmail = prompt("Enter your registered email address:");
    if (!enteredEmail || !enteredEmail.trim()) {
        alert("Registered email is required to recover credentials.");
        return;
    }

    const normalizedEmail = enteredEmail.trim().toLowerCase();

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/portal_profiles?select=id,username,name,cnic,role,email,password&email=ilike.${encodeURIComponent(normalizedEmail)}&limit=1`,
            {
                method: 'GET',
                headers: SUPABASE_REST_HEADERS
            }
        );

        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(`Profile lookup failed (${response.status}): ${responseText}`);
        }

        const rows = await response.json();
        const profile = Array.isArray(rows) ? rows[0] : null;

        if (!profile || !profile.password) {
            alert('No account found with this registered email.');
            return;
        }

        const sendResult = await sendRecoveryEmailViaApi({
            role: profile.role,
            username: profile.username,
            name: profile.name,
            email: profile.email,
            password: profile.password,
            cnic: profile.cnic || ''
        });

        if (sendResult.ok) {
            alert(`Recovery email sent successfully to ${profile.email}.`);
            return;
        }

        const subject = encodeURIComponent("PGBC Portal - Credential Recovery");
        const body = encodeURIComponent(
            `Assalam-o-Alaikum,\n\n` +
            `Your PGBC portal credentials are:\n` +
            `Role: ${profile.role}\n` +
            `Username: ${profile.username}\n` +
            `Password: ${profile.password}\n\n` +
            `Pakistan Green Building Codes Portal`
        );
        window.location.href = `mailto:${encodeURIComponent(profile.email)}?subject=${subject}&body=${body}`;

        if (sendResult.reason === "missing-config") {
            const missingFieldsText = (sendResult.missing || []).join(", ");
            alert(`Recovery email service is not configured. Missing: ${missingFieldsText}. A fallback email draft has been opened.`);
            return;
        }

        if (String(sendResult.details || '').toLowerCase().includes('invalid grant')) {
            alert("Recovery provider authentication expired. A fallback email draft has been opened. Please reconnect Gmail in EmailJS service settings.");
            return;
        }

        alert("Recovery email could not be sent right now. A fallback email draft has been opened.");
    } catch (error) {
        alert(`Recovery failed: ${String(error?.message || error)}`);
    }
}

function handleAdminLogin() {
    let email = document.getElementById("adminEmail").value;
    let password = document.getElementById("adminPassword").value;

    if (!email || !password) {
        alert("Please enter email and password.");
        return;
    }

    // Only allow the specific Gmail address
    if (email === "shanu1998end@gmail.com" && password === "admin123") {
        currentUser = { role: "Authority", username: "Admin", email: email };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById("userInfo").innerText = `Logged in as: Authority`;
        updateNavButtons();
        window.location.href = 'library.html';
    } else {
        alert("Access Denied! Invalid admin credentials or unauthorized email.");
    }
}

function checkLogin() {
    let user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

function goToLibrary() {
    let user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user) {
        showSection('login');
        return;
    }
    window.location.href = 'library.html';
}

function logout() {
    sessionStorage.removeItem('currentUser');
    currentUser = null;
    document.getElementById("userInfo").innerText = "";
    updateNavButtons();
    showSection('home');
}

function logoutFromLibrary() {
    sessionStorage.removeItem('currentUser');
    currentUser = null;
    window.location.href = 'index.html';
}

function uploadCode() {
    let name = document.getElementById("codeName").value;
    let file = document.getElementById("pdfFile").files[0];

    if (!name || !file) {
        alert("Please provide code name and PDF.");
        return;
    }

    let reader = new FileReader();
    reader.onload = function(e) {
        let newCode = { 
            name, 
            pdf: e.target.result,
            chapters: []
        };
        codes.push(newCode);
        localStorage.setItem("codes", JSON.stringify(codes));
        alert(`Code "${name}" uploaded successfully!`);
        document.getElementById("codeName").value = "";
        let codeChaptersField = document.getElementById("codeChapters");
        if (codeChaptersField) codeChaptersField.value = "";
        document.getElementById("pdfFile").value = "";
        loadCodes();
    };
    reader.readAsDataURL(file);
}

function loadCodes() {
    let list = document.getElementById("codesList");
    if (!list) return;
    
    list.innerHTML = "";

    // Load predefined codes (excluding deleted ones)
    predefinedCodes.forEach((code, index) => {
        // Skip if this code has been deleted
        if (deletedPredefinedCodes.includes(index)) return;

        list.innerHTML += `
            <div class="code-card code-openable" onclick="openCodeViewer('predefined', ${index})" style="display: block; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                    <strong style="font-size: 18px; color: #5f2f4e; flex: 1;">${code.name}</strong>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <label onclick="event.stopPropagation()" style="display:inline-flex; align-items:center; gap:6px; background:#fff; border:1px solid rgba(153,58,139,0.25); border-radius:6px; padding:7px 10px; color:#5f2f4e; font-size:0.85rem; cursor:pointer;">
                            <input type="checkbox" class="code-select-checkbox" data-source="predefined" data-index="${index}" data-name="${escapeHtml(code.name)}" onchange="syncSelectAllCodesCheckbox()">
                            Select
                        </label>
                        <a href="${code.pdfPath}" onclick="event.stopPropagation()" download="${code.name}.pdf">
                            <button style="background: #993a8b; color: white; padding: 8px 15px;">📥 PDF</button>
                        </a>
                        ${currentUser?.role === "Authority" ? 
                            `<button onclick="event.stopPropagation(); deletePredefinedCode(${index})" style="background: #a2574f; color: white; padding: 8px 15px;">🗑️ Delete</button>` : ""}
                    </div>
                </div>
            </div>
        `;
    });

    // Load user-uploaded codes
    codes.forEach((code, index) => {
        list.innerHTML += `
            <div class="code-card code-openable" onclick="openCodeViewer('uploaded', ${index})" style="display: block; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong style="font-size: 18px; color: #5f2f4e;">${code.name}</strong>
                    <div>
                        <label onclick="event.stopPropagation()" style="display:inline-flex; align-items:center; gap:6px; background:#fff; border:1px solid rgba(153,58,139,0.25); border-radius:6px; padding:7px 10px; color:#5f2f4e; font-size:0.85rem; cursor:pointer; margin-right:5px;">
                            <input type="checkbox" class="code-select-checkbox" data-source="uploaded" data-index="${index}" data-name="${escapeHtml(code.name)}" onchange="syncSelectAllCodesCheckbox()">
                            Select
                        </label>
                        <a href="${code.pdf}" onclick="event.stopPropagation()" download="${code.name}.pdf">
                            <button style="background: #993a8b; color: white; padding: 8px 15px; margin-right: 5px;">📥 Download PDF</button>
                        </a>
                        ${currentUser?.role === "Authority" ? 
                            `<button onclick="event.stopPropagation(); deleteUploadedCode(${index})" style="background: #a2574f; color: white; padding: 8px 15px;">🗑️ Delete</button>` : ""}
                    </div>
                </div>
            </div>
        `;
    });

    syncSelectAllCodesCheckbox();
}

function initializeCodeQaPanel() {
    const resultEl = document.getElementById('codeQaResult');
    if (resultEl && !resultEl.textContent.trim()) {
        resultEl.textContent = 'Select one or more codes, ask a question, then click "Get Answer".';
    }
    syncSelectAllCodesCheckbox();
}

function setCodeQaStatus(message, isError = false) {
    const statusEl = document.getElementById('codeQaStatus');
    if (!statusEl) return;
    statusEl.style.color = isError ? '#9d174d' : '#7a4658';
    statusEl.textContent = message || '';
}

function clearCodeQaResult() {
    const input = document.getElementById('codeQuestionInput');
    if (input) input.value = '';

    const result = document.getElementById('codeQaResult');
    if (result) result.textContent = 'Select one or more codes, ask a question, then click "Get Answer".';

    setCodeQaStatus('');
}

function toggleSelectAllCodes(checked) {
    const checkboxes = document.querySelectorAll('.code-select-checkbox');
    checkboxes.forEach(box => {
        box.checked = Boolean(checked);
    });
}

function syncSelectAllCodesCheckbox() {
    const allToggle = document.getElementById('selectAllCodesCheckbox');
    const checkboxes = Array.from(document.querySelectorAll('.code-select-checkbox'));
    if (!allToggle) return;

    if (!checkboxes.length) {
        allToggle.checked = false;
        allToggle.indeterminate = false;
        return;
    }

    const selected = checkboxes.filter(box => box.checked).length;
    allToggle.checked = selected === checkboxes.length;
    allToggle.indeterminate = selected > 0 && selected < checkboxes.length;
}

function getSelectedCodesForQa() {
    const selected = [];
    const checkboxes = Array.from(document.querySelectorAll('.code-select-checkbox'));

    checkboxes.forEach(box => {
        if (!box.checked) return;

        const source = box.getAttribute('data-source');
        const index = Number(box.getAttribute('data-index'));
        if (!source || Number.isNaN(index)) return;

        const code = source === 'predefined' ? predefinedCodes[index] : codes[index];
        if (!code) return;

        selected.push({
            source,
            index,
            name: code.name,
            pdfPath: code.pdfPath || code.pdf
        });
    });

    return selected;
}

function getAllAvailableCodesForQa() {
    const allCodes = [];

    predefinedCodes.forEach((code, index) => {
        if (deletedPredefinedCodes.includes(index)) return;
        allCodes.push({
            source: 'predefined',
            index,
            name: code.name,
            pdfPath: code.pdfPath || code.pdf
        });
    });

    codes.forEach((code, index) => {
        allCodes.push({
            source: 'uploaded',
            index,
            name: code.name,
            pdfPath: code.pdfPath || code.pdf
        });
    });

    return allCodes;
}

function extractQuestionKeywords(question) {
    const cleaned = normalizeSearchText(question)
        .replace(/[^a-z0-9\s]/g, ' ')
        .trim();

    const rawTokens = cleaned.split(/\s+/).filter(Boolean);
    const tokens = rawTokens
        .map(token => token.trim())
        .filter(token => token.length >= 3)
        .flatMap(token => {
            if (token.endsWith('s') && token.length > 4) {
                return [token, token.slice(0, -1)];
            }
            return [token];
        });

    const phrases = [];
    for (let index = 0; index < rawTokens.length - 1; index++) {
        const pair = `${rawTokens[index]} ${rawTokens[index + 1]}`.trim();
        if (pair.length >= 7) phrases.push(pair);
    }

    return [...new Set([...tokens, ...phrases])].slice(0, 24);
}

function sliceSnippetAround(text, matchIndex, radius = 240) {
    const source = String(text || '');
    if (!source) return '';

    const start = Math.max(0, matchIndex - radius);
    const end = Math.min(source.length, matchIndex + radius);
    return source.slice(start, end).replace(/\s+/g, ' ').trim();
}

function getKeywordSnippetsFromPdfText(pdfText, keywords) {
    const source = String(pdfText || '');
    if (!source || !keywords.length) return [];

    const lower = source.toLowerCase();
    const snippets = [];
    const usedIndexes = new Set();

    keywords.forEach(keyword => {
        const foundAt = lower.indexOf(keyword.toLowerCase());
        if (foundAt < 0) return;

        const bucket = Math.floor(foundAt / 180);
        if (usedIndexes.has(bucket)) return;
        usedIndexes.add(bucket);

        const snippet = sliceSnippetAround(source, foundAt, 280);
        if (snippet) snippets.push(snippet);
    });

    return snippets.slice(0, 3);
}

function findNearbySectionReference(pdfText, index) {
    const source = String(pdfText || '');
    if (!source) return '';

    const start = Math.max(0, index - 900);
    const end = Math.min(source.length, index + 120);
    const windowText = source.slice(start, end);

    const sectionPatterns = [
        /section\s+([0-9]{1,4}(?:\.[0-9]{1,4}){0,4})/gi,
        /\b([0-9]{1,4}(?:\.[0-9]{1,4}){1,5})\b/g
    ];

    for (const pattern of sectionPatterns) {
        const matches = [...windowText.matchAll(pattern)];
        if (!matches.length) continue;
        const last = matches[matches.length - 1];
        const ref = String(last[1] || '').trim();
        if (ref) return ref;
    }

    return '';
}

function extractEvidenceCandidatesFromPdfText(pdfText, question) {
    const source = String(pdfText || '');
    if (!source) return [];

    const keywords = extractQuestionKeywords(question);
    if (!keywords.length) return [];

    const lower = source.toLowerCase();
    const evidence = [];
    const usedBuckets = new Set();

    keywords.forEach(keyword => {
        const foundAt = lower.indexOf(String(keyword).toLowerCase());
        if (foundAt < 0) return;

        const bucket = Math.floor(foundAt / 220);
        if (usedBuckets.has(bucket)) return;
        usedBuckets.add(bucket);

        const snippet = sliceSnippetAround(source, foundAt, 330);
        if (!snippet) return;

        evidence.push({
            section: findNearbySectionReference(source, foundAt),
            snippet
        });
    });

    return evidence.slice(0, 6);
}

async function buildCodeContextForQuestion(code, question) {
    const keywords = extractQuestionKeywords(question);
    const chapters = await getViewerChapters(code.name);

    const chapterLines = (chapters || [])
        .slice(0, 20)
        .map(chapter => {
            const chapterTitle = `Chapter ${chapter.number}: ${chapter.title}`;
            const relevantSections = (chapter.sections || [])
                .filter(section => {
                    const sectionLabel = `${section.code || ''} ${section.title || ''}`;
                    const normalized = normalizeSearchText(sectionLabel);
                    return keywords.some(keyword => normalized.includes(keyword));
                })
                .slice(0, 6)
                .map(section => `${section.code || ''} ${section.title || ''}`.trim());

            if (!relevantSections.length) {
                return `- ${chapterTitle}`;
            }

            return `- ${chapterTitle}\n  Relevant sections: ${relevantSections.join(' | ')}`;
        })
        .join('\n');

    let keywordSnippets = [];
    let evidenceCandidates = [];
    if (code.pdfPath) {
        try {
            const pdfText = await extractPdfText(code.pdfPath);
            keywordSnippets = getKeywordSnippetsFromPdfText(pdfText, keywords);
            evidenceCandidates = extractEvidenceCandidatesFromPdfText(pdfText, question);
        } catch (_) {
            keywordSnippets = [];
            evidenceCandidates = [];
        }
    }

    const snippetBlock = keywordSnippets.length
        ? `\n\nExtracted code text snippets:\n${keywordSnippets.map((snippet, idx) => `${idx + 1}) ${snippet}`).join('\n\n')}`
        : '';

    const evidenceBlock = evidenceCandidates.length
        ? `\n\nEvidence snippets found: ${evidenceCandidates.length}\n${evidenceCandidates
            .map((item, idx) => `[Citation Candidate ${idx + 1}] Section: ${item.section || 'not-labeled'} | Text: ${item.snippet}`)
            .join('\n\n')}`
        : `\n\nEvidence snippets found: 0`;

    return `Code: ${code.name}\n\nOutline:\n${chapterLines || '- No chapter outline available.'}${snippetBlock}${evidenceBlock}`;
}

function getPgbcQaApiTargets() {
    const path = '/api/pgbc/code-qa';
    const hostname = String(window.location.hostname || '').toLowerCase();
    const targets = [];

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        targets.push(`http://localhost:8787${path}`);
    }

    if (hostname.endsWith('github.io')) {
        targets.push(`${PGBC_AI_BACKEND_PROD_BASE}${path}`);
    }

    targets.push(path);
    return [...new Set(targets)];
}

async function askPgbcCodesAi(question, codeContexts, selectedCodeNames, allCodeNames) {
    const payload = {
        question,
        codeContexts,
        selectedCodeNames,
        allCodeNames
    };

    let lastError = 'AI service unavailable.';

    for (const target of getPgbcQaApiTargets()) {
        try {
            const response = await fetch(target, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                lastError = `AI request failed (${response.status}): ${errorText}`;
                continue;
            }

            const data = await response.json();
            const directAnswer = String(data?.directAnswer || '').trim();
            const points = Array.isArray(data?.points) ? data.points : [];
            const addressedInSelectedCodes = Boolean(data?.addressedInSelectedCodes);
            const suggestedCodesIfNotAddressed = Array.isArray(data?.suggestedCodesIfNotAddressed)
                ? data.suggestedCodesIfNotAddressed
                : [];

            if (directAnswer || points.length || typeof data?.answer === 'string') {
                return {
                    ok: true,
                    directAnswer: directAnswer || String(data?.answer || '').trim(),
                    points,
                    assumptions: Array.isArray(data?.assumptions) ? data.assumptions : [],
                    checkInPdf: Array.isArray(data?.checkInPdf) ? data.checkInPdf : [],
                    addressedInSelectedCodes,
                    suggestedCodesIfNotAddressed
                };
            }

            lastError = 'AI returned empty answer.';
        } catch (error) {
            lastError = String(error?.message || error);
        }
    }

    return { ok: false, error: lastError };
}

function formatCitationLine(citation) {
    const codeName = String(citation?.codeName || 'Code');
    const chapter = String(citation?.chapter || '').trim();
    const section = String(citation?.section || '').trim();
    const evidence = String(citation?.evidence || '').trim();

    const refs = [codeName];
    if (chapter) refs.push(`Chapter ${chapter}`);
    if (section) refs.push(`Section ${section}`);

    if (!evidence) return `- ${refs.join(' | ')}`;
    return `- ${refs.join(' | ')} — ${evidence}`;
}

function formatPgbcQaOutput(result, selectedCodes) {
    const lines = [];
    const selectedSourceList = selectedCodes.map(code => `• ${code.name}`);

    if (!result.addressedInSelectedCodes) {
        lines.push('Not addressed in the currently selected code(s).');
        lines.push('');
    }

    if (result.directAnswer) {
        lines.push('Direct answer:');
        lines.push(result.directAnswer);
        lines.push('');
    }

    if (Array.isArray(result.points) && result.points.length) {
        lines.push('Detailed points with citations:');
        result.points.forEach((point, idx) => {
            lines.push(`${idx + 1}) ${String(point?.statement || '').trim()}`);
            const citations = Array.isArray(point?.citations) ? point.citations : [];
            if (!citations.length) {
                lines.push('- Citation: Not explicitly cited');
            } else {
                citations.forEach(citation => lines.push(formatCitationLine(citation)));
            }
            lines.push('');
        });
    }

    if (!result.addressedInSelectedCodes) {
        const suggestions = Array.isArray(result.suggestedCodesIfNotAddressed)
            ? result.suggestedCodesIfNotAddressed
            : [];

        if (suggestions.length) {
            lines.push('Suggested code(s) to select:');
            suggestions.forEach(item => {
                const codeName = String(item?.codeName || '').trim();
                const why = String(item?.why || '').trim();
                if (!codeName) return;
                lines.push(`- ${codeName}${why ? ` — ${why}` : ''}`);
            });
            lines.push('');
        }
    }

    if (Array.isArray(result.assumptions) && result.assumptions.length) {
        lines.push('Assumptions:');
        result.assumptions.forEach(item => lines.push(`- ${String(item || '')}`));
        lines.push('');
    }

    if (Array.isArray(result.checkInPdf) && result.checkInPdf.length) {
        lines.push('Check in PDF:');
        result.checkInPdf.forEach(item => lines.push(`- ${String(item || '')}`));
        lines.push('');
    }

    lines.push('Selected sources:');
    lines.push(...selectedSourceList);

    return lines.join('\n').trim();
}

async function answerQuestionFromSelectedCodes() {
    const questionInput = document.getElementById('codeQuestionInput');
    const resultEl = document.getElementById('codeQaResult');
    const answerButton = document.getElementById('answerFromCodesBtn');

    const question = String(questionInput?.value || '').trim();
    if (!question) {
        setCodeQaStatus('Please enter your question.', true);
        return;
    }

    const selectedCodes = getSelectedCodesForQa();
    const allCodes = getAllAvailableCodesForQa();
    if (!selectedCodes.length) {
        setCodeQaStatus('Select at least one code first.', true);
        return;
    }

    if (answerButton) answerButton.disabled = true;
    setCodeQaStatus('Preparing selected code context and generating answer...');
    if (resultEl) resultEl.textContent = 'Generating answer from selected code books...';

    try {
        const codeContexts = [];
        for (const code of selectedCodes) {
            const context = await buildCodeContextForQuestion(code, question);
            codeContexts.push(context);
        }

        const aiResult = await askPgbcCodesAi(
            question,
            codeContexts,
            selectedCodes.map(code => code.name),
            allCodes.map(code => code.name)
        );
        if (!aiResult.ok) {
            setCodeQaStatus('Unable to generate answer right now.', true);
            if (resultEl) resultEl.textContent = `Error: ${aiResult.error}`;
            return;
        }

        if (resultEl) {
            resultEl.textContent = formatPgbcQaOutput(aiResult, selectedCodes);
        }

        if (!aiResult.addressedInSelectedCodes) {
            setCodeQaStatus(`Question not addressed in ${selectedCodes.length} selected code(s). Suggested code selections are listed below.`, true);
        } else {
            setCodeQaStatus(`Answer generated using ${selectedCodes.length} selected code(s).`);
        }
    } catch (error) {
        setCodeQaStatus('Unexpected error while generating answer.', true);
        if (resultEl) resultEl.textContent = `Error: ${String(error?.message || error)}`;
    } finally {
        if (answerButton) answerButton.disabled = false;
    }
}

function openCodeViewer(source, index) {
    let selectedCode = source === 'predefined' ? predefinedCodes[index] : codes[index];
    if (!selectedCode) return;

    sessionStorage.setItem('selectedCodeViewer', JSON.stringify({
        source,
        index,
        name: selectedCode.name,
        pdfPath: selectedCode.pdfPath || selectedCode.pdf
    }));

    clearViewerSearchTarget();

    window.location.href = 'code-viewer.html';
}

async function getViewerChapters(codeName) {
    const normalizedCodeName = codeName.trim().toLowerCase();

    if (normalizedCodeName === 'building code of pakistan 2021') {
        if (Array.isArray(window.BCP2021_HIERARCHY) && window.BCP2021_HIERARCHY.length) {
            return window.BCP2021_HIERARCHY.map(chapter => ({
                number: chapter.number,
                title: String(chapter.title || '').replace(/^[—-]\s*/, ''),
                sections: Array.isArray(chapter.sections) ? chapter.sections : []
            }));
        }

        try {
            const response = await fetch('bcp2021_hierarchy.json', { cache: 'no-store' });
            if (response.ok) {
                const chapters = await response.json();
                return chapters.map(chapter => ({
                    number: chapter.number,
                    title: String(chapter.title || '').replace(/^[—-]\s*/, ''),
                    sections: Array.isArray(chapter.sections) ? chapter.sections : []
                }));
            }
        } catch (error) {
            console.error('Unable to load BCP 2021 hierarchy file:', error);
        }
    }

    if (normalizedCodeName.includes('standardization of building codes')) {
        if (Array.isArray(window.STANDARDIZATION2021_HIERARCHY) && window.STANDARDIZATION2021_HIERARCHY.length) {
            return window.STANDARDIZATION2021_HIERARCHY.map(chapter => ({
                number: chapter.number,
                title: String(chapter.title || '').replace(/^[—-]\s*/, ''),
                sections: Array.isArray(chapter.sections) ? chapter.sections : []
            }));
        }

        try {
            const response = await fetch('standardization2021_hierarchy.json', { cache: 'no-store' });
            if (response.ok) {
                const chapters = await response.json();
                return chapters.map(chapter => ({
                    number: chapter.number,
                    title: String(chapter.title || '').replace(/^[—-]\s*/, ''),
                    sections: Array.isArray(chapter.sections) ? chapter.sections : []
                }));
            }
        } catch (error) {
            console.error('Unable to load Standardization 2021 hierarchy file:', error);
        }
    }

    if (normalizedCodeName.includes('fire safety provisions 2016')) {
        if (Array.isArray(window.FIRE2016_HIERARCHY) && window.FIRE2016_HIERARCHY.length) {
            return window.FIRE2016_HIERARCHY.map(chapter => ({
                number: chapter.number,
                title: String(chapter.title || '').replace(/^[—-]\s*/, ''),
                sections: Array.isArray(chapter.sections) ? chapter.sections : []
            }));
        }

        try {
            const response = await fetch('fire2016_hierarchy.json', { cache: 'no-store' });
            if (response.ok) {
                const chapters = await response.json();
                return chapters.map(chapter => ({
                    number: chapter.number,
                    title: String(chapter.title || '').replace(/^[—-]\s*/, ''),
                    sections: Array.isArray(chapter.sections) ? chapter.sections : []
                }));
            }
        } catch (error) {
            console.error('Unable to load Fire Safety 2016 hierarchy file:', error);
        }
    }

    if (normalizedCodeName.includes('petsac') || normalizedCodeName.includes('telecommunication safety code')) {
        if (Array.isArray(window.PETSAC2014_HIERARCHY) && window.PETSAC2014_HIERARCHY.length) {
            return window.PETSAC2014_HIERARCHY.map(chapter => ({
                number: chapter.number,
                title: String(chapter.title || '').replace(/^[—-]\s*/, ''),
                sections: Array.isArray(chapter.sections) ? chapter.sections : []
            }));
        }

        try {
            const response = await fetch('petsac2014_hierarchy.json', { cache: 'no-store' });
            if (response.ok) {
                const chapters = await response.json();
                return chapters.map(chapter => ({
                    number: chapter.number,
                    title: String(chapter.title || '').replace(/^[—-]\s*/, ''),
                    sections: Array.isArray(chapter.sections) ? chapter.sections : []
                }));
            }
        } catch (error) {
            console.error('Unable to load PETSAC 2014 hierarchy file:', error);
        }
    }

    if (normalizedCodeName.includes('green building code of pakistan 2023') || normalizedCodeName.includes('gbcp')) {
        if (Array.isArray(window.GBCP2023_HIERARCHY) && window.GBCP2023_HIERARCHY.length) {
            return window.GBCP2023_HIERARCHY.map(chapter => ({
                number: chapter.number,
                title: String(chapter.title || '').replace(/^[—-]\s*/, ''),
                sections: Array.isArray(chapter.sections) ? chapter.sections : []
            }));
        }

        try {
            const response = await fetch('gbcp2023_hierarchy.json', { cache: 'no-store' });
            if (response.ok) {
                const chapters = await response.json();
                return chapters.map(chapter => ({
                    number: chapter.number,
                    title: String(chapter.title || '').replace(/^[—-]\s*/, ''),
                    sections: Array.isArray(chapter.sections) ? chapter.sections : []
                }));
            }
        } catch (error) {
            console.error('Unable to load GBCP 2023 hierarchy file:', error);
        }
    }

    if (normalizedCodeName.includes('energy conservation building code 2023') || normalizedCodeName.includes('(ecbc)') || normalizedCodeName.includes(' ecbc')) {
        if (Array.isArray(window.ECBC2023_HIERARCHY) && window.ECBC2023_HIERARCHY.length) {
            return window.ECBC2023_HIERARCHY.map(chapter => ({
                number: chapter.number,
                title: String(chapter.title || '').replace(/^[—-]\s*/, ''),
                sections: Array.isArray(chapter.sections) ? chapter.sections : []
            }));
        }

        try {
            const response = await fetch('ecbc2023_hierarchy.json', { cache: 'no-store' });
            if (response.ok) {
                const chapters = await response.json();
                return chapters.map(chapter => ({
                    number: chapter.number,
                    title: String(chapter.title || '').replace(/^[—-]\s*/, ''),
                    sections: Array.isArray(chapter.sections) ? chapter.sections : []
                }));
            }
        } catch (error) {
            console.error('Unable to load ECBC 2023 hierarchy file:', error);
        }
    }

    if (normalizedCodeName.includes('building code of pakistan 2007') || normalizedCodeName.includes('seismic provisions 2007') || normalizedCodeName.includes('bcp-sp 2007')) {
        if (Array.isArray(window.BCP2007_SEISMIC_HIERARCHY) && window.BCP2007_SEISMIC_HIERARCHY.length) {
            return window.BCP2007_SEISMIC_HIERARCHY.map(chapter => ({
                number: chapter.number,
                title: String(chapter.title || '').replace(/^[—-]\s*/, ''),
                sections: Array.isArray(chapter.sections) ? chapter.sections : []
            }));
        }

        try {
            const response = await fetch('bcp2007_seismic_hierarchy.json', { cache: 'no-store' });
            if (response.ok) {
                const chapters = await response.json();
                return chapters.map(chapter => ({
                    number: chapter.number,
                    title: String(chapter.title || '').replace(/^[—-]\s*/, ''),
                    sections: Array.isArray(chapter.sections) ? chapter.sections : []
                }));
            }
        } catch (error) {
            console.error('Unable to load BCP 2007 seismic hierarchy file:', error);
        }
    }

    if (normalizedCodeName.includes('bcp energy provisions 2011') || normalizedCodeName.includes('bec-2011') || normalizedCodeName.includes('bec 2011')) {
        if (Array.isArray(window.BEC2011_HIERARCHY) && window.BEC2011_HIERARCHY.length) {
            return window.BEC2011_HIERARCHY.map(chapter => ({
                number: chapter.number,
                title: String(chapter.title || '').replace(/^[—-]\s*/, ''),
                sections: Array.isArray(chapter.sections) ? chapter.sections : []
            }));
        }

        try {
            const response = await fetch('bec2011_hierarchy.json', { cache: 'no-store' });
            if (response.ok) {
                const chapters = await response.json();
                return chapters.map(chapter => ({
                    number: chapter.number,
                    title: String(chapter.title || '').replace(/^[—-]\s*/, ''),
                    sections: Array.isArray(chapter.sections) ? chapter.sections : []
                }));
            }
        } catch (error) {
            console.error('Unable to load BEC 2011 hierarchy file:', error);
        }
    }

    return [
        {
            number: 1,
            title: 'Overview',
            sections: [
                { code: '1.0', title: `${codeName} summary and document purpose.` },
                { code: '2.0', title: 'Scope and applicability guidance.' },
                { code: '3.0', title: 'Key technical terms and references.' }
            ]
        }
    ];
}

const viewerUiState = {
    selectedCode: null,
    chapters: [],
    nodeIndex: {},
    searchTerm: '',
    searchNotice: '',
    expandedChapters: new Set(),
    expandedNodes: new Set(),
    selectedNodeKey: null,
    explanationCache: {},
    loadingNodeKey: null,
    loadingError: ''
};

const viewerPdfTextCache = {};

let pdfLibLoadingPromise = null;

function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
        const existing = Array.from(document.querySelectorAll('script')).find(script => script.src === src);
        if (existing) {
            if (window.pdfjsLib) {
                resolve(true);
                return;
            }
            existing.addEventListener('load', () => resolve(true), { once: true });
            existing.addEventListener('error', () => reject(new Error(`Failed loading ${src}`)), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error(`Failed loading ${src}`));
        document.head.appendChild(script);
    });
}

async function ensurePdfLibraryLoaded() {
    if (window.pdfjsLib) return;
    if (pdfLibLoadingPromise) {
        await pdfLibLoadingPromise;
        return;
    }

    const scriptSources = [
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
        'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js'
    ];

    pdfLibLoadingPromise = (async () => {
        for (const src of scriptSources) {
            try {
                await loadScriptOnce(src);
                if (window.pdfjsLib) return;
            } catch (_) {
                // Try next source
            }
        }
        throw new Error('Unable to load PDF library from available sources.');
    })();

    try {
        await pdfLibLoadingPromise;
    } finally {
        pdfLibLoadingPromise = null;
    }
}

function getSectionLevel(code, chapterNumber) {
    if (!code) return 1;

    const normalized = String(code).trim();
    if (normalized.toLowerCase() === 'division') return 1;

    if (/^\d+(\.\d+)+$/.test(normalized)) {
        const segments = normalized.split('.');
        if (segments[0] === String(chapterNumber)) {
            return Math.max(1, segments.length - 1);
        }
        return segments.length;
    }

    if (/^[A-Z](\.\d+)+$/.test(normalized)) {
        return normalized.split('.').length;
    }

    return 1;
}

function buildChapterHierarchy(chapter, chapterKey, nodeIndexRef) {
    const roots = [];
    const stack = [];

    (chapter.sections || []).forEach((section, index) => {
        const title = String(section.title || '').trim();
        const code = String(section.code || '').trim();
        const level = getSectionLevel(code, chapter.number);
        const key = `${chapterKey}-node-${index}`;

        const node = {
            key,
            code,
            title,
            level,
            children: [],
            parentKey: null,
            chapterNumber: chapter.number,
            chapterTitle: chapter.title
        };

        nodeIndexRef[key] = node;

        while (stack.length && stack[stack.length - 1].level >= level) {
            stack.pop();
        }

        if (stack.length === 0) {
            roots.push(node);
        } else {
            const parent = stack[stack.length - 1];
            node.parentKey = parent.key;
            parent.children.push(node);
        }

        stack.push(node);
    });

    return roots;
}

function filterHierarchy(nodes, term) {
    if (!term) return nodes;

    return nodes
        .map(node => {
            const label = `${node.code} ${node.title}`.toLowerCase();
            const childMatches = filterHierarchy(node.children || [], term);
            if (label.includes(term) || childMatches.length) {
                return {
                    ...node,
                    children: childMatches
                };
            }
            return null;
        })
        .filter(Boolean);
}

function getFilteredViewerChapters() {
    const term = viewerUiState.searchTerm;

    if (!term) {
        return viewerUiState.chapters;
    }

    return viewerUiState.chapters
        .map(chapter => {
            const chapterLabel = `chapter ${chapter.number} ${chapter.title}`.toLowerCase();
            const chapterMatches = chapterLabel.includes(term);
            const nodes = chapterMatches ? chapter.nodes : filterHierarchy(chapter.nodes || [], term);

            if (chapterMatches || nodes.length) {
                return {
                    ...chapter,
                    nodes
                };
            }
            return null;
        })
        .filter(Boolean);
}

function createNodeMarkup(node, depth, forceExpand) {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = forceExpand || viewerUiState.expandedNodes.has(node.key);
    const isSelected = viewerUiState.selectedNodeKey === node.key;
    const paddingLeft = 12 + (depth * 14);
    const indicator = hasChildren ? (isExpanded ? '▼' : '▶') : '•';
    const codeText = node.code ? `${node.code} ` : '';

    let markup = `
        <div class="sidebar-subsection-item" onclick="onViewerNodeClick('${node.key}')" style="padding-left:${paddingLeft}px; background:${isSelected ? 'rgba(191, 117, 135, 0.24)' : 'rgba(255,255,255,0.05)'}; border-left:${isSelected ? '3px solid #993a8b' : '3px solid transparent'};">
            ${indicator} ${codeText}${node.title}
        </div>
    `;

    if (hasChildren && isExpanded) {
        node.children.forEach(child => {
            markup += createNodeMarkup(child, depth + 1, forceExpand);
        });
    }

    return markup;
}

function renderViewerSidebar(chaptersToRender) {
    const sidebar = document.getElementById('viewerSidebarList');
    if (!sidebar) return;

    if (!chaptersToRender.length) {
        sidebar.innerHTML = '<div class="sidebar-chapter-item">No matching chapters</div>';
        return;
    }

    const forceExpand = viewerUiState.searchTerm.length > 0;

    sidebar.innerHTML = chaptersToRender.map(chapter => {
        const chapterExpanded = forceExpand || viewerUiState.expandedChapters.has(chapter.key);
        let chapterMarkup = `
            <div class="sidebar-chapter-item" onclick="toggleViewerChapter('${chapter.key}')">
                📁 CHAPTER ${chapter.number}: ${chapter.title}
            </div>
        `;

        if (chapterExpanded) {
            chapter.nodes.forEach(node => {
                chapterMarkup += createNodeMarkup(node, 0, forceExpand);
            });
        }

        return chapterMarkup;
    }).join('');
}

function buildSectionExplanation(node, codeName) {
    const sectionLabel = node.code ? `${node.code} ${node.title}` : node.title;

    return `
        <div style="border:1px solid #d9e3e8; border-radius:10px; padding:16px; background:#f8fbfc;">
            <h3 style="margin:0 0 8px 0; color:#1f3c48; font-size:1.2rem;">${sectionLabel}</h3>
            <p style="margin:0 0 12px 0; color:#5c7180; font-size:0.92rem;">Code: ${codeName} • Chapter ${node.chapterNumber}: ${node.chapterTitle}</p>
            <p style="margin:0; color:#374c57; line-height:1.6;">This subsection defines the requirements and guidance for <strong>${node.title}</strong>. Refer to the official PDF for full mandatory clauses, tables, formulas, exceptions, and jurisdiction-specific compliance details.</p>
        </div>
    `;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeSearchText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function buildNormalizedIndexMap(text) {
    const source = String(text || '');
    let normalized = '';
    const indexMap = [];
    let lastWasWhitespace = false;

    for (let index = 0; index < source.length; index++) {
        const char = source[index];
        const isWhitespace = /\s/.test(char);

        if (isWhitespace) {
            if (!lastWasWhitespace) {
                normalized += ' ';
                indexMap.push(index);
                lastWasWhitespace = true;
            }
            continue;
        }

        normalized += char.toLowerCase();
        indexMap.push(index);
        lastWasWhitespace = false;
    }

    return { normalized, indexMap, source };
}

function findExactSectionTextFromPdf(pdfText, node) {
    const map = buildNormalizedIndexMap(pdfText);
    if (!map.normalized || !map.indexMap.length) return null;

    const sectionCode = normalizeSearchText(node.code || '');
    const sectionTitle = normalizeSearchText(node.title || '');
    const headingCandidates = [
        `${sectionCode} ${sectionTitle}`.trim(),
        `${sectionCode}-${sectionTitle}`.trim(),
        sectionCode,
        sectionTitle
    ].map(normalizeSearchText).filter(Boolean);

    let startNormalizedIndex = -1;
    let usedHeading = '';

    for (const candidate of headingCandidates) {
        if (candidate.length < 2) continue;
        const found = map.normalized.indexOf(candidate);
        if (found !== -1) {
            startNormalizedIndex = found;
            usedHeading = candidate;
            break;
        }
    }

    if (startNormalizedIndex === -1) {
        return null;
    }

    const codePattern = /\b\d+(?:\.\d+){1,6}\b/g;
    const scanStart = startNormalizedIndex + Math.max(usedHeading.length, sectionCode.length || 0);
    const trailingSlice = map.normalized.slice(scanStart);
    let match;
    let endNormalizedIndex = -1;

    while ((match = codePattern.exec(trailingSlice)) !== null) {
        const token = (match[0] || '').toLowerCase();
        if (!token) continue;

        if (sectionCode && (token === sectionCode || token.startsWith(`${sectionCode}.`))) {
            continue;
        }

        endNormalizedIndex = scanStart + match.index;
        break;
    }

    if (endNormalizedIndex === -1) {
        endNormalizedIndex = Math.min(map.normalized.length - 1, startNormalizedIndex + 12000);
    }

    const startOriginalIndex = map.indexMap[startNormalizedIndex] ?? 0;
    const endOriginalIndex = map.indexMap[endNormalizedIndex] ?? map.source.length;
    const sectionText = map.source.slice(startOriginalIndex, endOriginalIndex).trim();

    if (!sectionText) return null;

    return {
        sectionText,
        matchedHeading: usedHeading,
        startOriginalIndex,
        endOriginalIndex
    };
}

async function extractPdfText(pdfPath) {
    if (!pdfPath) return '';
    if (viewerPdfTextCache[pdfPath]) return viewerPdfTextCache[pdfPath];

    await ensurePdfLibraryLoaded();

    if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const loadingTask = window.pdfjsLib.getDocument(pdfPath);
    const pdf = await loadingTask.promise;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const parts = [];
        textContent.items.forEach(item => {
            const text = String(item.str || '');
            if (!text) return;
            parts.push(text);
            parts.push(item.hasEOL ? '\n' : ' ');
        });

        const pageText = parts
            .join('')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ ]{2,}/g, ' ')
            .trim();

        pages.push(`[Page ${pageNumber}]\n${pageText}`);
    }

    const fullText = pages.join('\n\n');
    viewerPdfTextCache[pdfPath] = fullText;
    return fullText;
}

async function generateAiSummaryFromSectionText(sectionText, node) {
    const sectionLabel = node.code ? `${node.code} ${node.title}` : node.title;
    const localFallbackSummary = buildLocalSectionSummary(sectionText, node);

    try {
        const response = await fetch('/.netlify/functions/ai-summary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sectionText,
                sectionLabel
            })
        });

        if (!response.ok) {
            return localFallbackSummary;
        }

        const data = await response.json();
        const summaryText = data?.summaryText?.trim();
        if (!summaryText) {
            return localFallbackSummary;
        }

        return summaryText;
    } catch (_) {
        return localFallbackSummary;
    }
}

function buildLocalSectionSummary(sectionText, node) {
    const cleaned = String(sectionText || '')
        .replace(/\s+/g, ' ')
        .trim();

    const snippet = cleaned.length > 700 ? `${cleaned.slice(0, 700).trim()}…` : cleaned;
    const sectionLabel = node.code ? `${node.code} ${node.title}` : node.title;

    return `Section ${sectionLabel} sets requirements and guidance for this part of the code. Key extracted text: ${snippet}`;
}

async function generateAiExplanationForNode(node) {
    const code = viewerUiState.selectedCode;
    if (!code?.pdfPath) {
        throw new Error('Selected code PDF path is missing.');
    }

    const pdfText = await extractPdfText(code.pdfPath);
    const exact = findExactSectionTextFromPdf(pdfText, node);
    if (!exact?.sectionText) {
        return {
            sectionText: `Exact section text could not be extracted for ${node.code ? `${node.code} ${node.title}` : node.title}.`,
            summaryText: `This section appears to define scope, technical requirements, and compliance guidance for ${node.title}. Open the full PDF to review all mandatory clauses and tables.`,
            matchedHeading: ''
        };
    }

    const summaryText = await generateAiSummaryFromSectionText(exact.sectionText, node);

    return {
        sectionText: exact.sectionText,
        summaryText,
        matchedHeading: exact.matchedHeading
    };
}

async function ensureNodeExplanation(nodeKey) {
    const node = viewerUiState.nodeIndex[nodeKey];
    if (!node) return;
    if (viewerUiState.explanationCache[nodeKey]) return;
    if (viewerUiState.loadingNodeKey === nodeKey) return;

    viewerUiState.loadingNodeKey = nodeKey;
    viewerUiState.loadingError = '';
    renderViewerExplanation();

    try {
        const result = await generateAiExplanationForNode(node);
        viewerUiState.explanationCache[nodeKey] = result;
    } catch (error) {
        viewerUiState.loadingError = String(error?.message || error);
    } finally {
        viewerUiState.loadingNodeKey = null;
        renderViewerExplanation();
    }
}

function renderViewerExplanation() {
    const mainList = document.getElementById('viewerMainList');
    if (!mainList) return;

    const noticeMarkup = viewerUiState.searchNotice
        ? `<div style="margin-bottom:12px; border:1px solid #f3dfa6; background:#fff7df; color:#6a5315; border-radius:8px; padding:10px 12px; font-size:0.92rem;">${escapeHtml(viewerUiState.searchNotice)}</div>`
        : '';

    const selectedNode = viewerUiState.nodeIndex[viewerUiState.selectedNodeKey];
    if (!selectedNode) {
        mainList.innerHTML = `${noticeMarkup}<p style="color:#7b8a90; margin:0;">Select any chapter section from the left panel to view details and explanation.</p>`;
        return;
    }

    const explanationData = viewerUiState.explanationCache[selectedNode.key];
    const isLoading = viewerUiState.loadingNodeKey === selectedNode.key;
    let aiMarkup = '';

    if (isLoading) {
        aiMarkup = `
            <div style="margin-top:14px; border:1px solid #d9e3e8; border-radius:10px; padding:14px; background:#ffffff; color:#375260;">
                <p style="margin:0; font-weight:600;">Extracting exact section text from PDF and generating summary...</p>
                <p style="margin:8px 0 0; font-size:0.92rem; color:#5f7481;">This can take a few seconds for large code books.</p>
            </div>
        `;
    } else if (explanationData) {
        aiMarkup = `
            <div style="margin-top:14px; border:1px solid #d9e3e8; border-radius:10px; padding:14px; background:#ffffff;">
                <h4 style="margin:0 0 10px; color:#1f3c48;">Exact Code Text (as extracted from PDF)</h4>
                <div style="white-space:pre-wrap; color:#2f4956; line-height:1.6; background:#f8fbfc; border:1px solid #e4edf1; border-radius:8px; padding:10px; max-height:360px; overflow:auto;">${escapeHtml(explanationData.sectionText)}</div>

                <h4 style="margin:14px 0 10px; color:#1f3c48;">Summary of This Section</h4>
                <div style="white-space:pre-wrap; color:#2f4956; line-height:1.65;">${escapeHtml(explanationData.summaryText)}</div>
            </div>
        `;
    } else if (viewerUiState.loadingError) {
        aiMarkup = `
            <div style="margin-top:14px; border:1px solid #f1d3d3; border-radius:10px; padding:14px; background:#fff8f8; color:#7d2b2b;">
                <p style="margin:0; font-weight:600;">Unable to generate AI explanation.</p>
                <p style="margin:8px 0 0; font-size:0.92rem;">${escapeHtml(viewerUiState.loadingError)}</p>
            </div>
        `;
    }

    let childrenMarkup = '';
    if (selectedNode.children && selectedNode.children.length) {
        childrenMarkup = `
            <div style="margin-top:14px;">
                <p style="margin:0 0 8px; font-weight:600; color:#34505c;">Subsections</p>
                <div style="display:grid; gap:6px;">
                    ${selectedNode.children.map(child => `
                        <button onclick="onViewerNodeClick('${child.key}')" style="text-align:left; background:#eef4f7; color:#26414e; border:1px solid #d7e2e8; border-radius:6px; padding:8px 10px; cursor:pointer;">
                            ${child.code ? `${child.code} ` : ''}${child.title}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    mainList.innerHTML = `
        ${noticeMarkup}
        ${buildSectionExplanation(selectedNode, viewerUiState.selectedCode?.name || 'Selected Code')}
        ${aiMarkup}
        ${childrenMarkup}
    `;
}

function renderViewerPage() {
    const chaptersToRender = getFilteredViewerChapters();
    renderViewerSidebar(chaptersToRender);
    renderViewerExplanation();

    const actions = document.getElementById('viewerActions');
    if (actions && viewerUiState.selectedCode) {
        actions.innerHTML = `
            <a href="${viewerUiState.selectedCode.pdfPath}" download="${viewerUiState.selectedCode.name}.pdf" style="text-decoration:none;">
                <button style="background:#993a8b; color:#fff;">📥 Download PDF</button>
            </a>
            <a href="${viewerUiState.selectedCode.pdfPath}" target="_blank" style="text-decoration:none;">
                <button style="background:#e68057; color:#fff;">👁️ View PDF</button>
            </a>
        `;
    }
}

function toggleViewerChapter(chapterKey) {
    if (viewerUiState.expandedChapters.has(chapterKey)) {
        viewerUiState.expandedChapters.delete(chapterKey);
    } else {
        viewerUiState.expandedChapters.add(chapterKey);
    }
    renderViewerPage();
}

async function onViewerNodeClick(nodeKey) {
    const node = viewerUiState.nodeIndex[nodeKey];
    if (!node) return;

    viewerUiState.selectedNodeKey = nodeKey;

    if (node.children && node.children.length) {
        if (viewerUiState.expandedNodes.has(nodeKey)) {
            viewerUiState.expandedNodes.delete(nodeKey);
        } else {
            viewerUiState.expandedNodes.add(nodeKey);
        }
    }

    renderViewerPage();
    await ensureNodeExplanation(nodeKey);
}

async function initializeCodeViewerPage() {
    const selectedCode = JSON.parse(sessionStorage.getItem('selectedCodeViewer') || 'null');
    if (!selectedCode) {
        window.location.href = 'library.html';
        return;
    }

    const user = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    const userInfo = document.getElementById('userInfo');
    if (user && userInfo) {
        userInfo.innerText = `Logged in as: ${user.role}`;
    }

    const titleEl = document.getElementById('viewerCodeTitle');
    const subtitleEl = document.getElementById('viewerCodeSubtitle');
    if (titleEl) titleEl.innerText = selectedCode.name;
    if (subtitleEl) subtitleEl.innerText = 'Complete Code Navigation';

    viewerUiState.selectedCode = selectedCode;

    const chapters = await getViewerChapters(selectedCode.name);
    viewerUiState.nodeIndex = {};
    viewerUiState.expandedChapters = new Set();
    viewerUiState.expandedNodes = new Set();
    viewerUiState.searchTerm = '';
    viewerUiState.searchNotice = '';
    viewerUiState.selectedNodeKey = null;
    viewerUiState.explanationCache = {};
    viewerUiState.loadingNodeKey = null;
    viewerUiState.loadingError = '';

    viewerUiState.chapters = chapters.map((chapter, index) => {
        const key = `chapter-${index}`;
        return {
            ...chapter,
            key,
            nodes: buildChapterHierarchy(chapter, key, viewerUiState.nodeIndex)
        };
    });

    let selectedNodeFromTarget = null;
    const target = JSON.parse(sessionStorage.getItem('viewerSearchTarget') || 'null');
    if (target) {
        viewerUiState.searchNotice = String(target.notice || '');
        selectedNodeFromTarget = applyViewerSearchTarget(target);
        clearViewerSearchTarget();
    }

    renderViewerPage();

    if (selectedNodeFromTarget) {
        await ensureNodeExplanation(selectedNodeFromTarget);
    }

    const searchInput = document.getElementById('viewerSearchBox');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            viewerUiState.searchTerm = this.value.trim().toLowerCase();
            renderViewerPage();
        });
    }
}

function deletePredefinedCode(index) {
    if (confirm(`Are you sure you want to permanently delete "${predefinedCodes[index].name}"?`)) {
        deletedPredefinedCodes.push(index);
        localStorage.setItem("deletedPredefinedCodes", JSON.stringify(deletedPredefinedCodes));
        alert("Code deleted permanently.");
        loadCodes();
    }
}

function deleteUploadedCode(index) {
    if (confirm(`Are you sure you want to permanently delete "${codes[index].name}"?`)) {
        codes.splice(index, 1);
        localStorage.setItem("codes", JSON.stringify(codes));
        alert("Code deleted permanently.");
        loadCodes();
    }
}

// AI Explanation Functions

function saveApiKey() {
    alert("AI key entry is disabled. Configure OPENAI_API_KEY in your server environment (Netlify function).");
}

function saveRecoveryEmailConfig() {
    alert("Recovery email settings are managed in backend configuration.");
}

function closeAiModal() {
    let modal = document.getElementById("aiModal");
    if (modal) {
        modal.classList.remove("active");
        modal.classList.add("hidden");
        document.body.style.overflow = 'auto';
    }
    // Reset modal content
    document.getElementById("explanationContent").innerHTML = "";
    document.getElementById("explanationContent").classList.add("hidden");
}

function closeExplanationModal() {
    let modal = document.getElementById("explanationModal");
    if (modal) {
        modal.classList.remove("active");
        modal.classList.add("hidden");
        document.body.style.overflow = 'auto';
    }
    // Reset modal content
    document.getElementById("explanationContent").innerHTML = "";
    document.getElementById("explanationContent").classList.add("hidden");
}

// Close explanation modal when clicking outside
window.addEventListener('click', function(event) {
    let explanationModal = document.getElementById("explanationModal");
    if (explanationModal && event.target == explanationModal) {
        closeExplanationModal();
    }
});

// Close modal when clicking outside
window.onclick = function(event) {
    let modal = document.getElementById("aiModal");
    if (event.target == modal) {
        closeAiModal();
    }
}

