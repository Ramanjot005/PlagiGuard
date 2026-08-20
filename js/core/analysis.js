function generateThreeGrams(text) {

    const settings =
        getPlagiGuardSettings();


    const n =
        settings.ngramSize;


    const words =
        text
            .toLowerCase()
            .replace(
                /[^\w\s]/g,
                ""
            )
            .split(/\s+/)
            .filter(Boolean);


    const grams =
        new Set();


    if (words.length < n) {

        return grams;

    }


    for (
        let i = 0;
        i <= words.length - n;
        i++
    ) {

        const gram =
            words
                .slice(
                    i,
                    i + n
                )
                .join(" ");


        grams.add(gram);

    }


    return grams;
}