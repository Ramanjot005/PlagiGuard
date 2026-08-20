// ============================================
// PLAGIGUARD SETTINGS STORAGE
// ============================================

const PLAGIGUARD_SETTINGS_KEY =
    "plagiguard_settings";


// ============================================
// DEFAULT SETTINGS
// ============================================

const DEFAULT_PLAGIGUARD_SETTINGS = {

    ngramSize: 3,

    similarityThreshold: 30,

    minimumMatchingNGrams: 3,

    showMatchingNGrams: true,

    detailedReports: true

};


// ============================================
// GET SETTINGS
// ============================================

function getPlagiGuardSettings() {

    const saved =
        localStorage.getItem(
            PLAGIGUARD_SETTINGS_KEY
        );


    if (!saved) {

        return {
            ...DEFAULT_PLAGIGUARD_SETTINGS
        };

    }


    try {

        const parsed =
            JSON.parse(saved);


        return {

            ...DEFAULT_PLAGIGUARD_SETTINGS,

            ...parsed

        };

    }

    catch (error) {

        console.error(
            "Unable to read PlagiGuard settings:",
            error
        );


        return {
            ...DEFAULT_PLAGIGUARD_SETTINGS
        };

    }

}



// ============================================
// SAVE SETTINGS
// ============================================

function savePlagiGuardSettings(settings) {

    localStorage.setItem(

        PLAGIGUARD_SETTINGS_KEY,

        JSON.stringify(settings)

    );

}



// ============================================
// RESET SETTINGS
// ============================================

function resetPlagiGuardSettings() {

    localStorage.setItem(

        PLAGIGUARD_SETTINGS_KEY,

        JSON.stringify(
            DEFAULT_PLAGIGUARD_SETTINGS
        )

    );

}



// ============================================
// CLEAR SUBMISSIONS
// ============================================

function clearPlagiGuardSubmissions() {

    localStorage.removeItem(
        "plagiguard_submissions"
    );

}