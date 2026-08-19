/**
 * Create n-grams from an array of tokens
 */
export function createNGrams(tokens, n = 3) {
    if (!Array.isArray(tokens) || tokens.length < n) {
        return [];
    }

    const ngrams = [];

    for (let i = 0; i <= tokens.length - n; i++) {
        const gram = tokens.slice(i, i + n).join(" ");
        ngrams.push(gram);
    }

    return ngrams;
}

/**
 * Calculate similarity between two sets of n-grams
 */
export function ngramSimilarity(tokens1, tokens2, n = 3) {
    const ngrams1 = createNGrams(tokens1, n);
    const ngrams2 = createNGrams(tokens2, n);

    if (ngrams1.length === 0 || ngrams2.length === 0) {
        return 0;
    }

    const set1 = new Set(ngrams1);
    const set2 = new Set(ngrams2);

    const intersection = new Set(
        [...set1].filter(gram => set2.has(gram))
    );

    const union = new Set([...set1, ...set2]);

    if (union.size === 0) {
        return 0;
    }

    return intersection.size / union.size;
}