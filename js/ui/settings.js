// ============================================
// PLAGIGUARD SETTINGS PAGE
// ============================================


// ============================================
// LOAD SETTINGS INTO PAGE
// ============================================

function loadSettingsPage() {

    const settings =
        getPlagiGuardSettings();


    document.getElementById(
        "ngramSize"
    ).value =
        settings.ngramSize;


    document.getElementById(
        "similarityThreshold"
    ).value =
        settings.similarityThreshold;


    document.getElementById(
        "thresholdValue"
    ).textContent =
        settings.similarityThreshold;


    document.getElementById(
        "minimumMatchingNGrams"
    ).value =
        settings.minimumMatchingNGrams;


    document.getElementById(
        "showMatchingNGrams"
    ).checked =
        settings.showMatchingNGrams;


    document.getElementById(
        "detailedReports"
    ).checked =
        settings.detailedReports;

}



// ============================================
// GET VALUES FROM PAGE
// ============================================

function getSettingsFromPage() {

    return {

        ngramSize:
            Number(
                document.getElementById(
                    "ngramSize"
                ).value
            ),


        similarityThreshold:
            Number(
                document.getElementById(
                    "similarityThreshold"
                ).value
            ),


        minimumMatchingNGrams:
            Number(
                document.getElementById(
                    "minimumMatchingNGrams"
                ).value
            ),


        showMatchingNGrams:
            document.getElementById(
                "showMatchingNGrams"
            ).checked,


        detailedReports:
            document.getElementById(
                "detailedReports"
            ).checked

    };

}



// ============================================
// MESSAGE
// ============================================

function showSettingsMessage(message) {

    const element =
        document.getElementById(
            "settingsMessage"
        );


    element.textContent =
        message;


    setTimeout(
        () => {

            element.textContent =
                "";

        },
        2500
    );

}



// ============================================
// SAVE
// ============================================

function handleSaveSettings() {

    const settings =
        getSettingsFromPage();


    savePlagiGuardSettings(
        settings
    );


    showSettingsMessage(
        "✓ Settings saved successfully"
    );

}



// ============================================
// RESET
// ============================================

function handleResetSettings() {

    const confirmed =
        confirm(
            "Reset all settings to default values?"
        );


    if (!confirmed) {

        return;

    }


    resetPlagiGuardSettings();


    loadSettingsPage();


    showSettingsMessage(
        "Settings reset to default"
    );

}



// ============================================
// CLEAR DATA
// ============================================

function handleClearData() {

    const confirmed =
        confirm(
            "Are you sure you want to delete all submissions?"
        );


    if (!confirmed) {

        return;

    }


    clearPlagiGuardSubmissions();


    showSettingsMessage(
        "✓ Submission data cleared"
    );

}



// ============================================
// THRESHOLD SLIDER
// ============================================

function setupThresholdSlider() {

    const slider =
        document.getElementById(
            "similarityThreshold"
        );


    const value =
        document.getElementById(
            "thresholdValue"
        );


    slider.addEventListener(
        "input",
        () => {

            value.textContent =
                slider.value;

        }
    );

}



// ============================================
// EVENTS
// ============================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadSettingsPage();


        setupThresholdSlider();


        document
            .getElementById(
                "saveSettingsBtn"
            )
            .addEventListener(
                "click",
                handleSaveSettings
            );


        document
            .getElementById(
                "resetSettingsBtn"
            )
            .addEventListener(
                "click",
                handleResetSettings
            );


        document
            .getElementById(
                "clearDataBtn"
            )
            .addEventListener(
                "click",
                handleClearData
            );

    }
);