/**
 * PlagiGuard - API Client Module
 * Reusable HTTP client for communicating with the Node.js/Express backend.
 */

const API = (() => {
    // Configurable base URL for local development and production.
    // Can be overridden at runtime via window.__API_BASE_URL__ or API.setBaseUrl()
    let baseUrl = (typeof window !== 'undefined' && window.__API_BASE_URL__)
        ? window.__API_BASE_URL__
        : 'http://localhost:5000/api';

    const AUTH_TOKEN_KEY = 'pg_auth_token';

    function setBaseUrl(url) {
        if (typeof url === 'string' && url.trim()) {
            baseUrl = url.trim().replace(/\/+$/, '');
        }
    }

    function getBaseUrl() {
        return baseUrl;
    }

    function getAuthToken() {
        if (typeof sessionStorage === 'undefined') return null;
        return sessionStorage.getItem(AUTH_TOKEN_KEY);
    }

    async function request(endpoint, options = {}) {
        const token = getAuthToken();

        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        if (token && !headers.Authorization) {
            headers.Authorization = `Bearer ${token}`;
        }

        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${baseUrl}${cleanEndpoint}`;

        let response;
        try {
            response = await fetch(url, {
                ...options,
                headers
            });
        } catch (networkError) {
            console.error('API network error:', networkError);
            throw new Error(
                'Cannot connect to the PlagiGuard backend. Make sure the server is running on port 5000.'
            );
        }

        let result;
        try {
            result = await response.json();
        } catch (parseError) {
            throw new Error('The server returned an invalid or non-JSON response.');
        }

        if (!response.ok || result.success === false) {
            const message = result.message || `Request failed with status ${response.status}.`;
            const error = new Error(message);
            error.status = response.status;
            error.data = result;
            throw error;
        }

        return result;
    }

    return {
        setBaseUrl,
        getBaseUrl,
        getAuthToken,
        request,
        get: (endpoint, options = {}) =>
            request(endpoint, { ...options, method: 'GET' }),
        post: (endpoint, body, options = {}) =>
            request(endpoint, {
                ...options,
                method: 'POST',
                body: JSON.stringify(body)
            }),
        put: (endpoint, body, options = {}) =>
            request(endpoint, {
                ...options,
                method: 'PUT',
                body: JSON.stringify(body)
            }),
        patch: (endpoint, body, options = {}) =>
            request(endpoint, {
                ...options,
                method: 'PATCH',
                body: JSON.stringify(body)
            }),
        delete: (endpoint, options = {}) =>
            request(endpoint, { ...options, method: 'DELETE' })
    };
})();

// Attach to window for script-tag access in Vanilla JS
if (typeof window !== 'undefined') {
    window.API = API;
}
