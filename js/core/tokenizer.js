export function tokenize(text) {
    if (!text || typeof text !== "string") {
        return [];
    }

    // Convert to lowercase
    text = text.toLowerCase();

    // Remove punctuation
    text = text.replace(/[^\w\s]/g, "");

    // Remove extra spaces
    text = text.trim();

    // If nothing remains
    if (text === "") {
        return [];
    }

    // Convert string into words
    return text.split(/\s+/);
}