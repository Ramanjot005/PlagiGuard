import { tokenize } from './tokenizer.js';
import { generateNgrams } from './ngram.js';
import { jaccardSimilarity } from './jaccard.js';

export function getComparisons(submissions, n = 3) {
    if (!submissions || submissions.length < 2) {
        return []; // need at least 2 submissions to compare
    }

    // pre-process each submission once (don't tokenize inside the loop repeatedly)
    const processed = submissions.map(sub => ({
        ...sub,
        ngrams: generateNgrams(tokenize(sub.text), n)
    }));

    const results = [];

    for (let i = 0; i < processed.length; i++) {
        for (let j = i + 1; j < processed.length; j++) {
            const similarity = jaccardSimilarity(
                processed[i].ngrams,
                processed[j].ngrams
            );

            results.push({
                one: submissions[i],
                two: submissions[j],
                similarity: similarity
            });
        }
    }

    results.sort((a, b) => b.similarity - a.similarity);

    return results;
}